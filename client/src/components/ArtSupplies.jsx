import React from "react";

/**
 * Decorative line-drawn studio objects brush, palette, paint tube, pencil,
 * colour swatches. Purely ornamental: every instance is aria-hidden and
 * pointer-events-none so nothing here reaches assistive tech or blocks input.
 *
 * Drawn with `currentColor` so callers set the tone with a text-* class.
 */

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const BrushIcon = ({ size = 64, className = "" }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
    <g {...base}>
      {/* handle */}
      <path d="M40 8 L56 24 L30 50 L14 34 Z" opacity="0.55" />
      {/* ferrule */}
      <path d="M14 34 L30 50" />
      <path d="M9 39 L25 55" />
      <path d="M14 34 L9 39" />
      <path d="M30 50 L25 55" />
      {/* bristles */}
      <path d="M9 39 C4 44, 3 52, 6 58 C12 61, 20 60, 25 55" />
      <path d="M12 46 C11 50, 12 54, 15 56" opacity="0.6" />
    </g>
  </svg>
);

export const PaletteIcon = ({ size = 64, className = "" }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
    <g {...base}>
      <path d="M32 6 C16 6, 5 17, 5 31 C5 43, 14 51, 24 51 C29 51, 30 47, 29 44 C28 41, 30 38, 34 38 L44 38 C53 38, 59 32, 59 25 C59 14, 47 6, 32 6 Z" />
      <circle cx="18" cy="21" r="3.2" opacity="0.75" />
      <circle cx="29" cy="15" r="3.2" opacity="0.75" />
      <circle cx="42" cy="17" r="3.2" opacity="0.75" />
      <circle cx="48" cy="28" r="3.2" opacity="0.75" />
    </g>
  </svg>
);

export const TubeIcon = ({ size = 64, className = "" }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
    <g {...base}>
      <path d="M22 14 L42 14 L46 50 C46 54, 43 57, 39 57 L25 57 C21 57, 18 54, 18 50 Z" opacity="0.55" />
      <path d="M22 14 L26 7 L38 7 L42 14" />
      <path d="M28 7 L28 3 L36 3 L36 7" />
      <path d="M20 26 L44 26" opacity="0.7" />
      <path d="M21 33 L43 33" opacity="0.45" />
    </g>
  </svg>
);

export const PencilIcon = ({ size = 64, className = "" }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
    <g {...base}>
      <path d="M46 6 L58 18 L24 52 L8 56 L12 40 Z" opacity="0.55" />
      <path d="M40 12 L52 24" />
      <path d="M12 40 L24 52" />
      <path d="M8 56 L14 50" />
    </g>
  </svg>
);

export const EaselIcon = ({ size = 64, className = "" }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
    <g {...base}>
      <rect x="14" y="8" width="36" height="27" opacity="0.55" />
      <path d="M32 35 L32 58" />
      <path d="M18 58 L32 40 L46 58" />
      <path d="M22 50 L42 50" opacity="0.6" />
    </g>
  </svg>
);

/** Small row of colour chips the one place we allow filled shapes. */
export const SwatchRow = ({ className = "" }) => (
  <svg viewBox="0 0 120 24" width="120" height="24" className={className} aria-hidden="true" focusable="false">
    {["#E8340C", "#1F6B4A", "#B57A0A", "#2C4E86", "#7A3E8F"].map((c, i) => (
      <rect key={c} x={i * 24} y="0" width="20" height="24" fill={c} opacity="0.75" />
    ))}
  </svg>
);

/**
 * Scatters the objects around a section as a background layer.
 * Hidden below `lg` so it never competes with content on a phone.
 */
const ArtSupplies = ({ tone = "text-ink/[0.07]" }) => (
  <div className={`pointer-events-none select-none absolute inset-0 overflow-hidden hidden lg:block ${tone}`} aria-hidden="true">
    <BrushIcon size={150} className="absolute -left-8 top-10 -rotate-12" />
    <PaletteIcon size={170} className="absolute right-[3%] top-6 rotate-6" />
    <TubeIcon size={110} className="absolute left-[14%] bottom-8 rotate-[18deg]" />
    <PencilIcon size={120} className="absolute right-[16%] bottom-6 -rotate-[24deg]" />
    <EaselIcon size={130} className="absolute left-[46%] top-2 rotate-3 opacity-70" />
  </div>
);

export default ArtSupplies;
