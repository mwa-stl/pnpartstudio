import { uploadImage } from '../api/media.js';

export const PALETTE = [
  '#ffffff','#000000','#ff3b30','#ff9500','#ffcc00','#34c759',
  '#00c7be','#007aff','#5856d6','#af52de','#ff2d55','#a2845e',
  '#8e8e93','#636366','#48484a','#1c1c1e',
];

export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

export function applyWatermark(file, opts = {}) {
  const { pos = { x: 50, y: 50 }, opacity = 20, angle = 0, fontSize: wmFontSize = 36, color = '#ffffff' } = opts;
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(10, Math.floor((wmFontSize / 520) * img.naturalWidth));
      const x = (pos.x / 100) * canvas.width;
      const y = (pos.y / 100) * canvas.height;
      const { r, g, b } = hexToRgb(color);
      const alpha = opacity / 100;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = `rgba(0,0,0,${Math.min(1, alpha * 0.6)})`;
      ctx.lineWidth = fontSize * 0.08;
      ctx.strokeText('© pnpartstudio', 0, 0);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fillText('© pnpartstudio', 0, 0);
      ctx.restore();

      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
        'image/jpeg',
        0.92
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

/**
 * Sends a watermarked canvas export to the bucket via our API, which converts
 * it to WebP on the way.
 */
export async function uploadWatermarked(file, folder = 'products') {
  const result = await uploadImage(file, { folder });
  return { url: String(result.url), path: result.path };
}

export async function urlToFile(url, filename = 'image.jpg') {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}
