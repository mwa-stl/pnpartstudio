import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { buildObjectPath, uploadBuffer } from './storage.js';

/* Bundled binaries — no system ffmpeg required on the host. Both are needed:
   ffmpeg-static ships only the encoder, so without ffprobe every clip would
   silently come back with no duration and no dimensions. */
if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);
if (ffprobeStatic?.path) ffmpeg.setFfprobePath(ffprobeStatic.path);

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Longest edge an uploaded image is allowed to keep, in pixels. */
const MAX_IMAGE_EDGE = num(process.env.MEDIA_IMAGE_MAX_EDGE, 2400);
const WEBP_QUALITY = num(process.env.MEDIA_WEBP_QUALITY, 82);
/**
 * Ceiling for a stored still image. A 5 MB phone photo should end up as a few
 * hundred KB, not a couple of MB: if the first encode is over this, quality is
 * stepped down to MIN_WEBP_QUALITY and then the dimensions are shrunk until it
 * fits. Set MEDIA_IMAGE_TARGET_KB=0 to disable and keep the first encode.
 */
const TARGET_BYTES = (Number(process.env.MEDIA_IMAGE_TARGET_KB ?? 300) || 0) * 1024;
const MIN_WEBP_QUALITY = 50;
const MIN_EDGE = 900;

/** Longest edge for video, and the quality knob (lower CRF = better = bigger). */
const MAX_VIDEO_HEIGHT = num(process.env.MEDIA_VIDEO_MAX_HEIGHT, 720);
const VIDEO_CRF = num(process.env.MEDIA_VIDEO_CRF, 28);
const VIDEO_AUDIO_BITRATE = process.env.MEDIA_VIDEO_AUDIO_BITRATE || '128k';

export const IMAGE_MIME = /^image\/(jpeg|png|webp|gif|avif|tiff|bmp)$/i;
export const VIDEO_MIME = /^video\/(mp4|quicktime|webm|x-matroska|x-msvideo|mpeg)$/i;

/**
 * Converts any uploaded image to WebP and uploads it.
 *
 * WebP is roughly 25–35% smaller than an equivalent JPEG and far smaller than
 * PNG for photographic work, which is the whole point of doing this server
 * side rather than storing whatever the browser handed us.
 *
 * Oversized images are scaled down first — a 6000px phone photo costs the
 * visitor bandwidth for detail no layout on the site can show.
 */
export const compressImage = async (buffer) => {
  const encode = (edge, quality, animated) =>
    // `animated: true` reads every frame of an animated GIF/WebP rather than
    // just the first — without it an uploaded GIF silently came out as a
    // single static WebP frame. Harmless for an ordinary single-frame image.
    sharp(buffer, { failOn: 'none', animated })
      // Strips EXIF as a side effect, which also removes any GPS coordinates
      // baked in by a phone camera.
      .rotate()
      .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });

  let edge = MAX_IMAGE_EDGE;
  let quality = WEBP_QUALITY;
  let { data, info } = await encode(edge, quality, true);

  // Fit still images under the size ceiling. Animations are left as encoded:
  // trading their quality for size needs a human eye.
  const isAnimated = (info.pages || 1) > 1;
  if (!isAnimated && TARGET_BYTES > 0) {
    for (let pass = 0; pass < 8 && data.length > TARGET_BYTES; pass += 1) {
      if (quality > MIN_WEBP_QUALITY) quality = Math.max(MIN_WEBP_QUALITY, quality - 8);
      else if (edge * 0.85 >= MIN_EDGE) edge = Math.round(edge * 0.85);
      else break;
      ({ data, info } = await encode(edge, quality, false));
    }
  }

  return { data, info };
};

export const processImage = async (buffer, { folder = 'images', originalName = '' } = {}) => {
  const { data, info } = await compressImage(buffer);

  const uploaded = await uploadBuffer(data, {
    objectPath: buildObjectPath(folder, 'webp', originalName),
    contentType: 'image/webp',
  });

  return {
    ...uploaded,
    type: 'image',
    width: info.width,
    height: info.height,
    originalBytes: buffer.length,
  };
};

/** Reads dimensions/duration without decoding the whole file. */
const probe = (filePath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => (err ? reject(err) : resolve(data)));
  });

const runFfmpeg = (build) =>
  new Promise((resolve, reject) => {
    const command = build(ffmpeg());
    command.on('end', resolve).on('error', reject).run();
  });

/**
 * Compresses a video to a web-friendly MP4 and grabs a poster frame.
 *
 * H.264 + AAC in MP4 plays everywhere, `faststart` moves the index to the
 * front so playback can begin before the file finishes downloading, and the
 * height cap keeps a 4K phone recording from becoming a 200MB download.
 *
 * ffmpeg works on files rather than buffers, so the upload is staged in the
 * OS temp directory and cleaned up in `finally` whatever happens.
 */
export const processVideo = async (buffer, { folder = 'videos', originalName = '' } = {}) => {
  const scratch = path.join(os.tmpdir(), `pnp-${crypto.randomBytes(6).toString('hex')}`);
  const inputPath = `${scratch}-in${path.extname(originalName) || '.mp4'}`;
  const outputPath = `${scratch}-out.mp4`;
  const posterPath = `${scratch}-poster.jpg`;

  try {
    await fs.writeFile(inputPath, buffer);

    await runFfmpeg((cmd) =>
      cmd
        .input(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate(VIDEO_AUDIO_BITRATE)
        .outputOptions([
          `-crf ${VIDEO_CRF}`,
          '-preset veryfast',
          '-pix_fmt yuv420p',
          // Never upscale, and keep both dimensions even — H.264 requires it.
          `-vf scale='trunc(iw*min(1,${MAX_VIDEO_HEIGHT}/ih)/2)*2':'trunc(min(ih,${MAX_VIDEO_HEIGHT})/2)*2'`,
          '-movflags +faststart',
        ])
        .output(outputPath)
    );

    // A poster means the gallery shows a frame instead of a black rectangle
    // before the viewer presses play.
    await runFfmpeg((cmd) =>
      cmd
        .input(inputPath)
        .outputOptions(['-frames:v 1', '-ss 00:00:01'])
        .output(posterPath)
    ).catch(() => {
      // A clip shorter than a second has no frame at 1s; the poster is
      // optional, so carry on without one.
    });

    const [compressed, meta] = await Promise.all([
      fs.readFile(outputPath),
      probe(outputPath).catch(() => null),
    ]);

    const uploaded = await uploadBuffer(compressed, {
      objectPath: buildObjectPath(folder, 'mp4', originalName),
      contentType: 'video/mp4',
    });

    let poster = null;
    try {
      const posterBuffer = await fs.readFile(posterPath);
      poster = await processImage(posterBuffer, { folder: `${folder}/posters`, originalName });
    } catch {
      // No poster frame — the player simply starts dark.
    }

    const stream = meta?.streams?.find((s) => s.codec_type === 'video');
    return {
      ...uploaded,
      type: 'video',
      width: stream?.width || 0,
      height: stream?.height || 0,
      duration: Number(meta?.format?.duration) || 0,
      poster: poster?.url || '',
      posterPath: poster?.path || '',
      originalBytes: buffer.length,
    };
  } finally {
    await Promise.all(
      [inputPath, outputPath, posterPath].map((f) => fs.rm(f, { force: true }).catch(() => {}))
    );
  }
};
