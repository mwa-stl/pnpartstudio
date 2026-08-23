import React from "react";
import { Loader2, Save } from "lucide-react";

/**
 * A save action for long single-form settings pages (Artist profile, Contact
 * details, Page mastheads, Welcome popup) pinned to the viewport instead of
 * flowing with the page, so it stays reachable without hunting for it after
 * scrolling through several sections.
 *
 * Renders `type="submit"` — must sit inside the `<form>` it saves, same as
 * the inline button it replaces, so Enter-to-submit and form validation
 * keep working unchanged.
 */
const FloatingSaveBar = ({ saving, disabled, label = "Save", savingLabel = "Saving…", helperText }) => (
  <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-30 flex items-center gap-3 bg-paper border border-ink shadow-[0_16px_40px_-16px_rgba(11,11,11,0.4)] px-4 py-3 max-w-[calc(100vw-2.5rem)]">
    {helperText && (
      <span className="hidden sm:block text-[0.72rem] text-slate max-w-[200px] leading-snug">{helperText}</span>
    )}
    <button type="submit" className="btn btn-primary shrink-0" disabled={disabled}>
      {saving ? <><Loader2 size={15} className="animate-spin" /> {savingLabel}</> : <><Save size={15} /> {label}</>}
    </button>
  </div>
);

export default FloatingSaveBar;
