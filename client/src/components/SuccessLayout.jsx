import React from "react";
import { RevealLines } from "./motion/Reveal";

/* Confirmation screen used after checkout / store pickup.
   A single rule draws itself across the page quieter than a tick,
   and consistent with the hairline language of the rest of the site. */

export const DrawnRule = () => (
  <>
    <span className="drawn-rule" aria-hidden="true" />
    <style>{`
      .drawn-rule {
        display: block;
        height: 2px;
        background: var(--color-vermillion);
        width: 0;
        animation: draw-rule .9s cubic-bezier(.16,1,.3,1) .15s forwards;
      }
      @keyframes draw-rule { to { width: 100%; } }
      @media (prefers-reduced-motion: reduce) { .drawn-rule { width: 100%; animation: none; } }
    `}</style>
  </>
);

const SuccessLayout = ({ eyebrow, title, children, actions }) => (
  <div className="min-h-[80vh] flex items-center bg-paper px-4 sm:px-6 lg:px-8 py-24">
    <div className="max-w-[1100px] mx-auto w-full">
      <div className="max-w-2xl">
        {eyebrow && <div className="section-index mb-8">{eyebrow}</div>}
        <DrawnRule />
        <RevealLines as="h1" className="t-display mt-10 mb-8" lines={[title]} />
        <div className="text-graphite leading-relaxed text-[1rem] mb-12">{children}</div>
        {actions && <div className="flex flex-col sm:flex-row gap-3">{actions}</div>}
      </div>
    </div>
  </div>
);

export default SuccessLayout;
