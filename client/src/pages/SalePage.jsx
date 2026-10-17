import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import useAnnouncements from "../hooks/useAnnouncements";
import ProductCard from "../components/ProductCard";
import Countdown from "../components/Countdown";
import Reveal, { RevealLines } from "../components/motion/Reveal";
import { readableOn } from "../utils/color";

const KIND_LABEL = {
  festival: "Festival offer",
  clearance: "Clearance sale",
  seasonal: "Seasonal sale",
  flash: "Flash sale",
  custom: "Announcement",
};

const pct = (p) => (p.salePrice && p.price > p.salePrice ? Math.round((1 - p.salePrice / p.price) * 100) : 0);

const Grid = ({ products }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
    {products.map((p, i) => (
      <Reveal key={p.id} delay={Math.min(i, 8) * 0.04} className="h-full">
        <ProductCard product={p} />
      </Reveal>
    ))}
  </div>
);

/** One announcement: coloured masthead with the countdown, then its products. */
const SaleSection = ({ a, headingTag = "h2", onEnd }) => {
  const fg = readableOn(a.accent);
  const best = Math.max(0, ...a.products.map(pct));
  return (
    <section aria-label={a.title}>
      <div className="relative overflow-hidden border-b border-ink" style={{ background: a.accent, color: fg }}>
        {a.bannerImage && (
          <>
            <img src={a.bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover" decoding="async" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${a.accent} 0%, ${a.accent}E0 45%, ${a.accent}40 100%)` }} />
          </>
        )}
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="font-mono text-[0.62rem] uppercase tracking-[0.2em] opacity-85 mb-6 flex items-center gap-3 flex-wrap">
            <span className="sale-dot" style={{ background: fg }} aria-hidden="true" />
            {KIND_LABEL[a.kind] || KIND_LABEL.custom}
            <Countdown to={a.endsAt} prefix="· Ends in" onEnd={onEnd} />
          </div>
          <RevealLines as={headingTag} className="t-hero !text-inherit" lines={[a.title]} />
          {a.badgeText && <p className="t-quote !text-inherit mt-5">{a.badgeText}</p>}
          {a.description && <p className="max-w-2xl leading-relaxed opacity-90 mt-6">{a.description}</p>}
          {best > 0 && (
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] mt-7 opacity-90">
              {a.products.length} piece{a.products.length === 1 ? "" : "s"} · save up to {best}%
            </p>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {a.products.length ? (
          <Grid products={a.products} />
        ) : (
          <p className="text-graphite">The pieces for this offer are being added — check back shortly.</p>
        )}
      </div>
    </section>
  );
};

const Empty = ({ missing }) => (
  <div className="min-h-[70vh] flex items-center bg-paper px-4 sm:px-6 lg:px-8 py-24">
    <div className="max-w-[1600px] mx-auto w-full">
      <Reveal className="max-w-xl">
        <div className="section-index mb-8">{missing ? "Offer not running" : "No offers right now"}</div>
        <RevealLines as="h1" className="t-display mb-7" lines={missing ? ["This offer has", "ended."] : ["Nothing on sale", "at the moment."]} />
        <p className="mb-10 text-graphite leading-relaxed">
          Special offers appear here for festivals, clearances and flash sales. Browse the full collection in the meantime.
        </p>
        <Link to="/shop" className="btn-k">Browse artworks <ArrowUpRight size={13} /></Link>
      </Reveal>
    </div>
  </div>
);

/**
 * /sale        — every live offer, one section each
 * /sale/:slug  — a single offer
 * Data comes from the shared announcements context, so there is no second
 * request and the prices are the same ones the cart and checkout use.
 */
const SalePage = () => {
  const { slug } = useParams();
  const { items, loading, refresh } = useAnnouncements();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-paper" role="status" aria-label="Loading offers">
        <span className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-slate">Loading offers…</span>
      </div>
    );
  }

  const list = slug ? items.filter((a) => a.slug === slug) : items;
  if (!list.length) return <Empty missing={Boolean(slug)} />;

  return (
    <div className="bg-paper">
      {list.map((a, i) => (
        <SaleSection key={a._id} a={a} headingTag={i === 0 ? "h1" : "h2"} onEnd={refresh} />
      ))}
      {slug && items.length > 1 && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <Link to="/sale" className="btn-k btn-k-outline">See all offers <ArrowUpRight size={13} /></Link>
        </div>
      )}
    </div>
  );
};

export default SalePage;
