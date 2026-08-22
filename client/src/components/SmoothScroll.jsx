import React, { useEffect, useState } from "react";
import Lenis from "lenis";
import { LenisContext } from "../hooks/useLenis";

// Wraps the app in inertial smooth-scroll. Kept off the admin app on
// purpose data tables/forms want native, instant scroll.
const SmoothScroll = ({ children }) => {
  const [lenis, setLenis] = useState(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return undefined;

    const instance = new Lenis({
      duration: 1.15,
      easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.1,
    });

    let frameId;
    const raf = (time) => {
      instance.raf(time);
      frameId = requestAnimationFrame(raf);
    };
    frameId = requestAnimationFrame(raf);
    setLenis(instance);

    return () => {
      cancelAnimationFrame(frameId);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
};

export default SmoothScroll;
