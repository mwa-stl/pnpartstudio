// src/components/ScrollToTop.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import useLenis from "../hooks/useLenis";

const ScrollToTop = ({ behavior = "instant" }) => {
  const { pathname, search, hash } = useLocation();
  const lenis = useLenis();

  /*
   * Browsers restore the previous scroll offset on reload, and they do it
   * after this component's first render — so refreshing halfway down a page
   * dropped the visitor back at the footer, past the effect below that only
   * fires on a route *change*. Opting out of the browser's own restoration
   * hands scroll position back to the effect in every case, reload included.
   */
  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) return undefined;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useEffect(() => {
    // If there is a hash (#section), try to scroll that element into view
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        if (lenis) lenis.scrollTo(el, { immediate: behavior === "instant" });
        else el.scrollIntoView({ behavior });
        return;
      }
    }
    // Otherwise scroll to top-left on route/query change
    if (lenis) lenis.scrollTo(0, { immediate: behavior === "instant" });
    else window.scrollTo({ top: 0, left: 0, behavior });
  }, [pathname, search, hash, behavior, lenis]);

  return null;
};

export default ScrollToTop;
