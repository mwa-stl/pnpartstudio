/** Browser origins allowed to call the API (CORS) and to be redirected back to after payment. */
export const corsOrigins = (process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5175']
)
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

/** Returns `url` only if it belongs to an allowed origin; otherwise the first allowed origin's `fallbackPath`. */
export function safeReturnUrl(url, fallbackPath) {
  try {
    const u = new URL(String(url));
    if (corsOrigins.includes(u.origin)) return u.toString();
  } catch { /* fall through */ }
  return `${corsOrigins[0] || ''}${fallbackPath}`;
}
