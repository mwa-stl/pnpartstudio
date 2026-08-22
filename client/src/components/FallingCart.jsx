import React, { useEffect, useRef } from "react";
import { ShoppingCart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

// Helper: Ripple effect via inline styles and dynamic classes (using Tailwind)
const FallingCart = ({
  right = 16,
  bottomOffset = 88,
  durationMs = 14000,
  delayMs = 200,
  minRate = 0.15,
  easeBackMs = 400,
  scrollSensitivity = 0.004,
  size = 22,
  navigateTo = "/cart",
  ariaLabel = "Go to cart",
  className = ""
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const hostRef = useRef(null);
  const animRef = useRef(null);

  // Ripple state
  const [ripple, setRipple] = React.useState(false);

  // Scroll velocity tracking
  const lastY = useRef(0);
  const lastT = useRef(0);
  const rafScroll = useRef(0);
  const rafEase = useRef(0);
  const stopTimer = useRef(0);

  // Start fall animation
  const startFall = () => {
    const el = hostRef.current;
    if (!el) return;
    const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cancelAnim = () => {
      if (!animRef.current) return;
      try { animRef.current.cancel(); } catch { /* animation already finished */ }
      animRef.current = null;
    };
    if (prefersReduce) {
      el.style.transform = "translateY(0px)";
      cancelAnim();
      return;
    }
    cancelAnim();
    const startY = -1.01 * Math.max(window.innerHeight, 1);
    el.style.transform = `translateY(${startY}px)`;
    const fall = el.animate([{ transform: `translateY(${startY}px)` }, { transform: "translateY(0px)" }],
      { duration: durationMs, delay: delayMs, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards", iterations: 1 });
    fall.playbackRate = 1;
    animRef.current = fall;
    lastY.current = window.scrollY || 0;
    lastT.current = performance.now();
  };

  useEffect(() => {
    startFall();
    return () => {
      if (!animRef.current) return;
      try { animRef.current.cancel(); } catch { /* animation already finished */ }
      animRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const easeBack = (startRate, startTime) => {
      if (!animRef.current) return;
      const now = performance.now();
      const t = Math.min(1, (now - startTime) / easeBackMs);
      const eased = startRate + (1 - startRate) * t;
      if (animRef.current.updatePlaybackRate) { animRef.current.updatePlaybackRate(eased); }
      else { animRef.current.playbackRate = eased; }
      if (t < 1) { rafEase.current = requestAnimationFrame(() => easeBack(startRate, startTime)); }
      else { rafEase.current = 0; }
    };

    const applyRate = (rate) => {
      if (!animRef.current) return;
      animRef.current.playbackRate = rate;
      if (rate === 1) return;
      if (rafEase.current) cancelAnimationFrame(rafEase.current);
      rafEase.current = requestAnimationFrame(() => easeBack(rate, performance.now()));
    };

    const onScroll = () => {
      if (rafScroll.current) return;
      rafScroll.current = requestAnimationFrame(() => {
        rafScroll.current = 0;
        if (!animRef.current) return;
        const y = window.scrollY || 0;
        const t = performance.now();
        if (!lastT.current) { lastY.current = y; lastT.current = t; return; }
        const dy = y - lastY.current;
        const dt = Math.max(1, t - lastT.current);
        lastY.current = y;
        lastT.current = t;
        const vel = Math.abs(dy) / dt;
        const slowdown = Math.min(0.9, vel / Math.max(0.00001, scrollSensitivity));
        const rate = Math.max(minRate, 1 - slowdown);
        applyRate(rate);
        if (stopTimer.current) clearTimeout(stopTimer.current);
        stopTimer.current = window.setTimeout(() => applyRate(1), 180);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (rafScroll.current) cancelAnimationFrame(rafScroll.current);
      if (rafEase.current) cancelAnimationFrame(rafEase.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (stopTimer.current) clearTimeout(stopTimer.current);
    };
  }, [easeBackMs, minRate, scrollSensitivity]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const btn = el.querySelector(".fc-btn");
    if (!btn) return;
    const onEnter = () => { if (animRef.current) animRef.current.playbackRate = 0; setRipple(true); };
    const onLeave = () => {
      if (!animRef.current) return;
      if (animRef.current.updatePlaybackRate) animRef.current.updatePlaybackRate(1);
      else animRef.current.playbackRate = 1;
      setRipple(false);
    };
    btn.addEventListener("mouseenter", onEnter);
    btn.addEventListener("focus", onEnter);
    btn.addEventListener("mouseleave", onLeave);
    btn.addEventListener("blur", onLeave);
    return () => {
      btn.removeEventListener("mouseenter", onEnter);
      btn.removeEventListener("focus", onEnter);
      btn.removeEventListener("mouseleave", onLeave);
      btn.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`fixed z-[1060] will-change-transform ${className}`}
      style={{ right: `${right}px`, bottom: `${bottomOffset}px` }}
    >
      <button
        type="button"
        className="fc-btn w-12 h-12 bg-ink text-paper border border-ink flex items-center justify-center relative overflow-hidden transition-colors duration-300 hover:bg-vermillion hover:border-vermillion hover:text-white"
        aria-label={ariaLabel}
        onClick={() => navigate(navigateTo)}
      >
        <ShoppingCart size={size} />
        <span
          className={`absolute inset-0 rounded-full pointer-events-none transition-all duration-300 ${
            ripple ? "opacity-100 scale-100" : "opacity-0 scale-75"
          }`}
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 65%)"
          }}
        />
      </button>
    </div>
  );
};

export default FallingCart;
