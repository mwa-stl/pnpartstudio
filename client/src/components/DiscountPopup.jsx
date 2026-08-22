import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { X, Check, Copy, ArrowUpRight } from "lucide-react";
import usePromoPopup from "../hooks/usePromoPopup";
import fallbackImg from "../assets/ma_durga.png";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const DISMISS_KEY = "pnp_discount_dismissed";

/**
 * Every word and the artwork come from the admin console (Site content →
 * Welcome popup), including whether it appears at all and how long it waits.
 */
const DiscountPopup = () => {
  const config = usePromoPopup();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(""); // "success"|"already"|"error"|backend error string
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState("");
  const emailRef = useRef(null);

  useEffect(() => {
    if (!config?.enabled) return undefined;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return undefined;
    } catch { /* storage unavailable fall through and show */ }
    const t = setTimeout(() => setOpen(true), Math.max(0, config.delaySeconds) * 1000);
    return () => clearTimeout(t);
  }, [config]);

  const closeForNow = () => {
    setOpen(false);
    setEmail("");
    setStatus("");
    setCode("");
    setLoading(false);
    setInputError("");
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!open) return undefined;
    emailRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") closeForNow(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const onEmailChange = (e) => {
    setEmail(e.target.value);
    setInputError("");
    setStatus("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setInputError("");
    setStatus("");
    setCode("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInputError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API_BASE}/api/newsletters/claim-coupon`,
        { email },
        { withCredentials: true }
      );
      setStatus("success");
      setCode(data?.code || "");
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setStatus("already");
      } else if (err.response?.data?.message) {
        if (String(err.response.data.message).toLowerCase().includes("email")) {
          setInputError(err.response.data.message);
        } else {
          setStatus(err.response.data.message);
        }
      } else {
        setStatus("error");
      }
    }
    setLoading(false);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked the code is visible anyway */ }
  };

  if (!open || !config) return null;

  const image = config.image || fallbackImg;

  return (
    <div
      className="fixed inset-0 bg-ink/60 z-[10000] flex items-end sm:items-center justify-center p-4"
      onClick={closeForNow}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="discountTitle"
        className="relative w-full max-w-3xl bg-paper border border-ink grid grid-cols-1 sm:grid-cols-[0.8fr_1fr] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Plate */}
        <div className="relative hidden sm:block border-r border-ink bg-paper-deep">
          <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
          {config.imageBadge && (
            <span className="absolute bottom-0 left-0 bg-ink text-paper px-3 py-2 font-mono text-[0.55rem] uppercase tracking-[0.16em]">
              {config.imageBadge}
            </span>
          )}
        </div>
        <div className="sm:hidden h-24 w-full bg-cover bg-center border-b border-ink" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />

        {/* Panel */}
        <div className="relative flex flex-col justify-center px-6 sm:px-9 py-9">
          <button
            type="button"
            aria-label="Close"
            onClick={closeForNow}
            className="absolute top-3 right-3 w-8 h-8 border border-rule-strong text-ink hover:bg-ink hover:text-paper hover:border-ink flex items-center justify-center transition-colors"
          >
            <X size={14} strokeWidth={1.8} />
          </button>

          {config.sectionLabel && <div className="section-index mb-6">{config.sectionLabel}</div>}

          <h2 id="discountTitle" className="t-section mb-6 whitespace-pre-line">
            {config.heading}
          </h2>

          {status === "success" ? (
            <div>
              <p className="text-graphite text-[0.9rem] mb-5 leading-relaxed">{config.successBody}</p>
              <div className="flex items-center gap-3 border border-ink px-4 py-3.5 mb-6">
                <code className="font-mono font-medium text-vermillion tracking-[0.2em] text-[1.05rem] grow">{code}</code>
                {code && (
                  <button
                    type="button"
                    onClick={copyCode}
                    className="text-slate hover:text-vermillion transition-colors p-1"
                    aria-label="Copy coupon code"
                  >
                    {copied ? <Check size={16} /> : <Copy size={15} />}
                  </button>
                )}
              </div>
              <button onClick={closeForNow} className="btn-k w-full">
                {config.successButtonLabel} <ArrowUpRight size={13} />
              </button>
            </div>
          ) : status === "already" ? (
            <div>
              <p className="text-graphite text-[0.9rem] mb-7 leading-relaxed">{config.alreadyBody}</p>
              <button onClick={closeForNow} className="btn-k w-full">Close</button>
            </div>
          ) : status ? (
            <div>
              <p className="text-vermillion font-mono text-[0.72rem] uppercase tracking-[0.1em] mb-7">
                {status === "error" ? "Something went wrong. Please try again." : status}
              </p>
              <button onClick={() => setStatus("")} className="btn-k btn-k-ghost w-full">Try again</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="w-full flex flex-col gap-5" noValidate>
              {config.body && (
                <p className="text-graphite text-[0.9rem] leading-relaxed">{config.body}</p>
              )}
              <div>
                <label htmlFor="discount-email" className="label-k">{config.emailLabel}</label>
                <input
                  id="discount-email"
                  ref={emailRef}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={onEmailChange}
                  placeholder={config.emailPlaceholder}
                  aria-invalid={!!inputError}
                  aria-describedby={inputError ? "discount-email-error" : undefined}
                  className="field-k"
                  disabled={loading}
                />
                {inputError && (
                  <div id="discount-email-error" className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-vermillion mt-2">
                    {inputError}
                  </div>
                )}
              </div>
              <button type="submit" className="btn-k w-full" disabled={loading}>
                {loading ? "Processing…" : <>{config.submitLabel} <ArrowUpRight size={13} /></>}
              </button>
              <button
                type="button"
                onClick={closeForNow}
                className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate hover:text-ink transition-colors"
              >
                {config.dismissLabel}
              </button>
              {config.footnote && (
                <small className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-slate leading-relaxed">
                  {config.footnote}
                </small>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscountPopup;
