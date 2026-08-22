import { createContext, useContext } from "react";

// Populated by <SmoothScroll> once the Lenis instance is ready.
// Consumers (ScrollToTop, BackToTop, parallax bits) read it via useLenis().
export const LenisContext = createContext(null);

export default function useLenis() {
  return useContext(LenisContext);
}
