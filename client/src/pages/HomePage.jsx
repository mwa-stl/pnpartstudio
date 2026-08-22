import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import axios from 'axios';

import HeroCarousel from '../components/HeroCarousel';
import ProductCard from '../components/ProductCard';
import TestimonialsCarousel from '../components/TestimonialsCarousel';
import Reveal, { RevealLines } from '../components/motion/Reveal';
import ParallaxLayer from '../components/motion/ParallaxLayer';
import ThreeDScrollTriggerRow, { ThreeDScrollTriggerContainer } from '../components/ThreeDScrollTrigger';
import ArtSupplies, { BrushIcon, PencilIcon, TubeIcon, EaselIcon } from '../components/ArtSupplies';
import ClassCard from '../components/ClassCard';
import TextLoop from '../components/TextLoop';
import useArtistProfile from '../hooks/useArtistProfile';
import useSiteSettings from '../hooks/useSiteSettings';
import { hasEnded, normaliseClass } from '../data/classes';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const tickerWords = [
  'Original Paintings', 'Custom Commissions', 'Indian Art',
  'Landscapes', 'Art Workshops', 'Limited Editions', 'Return Gifts',
];

const disciplines = [
  {
    n: '01',
    title: 'Original Artworks',
    body: 'Hand-painted canvases and pencil work, each one a single edition signed by the artist.',
    to: '/shop',
    cta: 'Browse the shop',
  },
  {
    n: '02',
    title: 'Custom Commissions',
    body: 'Portraits, name signs and gifts painted to your brief from first sketch to framed delivery.',
    to: '/custom-order',
    cta: 'Commission a piece',
  },
  {
    n: '03',
    title: 'Art Classes',
    body: 'Small-group and one-to-one sessions for every age, taught over ten years of practice.',
    to: '/art-classes',
    cta: 'See class schedule',
  },
];

const stats = [
  { number: '500', suffix: '+', label: 'Artworks created' },
  { number: '1000', suffix: '+', label: 'Happy collectors' },
  { number: '50', suffix: '+', label: 'Awards won' },
  { number: '4.9', suffix: '', label: 'Average rating' },
];

const normalise = (p) => ({
  ...p,
  id: p.id || p._id || p.sku,
  image: p.image || p.images?.[0] || p.cover || p.thumbnail,
});

const readItems = (data) =>
  (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])).map(normalise);

/**
 * Bolds the artist's name where it appears in an admin-authored paragraph,
 * so the emphasis survives even though the copy is no longer hardcoded.
 */
const emphasiseName = (text, name) => {
  const i = name ? text.indexOf(name) : -1;
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <strong className="text-ink font-semibold">{name}</strong>
      {text.slice(i + name.length)}
    </>
  );
};

function HomePage() {
  const artist = useArtistProfile();
  const settings = useSiteSettings();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [enquiryProducts, setEnquiryProducts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loadingProd, setLoadingProd] = useState(true);
  const [prodErr, setProdErr] = useState('');

  // Two dedicated endpoints rather than pulling the whole catalogue and
  // splitting it here the server already knows which pieces are
  // purchasable and which are quoted on request.
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoadingProd(true);
        setProdErr('');
        const [buyable, enquiry, classList] = await Promise.all([
          axios.get(`${API_BASE}/api/products/purchasable`, {
            params: { limit: 6 },
            withCredentials: true,
            signal: controller.signal,
          }),
          axios.get(`${API_BASE}/api/products/enquiry`, {
            params: { limit: 6 },
            withCredentials: true,
            signal: controller.signal,
          }),
          axios.get(`${API_BASE}/api/classes`, {
            params: { published: true },
            signal: controller.signal,
          }),
        ]);
        setFeaturedProducts(readItems(buyable.data));
        setEnquiryProducts(readItems(enquiry.data));
        setClasses(Array.isArray(classList.data?.items) ? classList.data.items.map(normaliseClass) : []);
      } catch (err) {
        if (!axios.isCancel(err)) setProdErr('We could not load the artworks just now. Please refresh to try again.');
      } finally {
        setLoadingProd(false);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  // The three soonest sessions still open. Past dates fall to the back rather
  // than disappearing, so the strip is never empty while a new term is being
  // scheduled.
  const upcomingClasses = [...classes]
    .sort((a, b) => {
      const ended = Number(hasEnded(a)) - Number(hasEnded(b));
      if (ended !== 0) return ended;
      return String(a.startDate).localeCompare(String(b.startDate));
    })
    .slice(0, 3);

  return (
    <div className="bg-paper">
      <HeroCarousel autoPlay interval={2000} showArrows showIndicators />

      {/* ───────── TICKER ───────── */}
      <div className="bg-ink border-y border-ink py-3.5 overflow-hidden">
        <ThreeDScrollTriggerContainer>
          <ThreeDScrollTriggerRow baseVelocity={2}>
            {tickerWords.map((w) => (
              <span key={w} className="mx-5 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-paper/60 inline-flex items-center gap-5">
                {w} <span className="text-vermillion">✳</span>
              </span>
            ))}
          </ThreeDScrollTriggerRow>
        </ThreeDScrollTriggerContainer>
      </div>

      {/* ───────── 01 THE STUDIO ───────── */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1fr] gap-10 lg:gap-20 mb-16">
          <Reveal>
            <div className="section-index mb-7">01 The Studio</div>
            <RevealLines
              as="h2"
              className="t-display"
              lines={['Three ways to bring', 'a piece of the studio', 'home.']}
            />
          </Reveal>
          <Reveal delay={0.15} className="flex items-end">
            <p className="text-graphite text-[1.02rem] leading-relaxed max-w-md">
              Everything here is made by hand in Ballwin, Missouri whether you collect a
              finished original, commission something personal, or learn to paint it yourself.
            </p>
          </Reveal>
        </div>

        {/* Numbered rows, not cards reads like a catalogue index */}
        <div className="border-t border-ink">
          {disciplines.map(({ n, title, body, to, cta }, i) => (
            <Reveal key={title} delay={i * 0.08}>
              <Link
                to={to}
                className="group grid grid-cols-1 md:grid-cols-[auto_1fr_1.2fr_auto] items-baseline gap-x-8 gap-y-3 py-8 sm:py-10 border-b border-rule hover:border-ink transition-colors duration-500"
              >
                <span className="font-mono text-[0.68rem] text-vermillion tabular-nums">{n}</span>
                <h3 className="t-section group-hover:text-vermillion transition-colors duration-400">{title}</h3>
                <p className="text-graphite text-[0.95rem] leading-relaxed max-w-md">{body}</p>
                <span className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ink group-hover:text-vermillion transition-colors whitespace-nowrap">
                  {cta}
                  <ArrowUpRight size={14} className="transition-transform duration-400 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── RIBBON ─────────
          Replaces what used to be a second full-bleed parallax quote band;
          the closing section already does that, and doing it twice made the
          page read as if it were repeating itself. */}
      <div className="bg-paper-dim border-y border-rule ribbon-band">
        <TextLoop
          text="Original paintings ✦ Commissions ✦ Art classes"
          shape="wave"
          speed={70}
          separator="✦"
          curviness={34}
          fontSize={38}
          fontWeight={700}
          letterSpacing={3}
          uppercase
          color="#FBFBF8"
          ribbon
          ribbonColor="#E8340C"
          ribbonWidth={72}
          pauseOnHover
        />
      </div>

      {/* ───────── 02 FEATURED ───────── */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-6 mb-14">
          <div>
            <div className="section-index mb-7">02 Available Now</div>
            <h2 className="t-display">Ready to collect</h2>
            <p className="text-graphite mt-4 max-w-md">Priced and in stock add straight to your cart.</p>
          </div>
          <Link to="/shop" className="group inline-flex items-center gap-2 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-ink hover:text-vermillion transition-colors pb-2 border-b border-ink hover:border-vermillion">
            View all
            <ArrowUpRight size={14} className="transition-transform duration-400 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
        </Reveal>

        {prodErr && (
          <div role="alert" className="mb-10 border border-vermillion bg-vermillion-wash px-5 py-4 font-mono text-[0.72rem] uppercase tracking-[0.1em] text-vermillion-dark">
            {prodErr}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
          {loadingProd
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border border-rule">
                  <div className="aspect-square bg-paper-deep animate-pulse" />
                  <div className="p-5 space-y-3 border-t border-rule">
                    <div className="h-4 bg-paper-deep animate-pulse w-3/4" />
                    <div className="h-3 bg-paper-deep animate-pulse w-1/2" />
                    <div className="h-3 bg-paper-deep animate-pulse w-full" />
                  </div>
                </div>
              ))
            : featuredProducts.map((product, idx) => (
                <Reveal key={product.id} delay={Math.min(idx, 3) * 0.07}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
        </div>

        {!loadingProd && featuredProducts.length === 0 && !prodErr && (
          <p className="text-center text-slate py-16 font-mono text-[0.72rem] uppercase tracking-[0.14em]">
            No featured artworks right now the full collection is in the shop.
          </p>
        )}

        {!loadingProd && featuredProducts.length > 0 && (
          <Reveal className="mt-12 pt-10 border-t border-rule flex justify-center">
            <Link to="/shop" className="btn-k btn-k-outline btn-k-lg">
              View more artworks <ArrowUpRight size={15} />
            </Link>
          </Reveal>
        )}
      </section>

      {/* ───────── 03 PRICE ON REQUEST ─────────
          Kept apart from the buy-now grid: these start a conversation rather
          than a checkout, so mixing them into one row muddles both actions. */}
      {!loadingProd && enquiryProducts.length > 0 && (
        <section className="bg-paper-dim border-y border-rule">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
            <Reveal className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-20 items-end mb-14">
              <div>
                <div className="section-index mb-7">03 By Enquiry</div>
                <h2 className="t-display">Price on request</h2>
              </div>
              <p className="text-graphite leading-relaxed max-w-md lg:pb-2">
                One-off and larger works are quoted individually size, framing and
                shipping all move the number. Message us and you&apos;ll have a price
                the same day.
              </p>
            </Reveal>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
              {enquiryProducts.map((product, idx) => (
                <Reveal key={product.id} delay={Math.min(idx, 3) * 0.07}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-12 pt-10 border-t border-rule flex justify-center">
              <Link to="/shop" className="btn-k btn-k-outline btn-k-lg">
                View more pieces <ArrowUpRight size={15} />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* ───────── 04 CLASSES ───────── */}
      {upcomingClasses.length > 0 && (
        <section className="bg-paper-dim border-b border-rule">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <Reveal className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-20 items-end mb-12">
              <div>
                <div className="section-index mb-7">04 Classes</div>
                <RevealLines
                  as="h2"
                  className="t-display"
                  lines={['Come and paint', 'with us.']}
                />
              </div>
              <div className="flex flex-col sm:flex-row lg:justify-end items-start sm:items-end gap-6 lg:pb-2">
                <p className="text-graphite leading-relaxed max-w-sm">
                  Small groups, online or in the studio, from complete beginner
                  upwards. Seats are limited so everyone gets real time at the easel.
                </p>
                <Link to="/art-classes" className="btn-k btn-k-sm btn-k-outline shrink-0">
                  All classes <ArrowUpRight size={12} />
                </Link>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {upcomingClasses.map((c, i) => (
                <Reveal key={c.id} delay={i * 0.08} className="h-full">
                  <ClassCard item={c} bookingUrl={settings.classEnquiryUrl} compact />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────── 05 HOW A PIECE IS MADE ───────── */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <Reveal className="mb-14">
          <div className="section-index mb-7">05 In the Studio</div>
          <h2 className="t-display max-w-2xl">How a piece is made</h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-rule">
          {[
            { n: '01', t: 'Ground', b: 'Canvas stretched and primed by hand, then left to cure before a single mark is made.', Icon: EaselIcon },
            { n: '02', t: 'Underpainting', b: 'The composition blocked in tonally, so light and shadow are settled before colour arrives.', Icon: PencilIcon },
            { n: '03', t: 'Colour', b: 'Built in layers with artist-grade pigment the stage that takes the longest and decides the mood.', Icon: TubeIcon },
            { n: '04', t: 'Finish', b: 'Varnished for UV protection, signed, and packed in archival materials for the journey.', Icon: BrushIcon },
          ].map(({ n, t, b, Icon }, i) => (
            <Reveal key={n} delay={i * 0.07} className="border-r border-b border-rule p-6 sm:p-8 group">
              <div className="flex items-start justify-between mb-8">
                <span className="font-mono text-[0.66rem] text-vermillion tabular-nums">{n}</span>
                <Icon size={40} className="text-ink/25 group-hover:text-vermillion/60 transition-colors duration-500" />
              </div>
              <h3 className="t-title mb-3">{t}</h3>
              <p className="text-graphite text-[0.88rem] leading-relaxed">{b}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── 06 ARTIST ───────── */}
      <section className="bg-paper-dim border-y border-rule">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <Reveal direction="left" className="order-2 lg:order-1">
            <div className="section-index mb-7">{artist.home.sectionLabel}</div>
            <RevealLines
              as="h2"
              className="t-display mb-8"
              lines={artist.home.headingLines}
            />
            <div className="text-graphite leading-relaxed space-y-4 mb-10 max-w-lg">
              {artist.home.paragraphs.map((text, i) => (
                <p key={i}>{i === 0 ? emphasiseName(text, artist.name) : text}</p>
              ))}
            </div>
            {artist.home.ctaLabel && artist.home.ctaHref && (
              <Link to={artist.home.ctaHref} className="btn-k btn-k-outline">
                {artist.home.ctaLabel} <ArrowUpRight size={14} />
              </Link>
            )}
          </Reveal>

          <Reveal direction="right" className="order-1 lg:order-2 relative">
            <div className="absolute -inset-4 border border-rule-strong pointer-events-none hidden sm:block" aria-hidden="true" />
            <img
              src={artist.photo}
              alt={artist.photoAlt}
              className="relative w-full h-auto object-cover"
              loading="lazy"
              decoding="async"
            />
            {artist.location && (
              <div className="absolute -bottom-px -right-px bg-ink text-paper px-5 py-3">
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-paper/70">
                  {artist.location}
                </span>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* ───────── STATS hairline grid ───────── */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-rule">
          {stats.map((stat, idx) => (
            <Reveal key={stat.label} delay={idx * 0.07} className="border-r border-b border-rule p-6 sm:p-9">
              <div className="flex items-baseline gap-1 mb-3">
                <span
                  className="text-ink tabular-nums"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(2.2rem,4.5vw,3.4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
                >
                  {stat.number}
                </span>
                <span className="text-vermillion text-[1.4rem]" style={{ fontFamily: "var(--font-display)" }}>{stat.suffix}</span>
              </div>
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-slate">{stat.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── TESTIMONIALS ───────── */}
      <section className="relative bg-paper-dim border-y border-rule py-20 sm:py-28 overflow-hidden">
        <ArtSupplies tone="text-ink/[0.06]" />
        <div className="relative z-10">
          <TestimonialsCarousel />
        </div>
      </section>

      {/* ───────── CLOSING ───────── */}
      <section className="relative overflow-hidden border-b border-ink">
        <ParallaxLayer speed={0.18} className="absolute inset-0 h-full">
          <img src={artist.photo} alt="" className="w-full h-full object-cover object-top" aria-hidden="true" />
        </ParallaxLayer>
        <div className="absolute inset-0 bg-ink/78" />
        <div className="relative z-10 py-24 sm:py-32 px-4 sm:px-6 lg:px-8 on-ink">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-24 items-end">
            <Reveal>
              <div className="section-index mb-8">Commission</div>
              <RevealLines
                as="h2"
                className="t-hero text-paper"
                lines={['Your story,', 'painted by hand.']}
              />
            </Reveal>

            {/* Right column carries the practicals, so the band uses its full
                width instead of trailing off into empty black. */}
            <Reveal delay={0.15} className="lg:pb-3">
              <p className="text-paper/60 leading-relaxed mb-9 max-w-sm">
                Portraits, name signs, and gifts painted to your brief from the first
                sketch through to framed delivery.
              </p>

              <dl className="border-t border-paper/20 mb-9">
                {[
                  ['Turnaround', '2–4 weeks'],
                  ['Deposit', '50% to reserve a slot'],
                  ['Shipping', 'Worldwide, tracked'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 border-b border-paper/20">
                    <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper/45">{k}</dt>
                    <dd className="font-mono text-[0.68rem] text-paper/85">{v}</dd>
                  </div>
                ))}
              </dl>

              <Link to="/custom-order" className="btn-k btn-k-invert btn-k-lg w-full sm:w-auto">
                Start a custom order <ArrowUpRight size={15} />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
