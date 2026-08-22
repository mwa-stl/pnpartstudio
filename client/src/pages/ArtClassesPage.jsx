import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import axios from "axios";
import Reveal, { RevealLines } from "../components/motion/Reveal";
import ClassCard from "../components/ClassCard";
import usePageHero from "../hooks/usePageHero";
import useSiteSettings from "../hooks/useSiteSettings";
import { hasEnded, normaliseClass } from "../data/classes";
import artvideo from "../assets/art_classes_video.mp4";

// Used when neither the class nor the studio settings name a booking link.
const ENQUIRY_URL = "https://docs.google.com/forms/d/e/1FAIpQLScHGdiGiQwG06LCjQ0BYfLw0QU8_wI9LoM_b4RE2YAJ6_z1RQ/viewform";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const features = [
  { n: "01", title: "Guided techniques", text: "Step-by-step demos and personalised feedback on your work." },
  { n: "02", title: "Small cohorts", text: "Limited seats, so there's real time with the instructor." },
  { n: "03", title: "Materials guidance", text: "A pre-class materials list, with budget alternatives." },
];

const ArtClassesPage = () => {
  const hero = usePageHero("art-classes");
  const settings = useSiteSettings();
  const [mode, setMode] = useState("online");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/classes`, {
          withCredentials: true,
          signal: controller.signal,
        });
        const arr = Array.isArray(res.data?.items) ? res.data.items : [];
        setItems(arr);
        setErr("");
      } catch (e) {
        if (!axios.isCancel(e)) setErr("We couldn’t load the class schedule. Please refresh to try again.");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const mapped = useMemo(() => (items || []).map(normaliseClass), [items]);

  // Open sessions first, soonest at the top; finished ones fall to the back
  // rather than disappearing, so the schedule still shows what has run.
  const byStatusThenDate = (a, b) => {
    const ended = Number(hasEnded(a)) - Number(hasEnded(b));
    if (ended !== 0) return ended;
    return String(a.startDate).localeCompare(String(b.startDate));
  };

  const onlineSessions = useMemo(
    () => mapped.filter((s) => s.mode === "Online" && s.published).sort(byStatusThenDate),
    [mapped]
  );
  const offlineSessions = useMemo(
    () => mapped.filter((s) => s.mode !== "Online" && s.published).sort(byStatusThenDate),
    [mapped]
  );
  const sessions = mode === "online" ? onlineSessions : offlineSessions;

  const toggle = (value, label, count) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      className={`px-6 py-3 font-mono text-[0.66rem] uppercase tracking-[0.14em] border transition-colors duration-300 ${
        mode === value
          ? "bg-ink text-paper border-ink"
          : "bg-transparent text-graphite border-rule-strong hover:border-ink hover:text-ink"
      }`}
    >
      {label} <span className="opacity-50 tabular-nums">({String(count).padStart(2, "0")})</span>
    </button>
  );

  return (
    <div className="bg-paper min-h-screen">
      {/* Masthead + film */}
      <section className="border-b border-ink">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-center">
            <div>
              <div className="section-index mb-8">{hero.sectionLabel}</div>
              <RevealLines as="h1" className="t-hero mb-8" lines={hero.headingLines} />
              {hero.intro && (
                <p className="text-graphite leading-relaxed max-w-md mb-8">{hero.intro}</p>
              )}
              {hero.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {hero.tags.map(t => <span key={t} className="tag-k">{t}</span>)}
                </div>
              )}
            </div>

            <Reveal direction="right" className="relative">
              <div className="absolute -inset-4 border border-rule pointer-events-none hidden sm:block" aria-hidden="true" />
              <video
                src={artvideo}
                autoPlay muted loop playsInline preload="metadata"
                className="relative w-full h-full object-cover min-h-[300px] max-h-[440px]"
                aria-label="Art class in progress"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* What's included index rows */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="border-t border-ink">
          {features.map(({ n, title, text }, i) => (
            <Reveal key={title} delay={i * 0.08}>
              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1.6fr] gap-x-8 gap-y-2 items-baseline py-7 border-b border-rule">
                <span className="font-mono text-[0.66rem] text-vermillion tabular-nums">{n}</span>
                <h2 className="t-section !text-[1.35rem]">{title}</h2>
                <p className="text-graphite text-[0.95rem] leading-relaxed">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Schedule */}
      <section className="bg-paper-dim border-y border-rule py-16 sm:py-24">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="flex flex-wrap items-end justify-between gap-8 mb-12">
            <div>
              <div className="section-index mb-7">Schedule</div>
              <h2 className="t-display">Upcoming sessions</h2>
            </div>
            <div className="flex" role="group" aria-label="Class delivery mode">
              {toggle("online", "Online", onlineSessions.length)}
              {toggle("offline", "Studio", offlineSessions.length)}
            </div>
          </Reveal>

          {err && (
            <div role="alert" className="border border-vermillion bg-vermillion-wash px-5 py-4 mb-10 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-vermillion-dark text-center">
              {err}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-rule bg-paper">
                  <div className="h-[210px] bg-paper-deep animate-pulse" />
                  <div className="p-5 space-y-3 border-t border-rule">
                    <div className="h-4 bg-paper-deep animate-pulse w-2/3" />
                    <div className="h-3 bg-paper-deep animate-pulse w-full" />
                    <div className="h-3 bg-paper-deep animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-20">
              <p className="t-section mb-4">
                No {mode === "online" ? "online" : "studio"} sessions scheduled
              </p>
              <p className="text-graphite mb-9">New dates are added regularly get in touch to be notified first.</p>
              <Link to="/contact" className="btn-k">Ask about dates <ArrowUpRight size={13} /></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sessions.map((session, idx) => (
                <Reveal key={session.id} delay={Math.min(idx, 4) * 0.07} className="h-full">
                  <ClassCard item={session} bookingUrl={settings.classEnquiryUrl || ENQUIRY_URL} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Curriculum by level */}
      <section className="bg-paper-dim border-y border-rule py-16 sm:py-24">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-20 items-end mb-14">
            <div>
              <div className="section-index mb-7">Curriculum</div>
              <h2 className="t-display">What you&apos;ll learn</h2>
            </div>
            <p className="text-graphite leading-relaxed max-w-md lg:pb-2">
              Levels are a guide, not a gate. If you&apos;ve painted before but it was
              years ago, start at beginner the fundamentals are worth revisiting and
              you&apos;ll move up quickly.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[
              {
                level: 'Beginner',
                blurb: 'No experience assumed. By the end you will have finished a piece you are happy to hang.',
                points: ['Holding and loading a brush', 'Colour mixing from a limited palette', 'Value before colour', 'Simple composition rules', 'Caring for your materials'],
              },
              {
                level: 'Intermediate',
                blurb: 'For anyone comfortable with the basics who wants their work to look more resolved.',
                points: ['Layering and glazing', 'Edges: hard, soft and lost', 'Colour temperature', 'Working from photographs', 'Knowing when a piece is finished'],
              },
              {
                level: 'Advanced',
                blurb: 'Focused on developing a personal voice rather than following a demo.',
                points: ['Building a series', 'Palette as signature', 'Large-format handling', 'Varnishing and archival care', 'Photographing your work'],
              },
            ].map(({ level, blurb, points }, i) => (
              <Reveal key={level} delay={i * 0.08} className="bg-paper border border-rule p-6 sm:p-8 flex flex-col">
                <div className="flex items-baseline justify-between gap-3 mb-5">
                  <h3 className="t-section !text-[1.5rem]">{level}</h3>
                  <span className="font-mono text-[0.62rem] text-vermillion tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-graphite text-[0.9rem] leading-relaxed mb-6">{blurb}</p>
                <ul className="border-t border-rule mt-auto">
                  {points.map(pt => (
                    <li key={pt} className="flex gap-3 py-2.5 border-b border-rule text-[0.86rem] text-graphite">
                      <span className="text-vermillion shrink-0" aria-hidden="true">—</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Materials + how a session runs */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <Reveal>
            <div className="section-index mb-7">Materials</div>
            <h2 className="t-display mb-4">What to bring</h2>
            <p className="text-graphite leading-relaxed mb-9 max-w-md">
              Studio sessions include everything. For online classes you&apos;ll get a
              materials list a week ahead, with budget alternatives for each item.
            </p>
            <ul className="border-t border-ink">
              {[
                ['Studio sessions', 'Nothing paints, brushes, surfaces and aprons are all provided.'],
                ['Online sessions', 'A basic acrylic set, three brush sizes, and any primed surface.'],
                ['Optional', 'A sketchbook. Most of the thinking happens there rather than on canvas.'],
              ].map(([t, b]) => (
                <li key={t} className="py-4 border-b border-rule">
                  <div className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-vermillion mb-2">{t}</div>
                  <p className="text-graphite text-[0.9rem] leading-relaxed">{b}</p>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="section-index mb-7">The Session</div>
            <h2 className="t-display mb-4">How a class runs</h2>
            <p className="text-graphite leading-relaxed mb-9 max-w-md">
              Two hours, same shape every time enough structure to make progress,
              enough room to follow what interests you.
            </p>
            <ol className="border-t border-ink">
              {[
                ['00:00', 'Warm-up', 'Loose gesture work to get the hand moving before anything precious starts.'],
                ['00:20', 'Demonstration', 'The technique of the day, broken down slowly and repeated on request.'],
                ['00:40', 'Painting time', 'The bulk of the session, with one-to-one feedback as you work.'],
                ['01:40', 'Review', 'We put the work up together and talk about what is working and why.'],
              ].map(([time, t, b]) => (
                <li key={time} className="grid grid-cols-[auto_1fr] gap-5 py-4 border-b border-rule">
                  <span className="font-mono text-[0.66rem] text-vermillion tabular-nums pt-0.5">{time}</span>
                  <span>
                    <span className="block t-title !text-[1rem] mb-1">{t}</span>
                    <span className="block text-graphite text-[0.88rem] leading-relaxed">{b}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Class FAQ */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Reveal>
          <div className="section-index mb-7">Good to Know</div>
          <h2 className="t-display mb-12">Class questions</h2>

          <div className="border-t border-ink">
            {[
              ['How many people are in a class?', 'Six at most in the studio, eight online. Small enough that everyone gets looked at properly.'],
              ['What ages do you teach?', 'From about eight upwards. Children and adults are scheduled separately so the pace suits the room.'],
              ['I have never painted. Is that a problem?', 'No most people arrive that way. Beginner sessions assume nothing at all.'],
              ['Can I book a one-off rather than a course?', 'Yes. Single sessions are welcome, though techniques build across weeks if you can commit.'],
              ['What if I miss a week?', 'Tell us in advance and we will fit you into another session at no extra cost where there is space.'],
              ['Do online classes get recorded?', 'The demonstration is recorded and shared afterwards. The feedback portion is not, for privacy.'],
            ].map(([q, a], i) => (
              <div key={q} className="grid grid-cols-[auto_1fr] gap-5 sm:gap-8 py-6 border-b border-rule">
                <span className="font-mono text-[0.62rem] text-vermillion tabular-nums pt-1">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="t-title !text-[1.02rem] mb-2">{q}</h3>
                  <p className="text-graphite text-[0.9rem] leading-relaxed max-w-2xl">{a}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-24 items-end">
          <Reveal>
            <div className="section-index mb-8">Private Sessions</div>
            <RevealLines as="h2" className="t-display" lines={['Want a class built', 'around you?']} />
          </Reveal>

          <Reveal delay={0.15} className="lg:pb-3">
            <p className="text-graphite mb-9 leading-relaxed max-w-sm">
              One-to-one tuition, group bookings, and birthday workshops are all possible.
              Tell us what you have in mind.
            </p>

            <dl className="border-t border-rule mb-9">
              {[
                ['Format', 'One-to-one or group'],
                ['Ages', 'Children and adults'],
                ['Where', 'Studio or online'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3 border-b border-rule">
                  <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-slate">{k}</dt>
                  <dd className="font-mono text-[0.68rem] text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            <Link to="/contact" className="btn-k w-full sm:w-auto">Get in touch <ArrowUpRight size={14} /></Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default ArtClassesPage;
