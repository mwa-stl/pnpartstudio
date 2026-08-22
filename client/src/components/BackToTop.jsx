// src/components/BackToTop.jsx
import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import useLenis from "../hooks/useLenis";

const BackToTop = ({
  threshold = 280,
  right = 16,
  bottom = 20,   // matches .wa-fab so both corner buttons share a baseline
  zIndex = 1050,
}) => {
  const [visible, setVisible] = useState(false);
  const lenis = useLenis();

  useEffect(() => {
    const onScroll = () => {
      const y = window.pageYOffset || document.documentElement.scrollTop || 0;
      setVisible(y > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  const scrollToTop = () => {
    if (lenis) lenis.scrollTo(0, { duration: 1.1 });
    else window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  return (
    <>
      <button
        type="button"
        aria-label="Back to top"
        onClick={scrollToTop}
        className={`back-to-top ${visible ? "show" : ""}`}
        style={{ right, bottom, zIndex }}
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible}
      >
        <ArrowUp size={17} strokeWidth={1.8} />
        <span className="btt-label">Top</span>
      </button>

      <style>{`
        /* Kept in lockstep with .wa-fab in WhatsAppButton.jsx. */
        .back-to-top {
          position: fixed;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          min-height: 48px;
          padding: 0 0.95rem;
          background: var(--color-ink);
          color: var(--color-paper);
          border: 1px solid var(--color-ink);
          border-radius: 0;
          font-family: var(--font-mono);
          font-size: 0.6rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          transition: opacity .25s ease, transform .35s cubic-bezier(.16,1,.3,1), background-color .25s ease, border-color .25s ease;
          opacity: 0;
          pointer-events: none;
          transform: translateY(10px);
        }
        .back-to-top.show { opacity: 1; pointer-events: auto; transform: translateY(0); }
        .back-to-top:hover { background: var(--color-vermillion); border-color: var(--color-vermillion); color: #fff; }
        .back-to-top:focus-visible { outline: 2px solid var(--color-vermillion); outline-offset: 3px; }
        /* !important so it wins over the inline right/bottom props. */
        @media (max-width: 480px) {
          .btt-label { display: none; }
          .back-to-top {
            padding: 0;
            width: 44px;
            min-height: 44px;
            right: 12px !important;
            bottom: 16px !important;
          }
        }
        @media (prefers-reduced-motion: reduce) { .back-to-top { transition: opacity .01ms; } }
      `}</style>
    </>
  );
};

export default BackToTop;
