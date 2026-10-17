import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import useAnnouncements from "../hooks/useAnnouncements";
import Countdown from "./Countdown";
import Reveal from "./motion/Reveal";
import { readableOn } from "../utils/color";

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const KIND_LABEL = {
  festival: "Festival offer",
  clearance: "Clearance sale",
  seasonal: "Seasonal sale",
  flash: "Flash sale",
  custom: "Announcement",
};

const pct = (p) => (p.salePrice && p.price > p.salePrice ? Math.round((1 - p.salePrice / p.price) * 100) : 0);

/**
 * Home-page banner for each live announcement that wants one. The accent
 * colour is the announcement's own, so a Diwali sale and a clearance sale
 * look different. Shows up to three of the discounted pieces as a teaser.
 */
const SaleBanner = () => {
  const { items, refresh } = useAnnouncements();
  const banners = items.filter((a) => a.showBanner).slice(0, 2);
  if (!banners.length) return null;

  return (
    <div>
      {banners.map((a) => {
        const fg = readableOn(a.accent);
        const teaser = a.products.filter((p) => p.salePrice).slice(0, 3);
        const best = Math.max(0, ...a.products.map(pct));
        return (
          <section
            key={a._id}
            className="relative overflow-hidden border-y border-ink"
            style={{ background: a.accent, color: fg }}
            aria-label={a.title}
          >
            {a.bannerImage && (
              <>
                <img src={a.bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${a.accent} 0%, ${a.accent}E6 38%, ${a.accent}33 100%)` }} />
              </>
            )}

            <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
              <Reveal>
                <div className="font-mono text-[0.62rem] uppercase tracking-[0.2em] opacity-80 mb-5 flex items-center gap-3 flex-wrap">
                  <span className="sale-dot" style={{ background: fg }} aria-hidden="true" />
                  {KIND_LABEL[a.kind] || KIND_LABEL.custom}
                  <Countdown to={a.endsAt} prefix="· Ends in" onEnd={refresh} />
                </div>
                <h2 className="t-display !text-inherit mb-4">{a.title}</h2>
                {a.badgeText && (
                  <p className="t-quote !text-inherit mb-5" style={{ fontSize: "clamp(1.3rem, 2.6vw, 2rem)" }}>{a.badgeText}</p>
                )}
                {a.description && <p className="max-w-xl leading-relaxed opacity-90 mb-8">{a.description}</p>}
                <Link
                  to={`/sale/${a.slug}`}
                  className="inline-flex items-center gap-2 px-6 py-3.5 font-mono text-[0.68rem] uppercase tracking-[0.16em] transition-transform duration-300 hover:-translate-y-0.5"
                  style={{ background: fg, color: a.accent }}
                >
                  {a.ctaLabel || "Shop the sale"} <ArrowUpRight size={14} />
                </Link>
                {best > 0 && (
                  <span className="ml-5 font-mono text-[0.66rem] uppercase tracking-[0.14em] opacity-85">Save up to {best}%</span>
                )}
              </Reveal>

              {teaser.length > 0 && (
                <Reveal delay={0.1}>
                  <ul className="grid grid-cols-3 gap-3 sm:gap-5">
                    {teaser.map((p) => (
                      <li key={p.id}>
                        <Link to={`/product-details?id=${encodeURIComponent(p.id)}`} className="block group">
                          <div className="relative aspect-square overflow-hidden bg-black/10 border" style={{ borderColor: `${fg}55` }}>
                            {p.image && (
                              <img src={p.image} alt={p.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" decoding="async" />
                            )}
                            <span className="absolute top-0 left-0 px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.12em]" style={{ background: fg, color: a.accent }}>
                              −{pct(p)}%
                            </span>
                          </div>
                          <div className="mt-2.5 font-mono text-[0.72rem] tabular-nums">
                            <span className="font-semibold">{fmtUSD.format(p.salePrice)}</span>{" "}
                            <span className="line-through opacity-65">{fmtUSD.format(p.price)}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default SaleBanner;
