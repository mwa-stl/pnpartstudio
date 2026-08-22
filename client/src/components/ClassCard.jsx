import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { CLASS_COVER_FALLBACK, classFacts, fmtUSD, hasEnded } from "../data/classes";

/** A tag long enough to be a sentence has to wrap instead of running off the card. */
const LONG_TAG = 26;

/**
 * One class, as a card.
 *
 * Two problems this layout exists to solve:
 *  - the mode tag and price used to sit on top of the cover, burying both
 *    whenever the artwork was a poster (most class covers are);
 *  - `object-cover` cropped those posters, cutting the dates and times
 *    printed on them. The cover is now letterboxed against a blurred copy of
 *    itself, so nothing is lost whatever shape the image is.
 */
const ClassCard = ({ item, bookingUrl, compact = false }) => {
  const facts = classFacts(item);
  const ended = hasEnded(item);
  const free = Number(item.price) <= 0;
  const href = item.bookingUrl || bookingUrl;
  const cover = item.cover || CLASS_COVER_FALLBACK;

  return (
    <article className="card-k h-full flex flex-col group bg-paper overflow-hidden">
      {/* Cover — contained, never cropped. The blurred copy behind fills the
          frame so a portrait poster does not leave two grey bars. */}
      <Link
        to={`/art-classes/${item.id}`}
        className="relative block overflow-hidden bg-paper-deep aspect-[4/3]"
        aria-label={`View details for ${item.title}`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-center bg-cover scale-110 blur-xl opacity-45"
          style={{ backgroundImage: `url("${cover}")` }}
        />
        <img
          src={cover}
          alt=""
          className={`relative w-full h-full object-contain transition-transform duration-[1100ms] group-hover:scale-[1.04] ${ended ? "is-ended-cover" : ""}`}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = CLASS_COVER_FALLBACK; }}
        />

        {/* Status — colour and motion, top-left, clear of the artwork's centre. */}
        <span className={`absolute top-2.5 left-2.5 ${ended ? "badge-status badge-ended" : "badge-status badge-live"}`}>
          {ended ? "Session ended" : "Booking open"}
        </span>
      </Link>

      {/* Price bar — the loudest element on the card. */}
      <div className="flex items-stretch border-t border-b border-ink">
        <div className="flex flex-col justify-center px-3.5 py-2.5 border-r border-ink bg-ink text-paper min-w-0">
          <span className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-paper/60">
            {item.mode === "Online" ? "Online live" : "In studio"}
          </span>
          {item.level && (
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] truncate mt-0.5">
              {item.level}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 px-4 py-2.5 ml-auto">
          {!free && (
            <span className="font-mono text-[0.54rem] uppercase tracking-[0.16em] text-slate">From</span>
          )}
          <span
            className={`tabular-nums leading-none ${free ? "text-ink" : ended ? "text-graphite" : "text-vermillion"}`}
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "clamp(1.35rem,2.4vw,1.75rem)", letterSpacing: "-0.02em" }}
          >
            {free ? "Free" : fmtUSD.format(Number(item.price))}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <h3 className="t-title !text-[1.15rem] mb-2 leading-snug">
          <Link to={`/art-classes/${item.id}`} className="hover:text-vermillion transition-colors">
            {item.title}
          </Link>
        </h3>

        {item.summary && (
          <p className="text-graphite text-[0.86rem] leading-relaxed mb-4 line-clamp-2">{item.summary}</p>
        )}

        <dl className="border-t border-rule mb-4">
          {(compact ? facts.slice(0, 3) : facts).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[76px_1fr] gap-3 py-2 border-b border-rule">
              <dt className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-slate pt-0.5">{k}</dt>
              <dd className="text-[0.84rem] text-ink break-words">{v}</dd>
            </div>
          ))}
        </dl>

        {!compact && item.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {item.highlights.slice(0, 4).map((h) => (
              <span key={h} className={`tag-k ${h.length > LONG_TAG ? "tag-k-wrap w-full" : ""}`}>
                {h}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-1">
          <Link to={`/art-classes/${item.id}`} className="btn-k btn-k-sm flex-1">
            View details <ArrowRight size={12} />
          </Link>
          {ended ? (
            <Link to="/contact" className="btn-k btn-k-sm btn-k-ghost flex-1">
              Ask for dates
            </Link>
          ) : href ? (
            <a
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="btn-k btn-k-sm btn-k-outline flex-1"
            >
              Reserve <ArrowUpRight size={12} />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default ClassCard;
