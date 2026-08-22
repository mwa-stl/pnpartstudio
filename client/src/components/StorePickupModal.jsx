import React, { useEffect, useRef, useState } from "react";
import { X, ArrowUpRight } from "lucide-react";

const StorePickupModal = ({ show, onClose, onSubmit }) => {
  const [form, setForm] = useState({ fullName: "", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (!show) return undefined;
    firstFieldRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape" && !submitting) onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [show, onClose, submitting]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors(err => (err[name] ? { ...err, [name]: "" } : err));
  };

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email address";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm({ fullName: "", phone: "", email: "" });
      setErrors({});
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  const fields = [
    { name: "fullName", label: "Full name", type: "text", autoComplete: "name", placeholder: "Priyanka Vasista" },
    { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", placeholder: "+1 555 000 0000" },
    { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
  ];

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-ink/60 p-4 overflow-y-auto"
      onClick={() => !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-title"
        className="bg-paper border border-ink w-full max-w-md my-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-ink">
          <div>
            <div className="section-index mb-2">Studio pickup</div>
            <h2 id="pickup-title" className="t-section !text-[1.35rem]">Collection details</h2>
          </div>
          <button
            className="w-8 h-8 shrink-0 border border-rule-strong text-ink hover:bg-ink hover:text-paper hover:border-ink flex items-center justify-center transition-colors disabled:opacity-40"
            onClick={onClose}
            aria-label="Close"
            disabled={submitting}
            type="button"
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-6" noValidate>
          <p className="text-[0.86rem] text-graphite leading-relaxed">
            We&apos;ll use these details to hold your order and let you know when it&apos;s ready.
          </p>

          {fields.map(({ name, label, type, autoComplete, placeholder }, i) => (
            <div key={name}>
              <label htmlFor={`pickup-${name}`} className="label-k">
                {label} <span className="text-vermillion">*</span>
              </label>
              <input
                id={`pickup-${name}`}
                ref={i === 0 ? firstFieldRef : undefined}
                name={name}
                type={type}
                autoComplete={autoComplete}
                className="field-k"
                placeholder={placeholder}
                value={form[name]}
                onChange={handleChange}
                aria-invalid={!!errors[name]}
                aria-describedby={errors[name] ? `pickup-${name}-error` : undefined}
                disabled={submitting}
                required
              />
              {errors[name] && (
                <div id={`pickup-${name}-error`} className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-vermillion mt-2">
                  {errors[name]}
                </div>
              )}
            </div>
          ))}

          <button type="submit" disabled={submitting} className="btn-k w-full mt-1">
            {submitting ? "Placing order…" : <>Place pickup order <ArrowUpRight size={13} /></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StorePickupModal;
