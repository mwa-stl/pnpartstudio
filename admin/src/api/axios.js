import axios from "axios";

/**
 * Global axios wiring for the admin console.
 *
 * The session is an httpOnly cookie the server sets at sign-in. Scripts cannot
 * read it, so nothing here (or anywhere in the console) stores or attaches a
 * token — the browser sends the cookie itself on every request, which is what
 * `withCredentials` turns on.
 */
axios.defaults.withCredentials = true;

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
      window.location.assign("/admin/login");
    }
    return Promise.reject(error);
  }
);

export default axios;
