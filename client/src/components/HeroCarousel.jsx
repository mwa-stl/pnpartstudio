import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const API = (import.meta.env.VITE_API_URL ?? "") + "/api/hero-sliders";
const EASE = [0.16, 1, 0.3, 1];

const HeroCarousel = ({
  autoPlay = true,
  interval = 6000,
  showArrows = true,
  showIndicators = true,
  onSlideChange
}) => {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    axios.get(API, { signal: controller.signal })
      .then(res => setSlides(Array.isArray(res.data) ? res.data : res.data.items || []))
      .catch(() => setSlides([]));
    return () => controller.abort();
  }, []);

  const total = slides.length;

  const goTo = useCallback((i) => {
    if (!total) return;
    const nextIdx = (i + total) % total;
    setIndex(nextIdx);
    if (typeof onSlideChange === 'function') onSlideChange(nextIdx);
  }, [total, onSlideChange]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  /*
    Autoplay. `paused` is state, not a ref, on purpose: a ref change can't
    re-run this effect, so unpausing would never restart the timer. The
    advance uses a functional update so it can't close over a stale index.
  */
  useEffect(() => {
    if (!autoPlay || total <= 1 || paused) return undefined;
    const id = setTimeout(() => {
      setIndex((i) => {
        const nextIdx = (i + 1) % total;
        if (typeof onSlideChange === 'function') onSlideChange(nextIdx);
        return nextIdx;
      });
    }, Math.max(1200, interval));
    return () => clearTimeout(id);
  }, [index, autoPlay, interval, total, paused, onSlideChange]);

  // Don't keep cycling in a tab nobody is looking at.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const onMouseEnter = () => setPaused(true);
  const onMouseLeave = () => setPaused(false);
  const onTouchStart = e => { if (e.changedTouches?.length) touchStartX.current = e.changedTouches[0].clientX; };
  const onTouchMove = e => { if (e.changedTouches?.length) touchEndX.current = e.changedTouches[0].clientX; };
  const onTouchEnd = () => {
    const dx = touchEndX.current - touchStartX.current;
    if (Math.abs(dx) > 45) (dx > 0 ? prev() : next());
    touchStartX.current = 0; touchEndX.current = 0;
  };

  const currentSlide = useMemo(() => slides[index] || {}, [slides, index]);
  const counter = total ? `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}` : "00 / 00";

  return (
    <section
      className="hero-shell relative w-full bg-paper border-b border-ink overflow-hidden"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
      aria-label="Featured artwork"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-full">
        {/* Auto rows below lg so neither column can be squeezed; the fixed
            viewport split only kicks in on lg, where there is room for it. */}
        <div className="h-full grid grid-cols-1 lg:grid-rows-1 lg:grid-cols-[1fr_1.05fr] gap-6 lg:gap-14 items-center py-6 lg:py-10">

          {/* Type column */}
          <div className="order-2 lg:order-1 min-w-0 lg:min-h-0 flex flex-col justify-center lg:overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={`c-${currentSlide._id || index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="section-index mb-4 lg:mb-6">
                  {currentSlide.eyebrow || "Original Artwork"}
                </div>

                {currentSlide.heading && (
                  <h1 className="t-hero mb-4 lg:mb-6 line-clamp-3">
                    <span className="reveal-mask">
                      <motion.span
                        initial={{ y: "112%" }}
                        animate={{ y: "0%" }}
                        transition={{ duration: 1, ease: EASE, delay: 0.05 }}
                      >
                        {currentSlide.heading}
                      </motion.span>
                    </span>
                  </h1>
                )}

                {currentSlide.sub && (
                  <motion.p
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
                    className="text-graphite text-[0.95rem] lg:text-[1.02rem] leading-relaxed max-w-md mb-6 lg:mb-8 line-clamp-2 lg:line-clamp-3"
                  >
                    {currentSlide.sub}
                  </motion.p>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
                  className="flex flex-wrap items-center gap-3"
                >
                  {currentSlide.ctaLabel && currentSlide.ctaHref ? (
                    <Link to={currentSlide.ctaHref} className="btn-k">
                      {currentSlide.ctaLabel} <ArrowUpRight size={14} />
                    </Link>
                  ) : (
                    <Link to="/shop" className="btn-k">
                      View the collection <ArrowUpRight size={14} />
                    </Link>
                  )}
                  <Link to="/custom-order" className="btn-k btn-k-outline">Commission a piece</Link>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            {total > 1 && (
              <div className="flex items-center gap-4 sm:gap-6 mt-auto pt-4 lg:pt-6 border-t border-rule shrink-0">
                <span className="font-mono text-[0.68rem] tracking-[0.14em] text-graphite tabular-nums">{counter}</span>

                {showArrows && (
                  <div className="flex gap-2">
                    <button
                      type="button" onClick={prev} aria-label="Previous slide"
                      className="w-10 h-10 border border-rule-strong flex items-center justify-center text-ink hover:bg-ink hover:text-paper hover:border-ink transition-colors"
                    >
                      <ArrowLeft size={15} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button" onClick={next} aria-label="Next slide"
                      className="w-10 h-10 border border-rule-strong flex items-center justify-center text-ink hover:bg-ink hover:text-paper hover:border-ink transition-colors"
                    >
                      <ArrowRight size={15} strokeWidth={1.8} />
                    </button>
                  </div>
                )}

                {showIndicators && (
                  <div className="flex gap-1.5 ml-auto" role="tablist" aria-label="Slides">
                    {slides.map((s, i) => (
                      <button
                        key={s._id || i}
                        type="button"
                        role="tab"
                        aria-selected={i === index}
                        aria-label={`Go to slide ${i + 1}`}
                        onClick={() => goTo(i)}
                        className="h-[3px] transition-all duration-500"
                        style={{
                          width: i === index ? 40 : 16,
                          background: i === index ? "var(--color-vermillion)" : "var(--color-rule-strong)",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Image column offset frame, hairline outline behind.
              Needs an explicit height below lg: the row is auto-sized there,
              so `h-full` alone would collapse to nothing. */}
          <div className="order-1 lg:order-2 relative h-[46vh] min-h-[260px] max-h-[440px] lg:h-full lg:min-h-0 lg:max-h-none">
            <div className="absolute -inset-3 sm:-inset-5 border border-rule pointer-events-none hidden sm:block" aria-hidden="true" />
            <div className="relative overflow-hidden bg-paper-deep h-full w-full">
              <AnimatePresence initial={false}>
                {currentSlide.image ? (
                  <motion.img
                    key={currentSlide._id || currentSlide.image}
                    src={currentSlide.image}
                    alt={currentSlide.alt || currentSlide.heading || ''}
                    initial={{ clipPath: "inset(0 0 100% 0)", scale: 1.08 }}
                    animate={{ clipPath: "inset(0 0 0% 0)", scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ clipPath: { duration: 1, ease: EASE }, scale: { duration: 7, ease: "linear" }, opacity: { duration: 0.4 } }}
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                    fetchPriority="high"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-slate">PnP Artstudio</span>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Caption plate */}
            {currentSlide.heading && (
              <div className="absolute -bottom-px -left-px bg-ink text-paper px-4 py-2.5 max-w-[80%]">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-paper/70 truncate block">
                  {currentSlide.alt || currentSlide.heading}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
