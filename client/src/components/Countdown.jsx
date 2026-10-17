import React, { useEffect, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

/** "3d 04h 12m" while days remain, "04:12:33" inside the last day. */
const format = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
};

/**
 * Time left until `to` (an ISO date). Renders nothing without a date or once
 * it has passed, and calls `onEnd` once so the page can re-check what is live.
 */
const Countdown = ({ to, prefix = "Ends in", className = "", onEnd }) => {
  const target = to ? new Date(to).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());
  const remaining = target - now;

  useEffect(() => {
    if (Number.isNaN(target)) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [target]);

  const over = Number.isNaN(target) ? false : remaining <= 0;
  useEffect(() => { if (over) onEnd?.(); }, [over, onEnd]);

  if (Number.isNaN(target) || over) return null;
  return (
    <span className={`tabular-nums ${className}`} aria-label={`${prefix} ${format(remaining)}`}>
      {prefix} <span aria-hidden="true">{format(remaining)}</span>
    </span>
  );
};

export default Countdown;
