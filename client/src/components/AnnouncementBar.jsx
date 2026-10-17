import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";
import useAnnouncements from "../hooks/useAnnouncements";
import Countdown from "./Countdown";
import { readableOn } from "../utils/color";

const BAR_HEIGHT = 38;
const STORAGE_KEY = "pnp-dismissed-announcements";
const ROTATE_MS = 6000;

const readDismissed = () => {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
};

/**
 * The strip above the menu that announces a live sale. It lives inside the
 * fixed header, so the page below is pushed down with a CSS variable
 * (--bar-h) that this component keeps in step with whether it is showing.
 * With several announcements live it rotates through them; a visitor can
 * dismiss it for the rest of the session.
 */
const AnnouncementBar = () => {
  const { items, refresh } = useAnnouncements();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [index, setIndex] = useState(0);

  const bars = useMemo(
    () => items.filter((a) => a.showBar && (a.message || a.title) && !dismissed.includes(a._id)),
    [items, dismissed]
  );

  useEffect(() => {
    if (bars.length < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % bars.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [bars.length]);

  const current = bars.length ? bars[index % bars.length] : null;

  useEffect(() => {
    document.documentElement.style.setProperty("--bar-h", current ? `${BAR_HEIGHT}px` : "0px");
    return () => document.documentElement.style.setProperty("--bar-h", "0px");
  }, [current]);

  if (!current) return null;

  const dismiss = () => {
    const next = [...dismissed, ...bars.map((b) => b._id)];
    setDismissed(next);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };

  const fg = readableOn(current.accent);

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="relative flex items-center justify-center px-10"
      style={{ height: BAR_HEIGHT, background: current.accent, color: fg }}
    >
      <Link
        to={`/sale/${current.slug}`}
        key={current._id}
        className="announce-bar-text flex items-center gap-x-3 gap-y-0 min-w-0 font-mono text-[0.62rem] sm:text-[0.66rem] uppercase tracking-[0.12em] hover:opacity-90"
      >
        <span className="truncate">{current.message || current.title}</span>
        <Countdown to={current.endsAt} prefix="Ends in" className="hidden md:inline opacity-80 shrink-0" onEnd={refresh} />
        <span className="hidden sm:inline-flex items-center gap-1 underline underline-offset-4 shrink-0">
          {current.ctaLabel || "Shop the sale"} <ArrowRight size={12} />
        </span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 opacity-70 hover:opacity-100 transition-opacity"
        style={{ color: fg }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default AnnouncementBar;
