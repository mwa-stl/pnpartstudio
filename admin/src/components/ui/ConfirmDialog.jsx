import React, { useEffect, useRef } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";

/**
 * The console's own confirmation dialog, replacing `window.confirm`.
 *
 * The browser dialog is a bare string in a system chrome box — it cannot show
 * the thing being deleted, and on some setups it can be suppressed entirely,
 * which would silently turn "delete?" into "deleted". This renders a real
 * dialog that shows a preview of the record: its name, an image where there
 * is one, and any extra detail lines the caller passes.
 */
export const ConfirmDialog = ({
  open,
  title = "Delete this item?",
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",            // "danger" | "neutral"
  item,                       // { label, image, meta: [[k, v], …] }
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape" && !busy) { e.preventDefault(); onCancel?.(); }
      // Keep focus inside the dialog while it is open.
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const danger = tone === "danger";

  return (
    <div
      className="modal-backdrop !z-[200]"
      onClick={() => !busy && onCancel?.()}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? "confirm-desc" : undefined}
        className="modal-card max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head flex items-start gap-3 px-6 py-4">
          <span className={`mt-0.5 shrink-0 ${danger ? "text-vermillion" : "text-graphite"}`}>
            <AlertTriangle size={18} strokeWidth={1.9} />
          </span>
          <h2 id="confirm-title" className="page-title !text-[1.15rem] flex-1">{title}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm !px-2"
            onClick={() => onCancel?.()}
            aria-label="Close"
            disabled={busy}
          >
            <X size={15} />
          </button>
        </div>

        <div className="modal-body px-6 py-5 flex flex-col gap-4">
          {/* What is about to go — named and pictured, so there is no doubt. */}
          {item && (
            <div className="flex items-start gap-3.5 border border-rule bg-paper-dim p-3.5">
              {item.image ? (
                <img src={item.image} alt="" className="w-14 h-14 object-cover border border-rule shrink-0" />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="text-ink font-semibold leading-snug break-words">{item.label}</div>
                {Array.isArray(item.meta) && item.meta.length > 0 && (
                  <dl className="mt-2 flex flex-col gap-1">
                    {item.meta.filter(Boolean).map(([k, v]) => (
                      // `min-w-0` on both the row and the value is what lets a
                      // long unbroken string (a pasted review, a URL) wrap.
                      // A flex item refuses to shrink below its content width
                      // without it, so the text ran straight out of the panel.
                      <div key={k} className="flex gap-2 text-[0.76rem] min-w-0">
                        <dt className="font-mono uppercase tracking-[0.1em] text-slate shrink-0">{k}</dt>
                        <dd className="text-graphite break-words min-w-0 flex-1 line-clamp-3">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
          )}

          <p id="confirm-desc" className="text-[0.88rem] text-graphite leading-relaxed">
            {description || "This cannot be undone."}
          </p>
        </div>

        <div className="modal-foot px-6 py-4 flex gap-2 justify-end">
          <button type="button" className="btn btn-ghost" onClick={() => onCancel?.()} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={danger ? "btn btn-danger" : "btn btn-primary"}
            onClick={() => onConfirm?.()}
            disabled={busy}
          >
            {busy ? <><Loader2 size={14} className="animate-spin" /> Working…</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
