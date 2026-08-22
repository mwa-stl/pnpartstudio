import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { RevealLines } from "./motion/Reveal";

const API = (import.meta.env.VITE_API_URL ?? "") + "/api/testimonials";
const REVIEW_LIMIT = 190;

/** How far from centre a card can sit before it stops being drawn. */
const VISIBLE = 3;

const AVATAR_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="100%" height="100%" fill="#E7E6DE"/></svg>`
  );

/* A card's tilt has to be stable across renders, so it comes from the card's
   own index rather than Math.random(). */
const jitter = (i, spread) => (((i * 2654435761) % 1000) / 1000 - 0.5) * spread;

/** Rating as a mono fraction rather than star glyphs — quieter, more editorial. */
const Rating = ({ rating = 5, onInk = false }) => (
  <span
    className={`font-mono text-[0.6rem] tracking-[0.14em] tabular-nums ${onInk ? "text-paper" : "text-vermillion"}`}
    aria-label={`${rating} out of 5`}
  >
    {Number(rating).toFixed(1)}
    <span className={onInk ? "text-paper/50" : "text-slate"}>/5.0</span>
  </span>
);

/* ── One card in the deck ─────────────────────────────────────────────────
   The notched top-right corner is the deck's signature: a torn-page shape
   that keeps the stack from reading as a row of plain rectangles. */
const NOTCH = "polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%)";

function DeckCard({ testimonial, offset, active, onSelect, onShowMore }) {
  const distance = Math.abs(offset);
  const review = testimonial.review || "";
  const isLong = review.length > REVIEW_LIMIT;

  return (
    <motion.figure
      aria-hidden={!active}
      animate={{
        // Cards fan outward from centre and lean a little further with distance.
        x: `${offset * 58}%`,
        rotate: offset * 3.6 + jitter(testimonial.key, 3),
        scale: active ? 1 : 1 - distance * 0.07,
        opacity: distance > VISIBLE ? 0 : 1,
        zIndex: 50 - distance,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 32, mass: 0.9 }}
      onClick={() => (active ? isLong && onShowMore(testimonial) : onSelect())}
      className={`absolute top-0 left-1/2 -ml-[9.5rem] w-[19rem] sm:w-[21rem] h-full flex flex-col cursor-pointer select-none ${
        active
          ? "bg-vermillion text-white shadow-[0_28px_60px_-30px_rgba(11,11,11,0.55)]"
          : "bg-paper text-ink border border-ink"
      }`}
      style={{ clipPath: NOTCH }}
    >
      <div className={`flex items-center justify-between px-5 pt-5 pb-4 ${active ? "" : "border-b border-rule"}`}>
        <img
          src={testimonial.avatar || AVATAR_FALLBACK}
          alt=""
          className="w-11 h-11 object-cover bg-paper-deep shrink-0"
          loading="lazy"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = AVATAR_FALLBACK; }}
        />
        <Rating rating={Number(testimonial.rating) || 5} onInk={active} />
      </div>

      <blockquote className="px-5 pb-4 grow overflow-hidden">
        <p className={`text-[0.95rem] leading-[1.6] ${active ? "text-white" : "text-graphite"}`}>
          “{isLong ? `${review.slice(0, REVIEW_LIMIT)}…` : review}”
        </p>
        {active && isLong && (
          <span className="inline-block mt-3 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-white/70">
            Click to read in full
          </span>
        )}
      </blockquote>

      <figcaption
        className={`px-5 py-4 mt-auto ${active ? "border-t border-white/25" : "border-t border-rule"}`}
      >
        <div
          className={`text-[0.95rem] italic ${active ? "text-white" : "text-ink"}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          — {testimonial.name}
        </div>
        {testimonial.city && (
          <div className={`font-mono text-[0.56rem] uppercase tracking-[0.12em] mt-1 ${active ? "text-white/60" : "text-slate"}`}>
            {testimonial.city}
          </div>
        )}
      </figcaption>
    </motion.figure>
  );
}

function ReviewModal({ testimonial, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center px-4 bg-ink/60" onClick={onClose} role="dialog" aria-modal="true">
      <div className="relative bg-paper border border-ink max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-slate">Full review</span>
          <button
            className="w-8 h-8 border border-rule-strong text-ink hover:bg-ink hover:text-paper hover:border-ink flex items-center justify-center transition-colors"
            onClick={onClose}
            aria-label="Close review"
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>

        <blockquote className="px-6 py-7">
          <p className="text-graphite leading-[1.7] text-[0.95rem]">{testimonial.review}</p>
        </blockquote>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-rule">
          <img
            src={testimonial.avatar || AVATAR_FALLBACK}
            alt=""
            className="w-10 h-10 object-cover border border-rule bg-paper-deep"
            onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = AVATAR_FALLBACK; }}
          />
          <div>
            <div className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-ink">{testimonial.name}</div>
            {testimonial.city && <div className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-slate mt-0.5">{testimonial.city}</div>}
          </div>
          <span className="ml-auto"><Rating rating={Number(testimonial.rating) || 5} /></span>
        </div>
      </div>
    </div>
  );
}

/**
 * Testimonials as a fanned deck: cards overlap and tilt, the centre one turns
 * vermillion and straightens up. Advances on its own, and can be driven by
 * the arrows, the arrow keys, or by clicking any card off to the side.
 */
const TestimonialsCarousel = ({ label = "Kind Words", interval = 1000 }) => {
  const [testimonials, setTestimonials] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [modal, setModal] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    axios.get(API, { signal: controller.signal }).then(res => {
      let items =
        Array.isArray(res.data) ? res.data :
        res.data.items || res.data.testimonials || [];
      if (!Array.isArray(items) && typeof items === "object") items = Object.values(items);
      items = Array.isArray(items) ? items.filter(t => (t.text || t.review) && t.name) : [];
      setTestimonials(items.map((t, i) => ({
        ...t,
        review: t.review || t.text,
        avatar: t.avatar || t.imageUrl,
        id: t.id || t._id,
        key: i,
      })));
    }).catch(() => setTestimonials([]));
    return () => controller.abort();
  }, []);

  const total = testimonials.length;

  const step = useCallback((delta) => {
    setIndex((i) => (total ? (i + delta + total) % total : 0));
  }, [total]);

  /* Autoplay. Keyed off `index` rather than an interval so a manual jump
     restarts the clock instead of firing again immediately after. */
  useEffect(() => {
    if (total <= 1 || paused || modal) return undefined;
    const id = setTimeout(() => step(1), Math.max(600, interval));
    return () => clearTimeout(id);
  }, [index, total, paused, modal, interval, step]);

  // Pause while the tab is hidden — a deck spinning in the background is waste.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  };

  /* Offset each card from the active one, wrapped so the deck is a loop
     rather than a line with two ends. */
  const positioned = useMemo(() => {
    if (!total) return [];
    const half = Math.floor(total / 2);
    return testimonials.map((t, i) => {
      let offset = i - index;
      if (offset > half) offset -= total;
      if (offset < -half) offset += total;
      return { testimonial: t, offset };
    });
  }, [testimonials, index, total]);

  return (
    <section className="w-full" aria-label="Customer testimonials" aria-roledescription="carousel">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="section-index mb-7">{label}</div>
        <RevealLines as="h2" className="t-display" lines={['What collectors say']} />
      </div>

      {total === 0 ? (
        <p className="text-center text-slate py-10 font-mono text-[0.7rem] uppercase tracking-[0.14em]">
          No testimonials yet.
        </p>
      ) : (
        <div
          ref={rootRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="outline-none"
        >
          {/* The deck. Overflow is clipped so the fanned cards run off the
              edges rather than widening the page. */}
          <div className="relative h-[22rem] sm:h-[23rem] overflow-hidden">
            {positioned.map(({ testimonial, offset }) => (
              <DeckCard
                key={testimonial.id || testimonial.key}
                testimonial={testimonial}
                offset={offset}
                active={offset === 0}
                onSelect={() => step(offset)}
                onShowMore={setModal}
              />
            ))}
          </div>

          {/* Manual controls */}
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous testimonial"
              className="w-12 h-12 border border-rule-strong text-ink flex items-center justify-center hover:bg-ink hover:text-paper hover:border-ink transition-colors duration-300"
            >
              <ArrowLeft size={17} strokeWidth={1.7} />
            </button>

            <span
              className="font-mono text-[0.62rem] tabular-nums text-slate w-16 text-center"
              aria-live="polite"
            >
              {String(index + 1).padStart(2, "0")}
              <span className="text-rule-strong"> / </span>
              {String(total).padStart(2, "0")}
            </span>

            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next testimonial"
              className="w-12 h-12 border border-rule-strong text-ink flex items-center justify-center hover:bg-ink hover:text-paper hover:border-ink transition-colors duration-300"
            >
              <ArrowRight size={17} strokeWidth={1.7} />
            </button>
          </div>
        </div>
      )}

      {modal && <ReviewModal testimonial={modal} onClose={() => setModal(null)} />}
    </section>
  );
};

export default TestimonialsCarousel;
