import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, ArrowUpRight } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const REGISTER_URL = `${API_BASE}/api/auth/admin/register`;
const MIN_PASSWORD = 12;

axios.defaults.withCredentials = true;

// Rough strength signal not a substitute for the server's own policy,
// just immediate feedback while typing.
const scorePassword = (pw) => {
  let score = 0;
  if (pw.length >= MIN_PASSWORD) score++;
  if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
};
// Red while the password is rejectable, amber at the threshold, green once
// it comfortably passes the meter should agree with the submit rule, which
// blocks anything below "Good".
const STRENGTH = [
  { label: "Too weak", color: "var(--color-vermillion)" },
  { label: "Weak", color: "var(--color-vermillion)" },
  { label: "Fair", color: "var(--color-amber)" },
  { label: "Good", color: "var(--color-forest)" },
  { label: "Strong", color: "var(--color-forest)" },
];

const AdminRegister = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPass] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const strength = scorePassword(password);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!name.trim()) { setFormError("Please enter a full name."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setFormError("Please enter a valid email address."); return; }
    if (password.length < MIN_PASSWORD) { setFormError(`Password must be at least ${MIN_PASSWORD} characters.`); return; }
    if (strength < 3) { setFormError("Please choose a stronger password mix upper and lower case, digits, and a symbol."); return; }
    if (password !== confirm) { setFormError("Passwords do not match."); return; }

    try {
      setSubmitting(true);
      await axios.post(
        REGISTER_URL,
        { name: name.trim(), email: email.trim(), phone: phone.trim(), password },
        { withCredentials: true }
      );
      setFormSuccess("Admin account created. Redirecting…");
      toast.success("Admin created");
      setTimeout(() => navigate("/admin", { replace: true }), 800);
    } catch (err) {
      const status = err?.response?.status;
      const m = status === 409
        ? "That email is already registered."
        : (err?.response?.data?.message || "Could not create the admin account. Please try again.");
      setFormError(m);
      toast.error(m);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-paper">
      <ToastContainer position="bottom-right" autoClose={2400} newestOnTop hideProgressBar theme="light" />

      <div className="hidden lg:flex lg:w-[40%] xl:w-[36%] shrink-0 h-full flex-col justify-between bg-ink text-paper p-10 xl:p-14 overflow-hidden">
        <div>
          <div
            className="text-paper leading-none mb-2"
            style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 500, fontSize: "1.5rem", letterSpacing: "-0.015em" }}
          >
            PnP Artstudio
          </div>
          <div className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-paper/40">Admin console</div>
        </div>

        <div>
          <div className="flex items-center gap-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-vermillion mb-6">
            <span>New account</span>
            <span className="h-px w-12 bg-paper/25" />
          </div>
          <p
            className="text-paper leading-[1.08] max-w-md"
            style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "clamp(2.2rem,3.2vw,3.2rem)", letterSpacing: "-0.02em" }}
          >
            Create an admin.
          </p>
        </div>

        <p className="font-mono text-[0.53rem] uppercase tracking-[0.14em] text-paper/30 leading-relaxed max-w-xs">
          Admin accounts have full access to orders and customer data. Create them sparingly.
        </p>
      </div>

      <div className="flex-1 h-full overflow-y-auto flex items-center justify-center px-5 sm:px-10 py-10">
        <div className="w-full max-w-[520px]">
          <div className="flex items-center gap-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-vermillion mb-7">
            <span>Register</span>
            <span className="h-px flex-1 max-w-16 bg-rule" />
          </div>

          <h1 className="page-title mb-3">Create admin account</h1>
          <p className="text-graphite text-[0.9rem] mb-10">
            Already have access?{" "}
            <Link to="/admin/login" className="text-vermillion hover:text-ink transition-colors">Sign in</Link>
          </p>

          {formError && (
            <div role="alert" className="border-l-2 border-vermillion pl-4 py-2.5 mb-8">
              <div className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-vermillion mb-1">Error</div>
              <p className="text-[0.88rem] text-graphite">{formError}</p>
            </div>
          )}
          {formSuccess && (
            <div role="status" className="border-l-2 border-forest pl-4 py-2.5 mb-8">
              <div className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-forest mb-1">Created</div>
              <p className="text-[0.88rem] text-graphite">{formSuccess}</p>
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="reg-name" className="label">Full name</label>
                <input id="reg-name" className="field" placeholder="Admin User" autoComplete="name"
                  value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="reg-email" className="label">Email</label>
                <input id="reg-email" type="email" className="field" placeholder="admin@example.com" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div>
              <label htmlFor="reg-phone" className="label">
                Phone <span className="normal-case tracking-normal text-slate">(optional)</span>
              </label>
              <input id="reg-phone" type="tel" className="field" placeholder="+1 555 000 0000" autoComplete="tel"
                value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div>
              <label htmlFor="reg-password" className="label">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPw ? "text" : "password"}
                  className="field !pr-11"
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPass(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate hover:text-vermillion transition-colors"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {password && (
                <div className="mt-3">
                  <div className="flex gap-1 mb-2">
                    {[0, 1, 2, 3].map(i => (
                      <span
                        key={i}
                        className="h-[3px] flex-1 transition-colors duration-300"
                        style={{ background: i < strength ? STRENGTH[strength].color : "var(--color-rule)" }}
                      />
                    ))}
                  </div>
                  <p
                    className="font-mono text-[0.58rem] uppercase tracking-[0.14em]"
                    style={{ color: STRENGTH[strength].color }}
                    aria-live="polite"
                  >
                    {STRENGTH[strength].label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="reg-confirm" className="label">Confirm password</label>
              <div className="relative">
                <input
                  id="reg-confirm"
                  type={showPw2 ? "text" : "password"}
                  className="field !pr-11"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate hover:text-vermillion transition-colors"
                  onClick={() => setShowPw2(v => !v)}
                  aria-label={showPw2 ? "Hide password" : "Show password"}
                >
                  {showPw2 ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirm && confirm !== password && (
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-vermillion mt-2">
                  Passwords do not match
                </p>
              )}
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary w-full !py-3.5">
              {submitting ? "Creating…" : <>Create admin account <ArrowUpRight size={13} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
