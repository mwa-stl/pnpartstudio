import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import Reveal, { RevealLines } from "../components/motion/Reveal";
import useSiteSettings from "../hooks/useSiteSettings";
import {
  CLASS_COVER_FALLBACK, classFacts, fmtUSD, formatClassDate, hasEnded, normaliseClass,
} from "../data/classes";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

/** A titled block that renders nothing when the admin left it empty. */
const Block = ({ index, title, blurb, children, show = true }) => {
  if (!show) return null;
  return (
    <Reveal className="py-12 sm:py-16 border-b border-rule">
      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.6fr] gap-8 lg:gap-16">
        <div>
          <div className="section-index mb-5">{index}</div>
          <h2 className="t-section">{title}</h2>
          {blurb && <p className="text-graphite text-[0.9rem] leading-relaxed mt-4 max-w-xs">{blurb}</p>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </Reveal>
  );
};

const BulletList = ({ items }) => (
  <ul className="border-t border-ink">
    {items.map((t, i) => (
      <li key={`${t}-${i}`} className="flex gap-4 py-3.5 border-b border-rule">
        <span className="font-mono text-[0.62rem] text-vermillion tabular-nums pt-1 shrink-0">
          {String(i + 1).padStart(2, "0")}
        </span>
        <span className="text-graphite text-[0.95rem] leading-relaxed">{t}</span>
      </li>
    ))}
  </ul>
);

const ClassDetailPage = () => {
  const { id } = useParams();
  const settings = useSiteSettings();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const { data } = await axios.get(`${API_BASE}/api/classes/${id}`, { signal: controller.signal });
        setItem(normaliseClass(data));
      } catch (e) {
        if (!axios.isCancel(e)) {
          setErr(e?.response?.status === 404
            ? "That class is no longer listed."
            : "We couldn’t load this class. Please refresh to try again.");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-paper min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="h-6 w-40 bg-paper-deep animate-pulse mb-8" />
          <div className="h-16 w-2/3 bg-paper-deep animate-pulse mb-10" />
          <div className="aspect-[16/7] bg-paper-deep animate-pulse" />
        </div>
      </div>
    );
  }

  if (err || !item) {
    return (
      <div className="bg-paper min-h-screen">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center">
          <div className="section-index justify-center mb-7">Not Found</div>
          <h1 className="t-display mb-5">{err || "Class not found"}</h1>
          <p className="text-graphite mb-10">Have a look at what else is running this season.</p>
          <Link to="/art-classes" className="btn-k">All classes <ArrowUpRight size={13} /></Link>
        </div>
      </div>
    );
  }

  const facts = classFacts(item);
  const ended = hasEnded(item);
  const free = Number(item.price) <= 0;
  const bookingHref = item.bookingUrl || settings.classEnquiryUrl;
  const external = bookingHref?.startsWith("http");

  // Everything the admin filled in beyond the basics.
  const hasDetail =
    item.overview.length || item.learn.length || item.materials.length ||
    item.requirements.length || item.syllabus.length || item.faqs.length;

  const spec = [
    item.level && ["Level", item.level],
    item.durationWeeks > 0 && ["Duration", `${item.durationWeeks} week${item.durationWeeks === 1 ? "" : "s"}`],
    item.sessionCount > 0 && ["Sessions", String(item.sessionCount)],
    item.sessionLength && ["Session length", item.sessionLength],
    item.ageGroup && ["Ages", item.ageGroup],
    item.language && ["Language", item.language],
    item.instructor && ["Taught by", item.instructor],
    item.endDate && ["Ends", formatClassDate(item.endDate)],
  ].filter(Boolean);

  return (
    <div className="bg-paper min-h-screen">
      {/* Masthead */}
      <section className="border-b border-ink">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <Link to="/art-classes" className="link-k font-mono text-[0.62rem] uppercase tracking-[0.14em] inline-flex items-center gap-2 mb-10">
            <ArrowLeft size={13} /> All classes
          </Link>

          {/* `items-start`, not `items-end`: the booking panel is much taller
              than a short title, and bottom-aligning both left a hole above
              the headline. */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-8 lg:gap-16 items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-7">
                <span className={ended ? "badge-status badge-ended" : "badge-status badge-live"}>
                  {ended ? "Session ended" : "Booking open"}
                </span>
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-slate">
                  {item.mode === "Online" ? "Online live" : "In studio"}
                </span>
                {item.level && (
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-vermillion">
                    {item.level}
                  </span>
                )}
              </div>

              <RevealLines as="h1" className="t-hero !text-[clamp(2.2rem,5.6vw,4.6rem)]" lines={[item.title]} />

              <p className="text-graphite leading-relaxed max-w-xl mt-7 text-[1.02rem]">
                {item.summary || (
                  ended
                    ? "This session has finished. Get in touch and we will tell you when it runs again."
                    : "Small groups, real time at the easel, and everything you need to finish a piece you are happy with."
                )}
              </p>

              {item.highlights.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8 max-w-xl">
                  {item.highlights.map((h) => (
                    <span key={h} className={`tag-k ${h.length > 26 ? "tag-k-wrap" : ""}`}>{h}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Booking panel */}
            <Reveal delay={0.12} className="border border-ink bg-paper">
              <div className="flex items-baseline justify-between gap-4 px-6 py-5 border-b border-ink">
                <span className="label-mono">{free ? "Price" : "From"}</span>
                <span
                  className={`tabular-nums leading-none ${free ? "text-ink" : ended ? "text-graphite" : "text-vermillion"}`}
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "clamp(1.9rem,3.4vw,2.6rem)", letterSpacing: "-0.025em" }}
                >
                  {free ? "Free" : fmtUSD.format(Number(item.price))}
                </span>
              </div>

              <dl className="px-6 pt-4">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5 border-b border-rule last:border-b-0">
                    <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-slate pt-1">{k}</dt>
                    <dd className="text-[0.88rem] text-ink text-right">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="p-6 pt-5">
                {ended ? (
                  <>
                    <span className="btn-k btn-k-ghost w-full !cursor-default opacity-60" aria-disabled="true">
                      Session ended
                    </span>
                    <p className="text-[0.8rem] text-graphite mt-4 text-center">
                      New dates are added regularly — <Link to="/contact" className="link-k">ask to be notified</Link>.
                    </p>
                  </>
                ) : bookingHref ? (
                  <a
                    href={bookingHref}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="btn-k w-full"
                  >
                    Reserve a seat <ArrowUpRight size={14} />
                  </a>
                ) : (
                  <Link to="/contact" className="btn-k w-full">
                    Ask about this class <ArrowUpRight size={14} />
                  </Link>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Cover */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <Reveal>
          <div className="border border-rule overflow-hidden bg-paper-deep">
            <img
              src={item.cover || CLASS_COVER_FALLBACK}
              alt={item.title}
              className={`w-full max-h-[560px] object-cover ${ended ? "is-ended-cover" : ""}`}
              loading="eager"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = CLASS_COVER_FALLBACK; }}
            />
          </div>
        </Reveal>
      </section>

      {/* Detail */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <Block index="At a glance" title="The essentials" show={spec.length > 0}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 border-t border-l border-rule">
            {spec.map(([k, v]) => (
              <div key={k} className="border-r border-b border-rule p-5">
                <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-slate mb-2">{k}</dt>
                <dd className="text-ink text-[0.98rem]">{v}</dd>
              </div>
            ))}
          </dl>
        </Block>

        <Block index="Overview" title="About this class" show={item.overview.length > 0}>
          <div className="text-graphite leading-[1.8] space-y-5 text-[1.02rem] max-w-2xl">
            {item.overview.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </Block>

        <Block index="Outcomes" title="What you'll learn" show={item.learn.length > 0}>
          <BulletList items={item.learn} />
        </Block>

        <Block index="Session plan" title="How the course runs" show={item.syllabus.length > 0}>
          <div className="border-t border-ink">
            {item.syllabus.map((s, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[auto_1fr_1.5fr] gap-x-8 gap-y-2 items-baseline py-6 border-b border-rule">
                <span className="font-mono text-[0.64rem] text-vermillion uppercase tracking-[0.12em] whitespace-nowrap">
                  {s.label || `Session ${i + 1}`}
                </span>
                <h3 className="t-title !text-[1.05rem]">{s.title}</h3>
                <p className="text-graphite text-[0.92rem] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </Block>

        <Block index="Materials" title="What you need" show={item.materials.length > 0 || item.requirements.length > 0}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {item.materials.length > 0 && (
              <div>
                <div className="label-mono mb-3">Materials</div>
                <BulletList items={item.materials} />
              </div>
            )}
            {item.requirements.length > 0 && (
              <div>
                <div className="label-mono mb-3">Before you join</div>
                <BulletList items={item.requirements} />
              </div>
            )}
          </div>
        </Block>

        <Block index="Gallery" title="From this class" show={item.gallery.length > 0}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {item.gallery.map((src, i) => (
              <div key={`${src}-${i}`} className="border border-rule overflow-hidden bg-paper-deep aspect-square">
                <img src={src} alt="" loading="lazy" className="w-full h-full object-cover hover:scale-[1.04] transition-transform duration-700" />
              </div>
            ))}
          </div>
        </Block>

        <Block index="Questions" title="Good to know" show={item.faqs.length > 0}>
          <div className="border-t border-ink">
            {item.faqs.map((f, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr] gap-5 sm:gap-8 py-6 border-b border-rule">
                <span className="font-mono text-[0.62rem] text-vermillion tabular-nums pt-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="t-title !text-[1.02rem] mb-2">{f.q}</h3>
                  <p className="text-graphite text-[0.92rem] leading-relaxed max-w-2xl">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </Block>

        {!hasDetail && (
          <div className="py-16 border-b border-rule">
            <p className="text-graphite max-w-xl">
              More detail for this class is on the way. In the meantime,{" "}
              <Link to="/contact" className="link-k">ask us anything</Link> — we answer quickly.
            </p>
          </div>
        )}
      </div>

      {/* Closing */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-24 items-end">
          <Reveal>
            <div className="section-index mb-8">Next Step</div>
            <RevealLines as="h2" className="t-display" lines={["Bring a brush.", "We'll do the rest."]} />
          </Reveal>
          <Reveal delay={0.15} className="lg:pb-3">
            <p className="text-graphite mb-9 leading-relaxed max-w-sm">
              Seats are limited so everyone gets real time with the instructor.
              Booking early is the only way to be sure of a place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {!ended && bookingHref && (
                <a
                  href={bookingHref}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="btn-k"
                >
                  Reserve a seat <ArrowUpRight size={14} />
                </a>
              )}
              <Link to="/art-classes" className="btn-k btn-k-outline">See all classes</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default ClassDetailPage;
