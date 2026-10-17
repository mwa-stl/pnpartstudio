import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, ArrowUpRight } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const LOGIN_URL = `${API_BASE}/api/auth/login`;
const ME_URL = `${API_BASE}/api/auth/me`;
const EMAIL_KEY = "adminRememberEmail";

axios.defaults.withCredentials = true;

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/admin";

  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!email || !password) {
      setFormError("Please enter both email and password.");
      return;
    }

    try {
      setSubmitting(true);

      if (remember) localStorage.setItem(EMAIL_KEY, email);
      else localStorage.removeItem(EMAIL_KEY);

      await axios.post(
        LOGIN_URL,
        { email: String(email).trim(), password },
        { withCredentials: true }
      );

      // The server answered, but is the session cookie actually usable? A
      // browser that blocks third-party cookies accepts the sign-in and then
      // silently drops the cookie, which would otherwise look like a loop back
      // to this page with no explanation.
      try {
        await axios.get(ME_URL, { withCredentials: true });
      } catch {
        setFormError("Signed in, but your browser did not keep the session cookie. Allow cookies for this site (and its API), or ask your developer to serve the API on the same site as the console.");
        return;
      }

      toast.success("Signed in");
      setTimeout(() => navigate(redirectTo, { replace: true }), 500);
    } catch (err) {
      const status = err?.response?.status;
      // Deliberately identical message for unknown-email and wrong-password
      // so the form can't be used to enumerate valid admin accounts.
      const msg = status === 401
        ? "Invalid email or password."
        : "Unable to sign in right now. Please try again.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-paper">
      <ToastContainer position="bottom-right" autoClose={2400} newestOnTop hideProgressBar theme="light" />

      {/* Ink panel fixed half, always full bleed */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] shrink-0 h-full flex-col justify-between bg-ink text-paper p-10 xl:p-14 overflow-hidden">
        <div>
          <div
            className="text-paper leading-none mb-2"
            style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 500, fontSize: "1.5rem", letterSpacing: "-0.015em" }}
          >
            PnP Artstudio
          </div>
          <div className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-paper/40">
            Admin console
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-vermillion mb-6">
            <span>Restricted</span>
            <span className="h-px w-12 bg-paper/25" />
          </div>
          <p
            className="text-paper leading-[1.08] max-w-md"
            style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "clamp(2.2rem,3.4vw,3.4rem)", letterSpacing: "-0.02em" }}
          >
            Manage the studio.
          </p>
          <p className="text-paper/45 text-[0.92rem] leading-relaxed max-w-sm mt-6">
            Products, orders, classes, and everything the storefront shows.
          </p>
        </div>

        <p className="font-mono text-[0.53rem] uppercase tracking-[0.14em] text-paper/30 leading-relaxed max-w-xs">
          Authorised personnel only. All activity is logged.
        </p>
      </div>

      {/* Form panel independently scrollable so it never stretches the page */}
      <div className="flex-1 h-full overflow-y-auto flex items-center justify-center px-5 sm:px-10 py-10">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-8">
            <div
              className="text-ink leading-none mb-1.5"
              style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 500, fontSize: "1.4rem" }}
            >
              PnP Artstudio
            </div>
            <div className="font-mono text-[0.54rem] uppercase tracking-[0.2em] text-slate">Admin console</div>
          </div>

          <div className="flex items-center gap-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-vermillion mb-5">
            <span>Sign in</span>
            <span className="h-px flex-1 max-w-16 bg-rule" />
          </div>

          <h1 className="page-title mb-2.5">Welcome back.</h1>
          <p className="text-graphite text-[0.9rem] mb-8">
            Enter your admin credentials to continue.
          </p>

          {formError && (
            <div role="alert" className="border-l-2 border-vermillion pl-4 py-2.5 mb-8">
              <div className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-vermillion mb-1">Error</div>
              <p className="text-[0.88rem] text-graphite">{formError}</p>
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
            <div>
              <label htmlFor="admin-email" className="label">Email</label>
              <input
                id="admin-email"
                type="email"
                className="field"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="label">Password</label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPw ? "text" : "password"}
                  className="field !pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate hover:text-vermillion transition-colors"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-vermillion)] cursor-pointer"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label htmlFor="remember" className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-graphite cursor-pointer">
                Remember my email
              </label>
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary w-full !py-3.5">
              {submitting ? "Signing in…" : <>Sign in <ArrowUpRight size={13} /></>}
            </button>
          </form>

          <div className="border-t border-rule mt-8 pt-5">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-slate">
              New admin?{" "}
              <Link to="/admin/register" className="text-vermillion hover:text-ink transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
