// admin/vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

// Content-Security-Policy for the built console, injected as a <meta> tag in
// production builds only (the dev server needs inline/eval scripts for HMR).
// script-src 'self' is the point: the console holds an admin session token, so
// an injected <script> must not be able to run. connect-src allows https
// generally because the watermark tool fetches images from the storage bucket
// or CDN, whose origin is configured server-side.
const csp = (apiOrigin) => [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  `connect-src 'self' ${apiOrigin} https:`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const cspPlugin = (apiOrigin) => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp(apiOrigin) }, injectTo: 'head-prepend' },
    { tag: 'meta', attrs: { name: 'referrer', content: 'same-origin' }, injectTo: 'head-prepend' },
  ],
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  let apiOrigin = 'http://localhost:4000'
  try { if (env.VITE_API_URL) apiOrigin = new URL(env.VITE_API_URL).origin } catch { /* keep default */ }
  return {
    plugins: [react(), tailwindcss(), cspPlugin(apiOrigin)],
    server: {
      port: 5175,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:4000',
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
});
