/** Black or white, whichever reads better on top of the given hex colour. */
export const readableOn = (hex = "#E8340C") => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#0B0B0B" : "#ffffff";
};
