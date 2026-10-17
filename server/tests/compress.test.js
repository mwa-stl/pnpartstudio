import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { compressImage } from '../src/services/media.js';

/** A photo-like synthetic: colour fields plus strong texture, saved as a large JPEG. */
async function noisyJpeg(width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><radialGradient id="a" cx="30%" cy="40%"><stop offset="0" stop-color="#e8c27a"/><stop offset="1" stop-color="#3a2a4a"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#a)"/>
    <circle cx="${width * 0.65}" cy="${height * 0.4}" r="${height * 0.3}" fill="#1d6f8a" opacity=".7"/></svg>`;
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  const noise = await sharp({ create: { width, height, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 70 } } }).png().toBuffer();
  return sharp(base).composite([{ input: noise, blend: 'overlay' }]).jpeg({ quality: 92 }).toBuffer();
}

test('a multi-megabyte photo is stored as a WebP of a few hundred KB at most', async () => {
  const input = await noisyJpeg(4000, 3000);
  assert.ok(input.length > 5 * 1024 * 1024, `input should be a heavy photo, was ${input.length}`);

  const { data, info } = await compressImage(input);
  assert.equal(info.format, 'webp');
  assert.ok(data.length <= 300 * 1024, `expected <= 300 KB, got ${(data.length / 1024).toFixed(0)} KB`);
  assert.ok(Math.max(info.width, info.height) <= 2400);
});

test('a simple graphic keeps its transparency and shrinks', async () => {
  const png = await sharp({ create: { width: 3000, height: 2000, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from('<svg width="3000" height="2000"><circle cx="1500" cy="1000" r="600" fill="#39c"/></svg>') }])
    .png().toBuffer();
  const { data, info } = await compressImage(png);
  assert.equal(info.format, 'webp');
  assert.equal(info.channels, 4);
  assert.ok(data.length < png.length);
});
