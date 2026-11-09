import axios from "axios";

/**
 * Global axios wiring for the admin console.
 *
 * The API issues a Bearer token at sign-in. It is kept in sessionStorage (gone when the
 * tab closes) and attached to every request here. No cookies are involved, so
 * sign-in works the same on every browser, including Safari/iOS, whatever the
 * API's domain is. The production CSP (script-src 'self') is what keeps injected
 * scripts from reading it.
 */
const TOKEN_KEY = "pnp_admin_token";

export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
};
export const setToken = (t) => {
  try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
};

axios.defaults.withCredentials = false;

axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 on an ordinary request means the session has ended — send the user back
// to the sign-in page. The session probe itself (/auth/me) and the sign-in
// forms handle their own 401s, so they are left alone.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || "");
    const onAuthPage = /^\/admin\/(login|register)/.test(window.location.pathname);
    const isAuthCall = /\/api\/auth\/(me|login|logout)/.test(url);
    if (status === 401 && !onAuthPage && !isAuthCall) {
      setToken("");
      window.location.assign("/admin/login");
    }
    return Promise.reject(error);
  }
);

export default axios;
