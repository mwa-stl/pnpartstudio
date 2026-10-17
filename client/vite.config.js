import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// A Content-Security-Policy for the built storefront. It is a <meta> tag, so it
// works on any static host without header config; it is only injected into
// production builds because the dev server needs inline/eval scripts for HMR.
// Scripts are limited to this origin plus PayPal's SDK, which is what stops an
// injected <script> (XSS) from running or phoning home.
const csp = (apiOrigin) => [
  "default-src 'self'",
  "script-src 'self' https://*.paypal.com https://*.paypalobjects.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Product, gallery and hero media come from the storage bucket / CDN.
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  `connect-src 'self' ${apiOrigin} https://*.paypal.com`,
  "frame-src https://*.paypal.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.paypal.com",
].join('; ')

const cspPlugin = (apiOrigin) => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp(apiOrigin) }, injectTo: 'head-prepend' },
    { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head-prepend' },
  ],
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  let apiOrigin = 'http://localhost:4000'
  try { if (env.VITE_API_URL) apiOrigin = new URL(env.VITE_API_URL).origin } catch { /* keep default */ }
  return { plugins: [react(), tailwindcss(), cspPlugin(apiOrigin)] }
})
