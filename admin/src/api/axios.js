import axios from "axios";

/**
 * Global axios wiring for the admin console.
 *
 * The API accepts either the `token` cookie or an `Authorization: Bearer`
 * header. Cookies alone are fragile across origins (SameSite=None requires
 * HTTPS), so we always attach the session token as well whichever arrives
 * first satisfies the server.
 */
axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("accessToken");
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// A 401 means the session is gone clear it and send the user back to login
// rather than leaving the console in a half-broken state.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const onLoginPage = window.location.pathname.startsWith("/admin/login");
    if (status === 401 && !onLoginPage) {
      sessionStorage.removeItem("accessToken");
      window.location.assign("/admin/login");
    }
    return Promise.reject(error);
  }
);

export default axios;
