import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Reveal, { RevealLines } from '../components/motion/Reveal';
import ParallaxLayer from '../components/motion/ParallaxLayer';
import ArtSupplies from '../components/ArtSupplies';
import useArtistProfile from '../hooks/useArtistProfile';

const achievements = [
  { number: '50', suffix: '+', label: 'Awards won' },
  { number: '500', suffix: '+', label: 'Artworks created' },
  { number: '1000', suffix: '+', label: 'Students taught' },
  { number: '5000', suffix: '+', label: 'Art lovers reached' }
];

const pressFeatures = [
  { n: '01', publication: 'Art Today Magazine', title: 'Rising Stars in Contemporary Art', year: 2023, quote: 'A unique voice that bridges traditional techniques with modern expression.' },
  { n: '02', publication: 'Creative Quarterly', title: 'Workshop Innovation in Art Education', year: 2022, quote: 'Transforming how art is taught and experienced by new generations.' },
  { n: '03', publication: 'Gallery Times', title: 'Emerging Artists to Watch', year: 2021, quote: 'Exceptional talent with a gift for capturing emotion through colour.' }
];

const principles = [
  {
    n: '01',
    title: 'Mission',
    body: 'To create meaningful connections between art and people bringing joy, inspiration, and beauty into every home through original, handcrafted artworks that tell stories and evoke emotion.'
  },
  {
    n: '02',
    title: 'Vision',
    body: 'To become a platform where art enthusiasts discover unique, authentic pieces while supporting independent artists and fostering a vibrant creative community.'
  }
];

const AboutPage = () => {
  // Masthead and bio copy are edited in the admin console (Site content →
  // Artist profile); the same document also drives the home page band.
  const artist = useArtistProfile();

  return (
  <div className="bg-paper min-h-screen overflow-x-clip">

    {/* Masthead */}
    <section className="border-b border-ink">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 lg:gap-24 items-end">
          <div>
            <div className="section-index mb-8">{artist.about.sectionLabel}</div>
            <RevealLines
              as="h1"
              className="t-hero"
              lines={artist.about.headingLines}
            />
          </div>

          <Reveal delay={0.15} className="lg:pb-3">
            <p className="text-graphite leading-relaxed mb-8 max-w-sm">
              {artist.about.intro}
            </p>
            <dl className="border-t border-rule">
              {artist.about.details.map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4 py-3 border-b border-rule">
                  <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-slate">{label}</dt>
                  <dd className="font-mono text-[0.68rem] text-ink text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <div className="flex flex-wrap gap-2 mt-12">
          {artist.about.tags.map(t => <span key={t} className="tag-k">{t}</span>)}
        </div>
      </div>
    </section>

    {/* Bio */}
    <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-start">
        <Reveal direction="left" className="lg:sticky lg:top-28 lg:self-start bg-paper">
          <div className="relative">
            <div className="absolute -inset-4 border border-rule pointer-events-none hidden sm:block" aria-hidden="true" />
            <img
              src={artist.photo}
              alt={artist.photoAlt}
              className="relative w-full h-auto object-cover"
              loading="eager"
            />
            <div className="absolute -bottom-px -left-px bg-ink text-paper px-4 py-2.5">
              <span className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-paper/75">
                {[artist.name, artist.role].filter(Boolean).join(' ')}
              </span>
            </div>
          </div>

          {/* Rating strip */}
          <div className="flex items-center justify-between border border-rule mt-6 px-5 py-4">
            <div>
              <div className="font-mono text-[1.15rem] text-vermillion tabular-nums">
                {artist.about.ratingScore}
                <span className="text-slate text-[0.8rem]">{artist.about.ratingOutOf}</span>
              </div>
              <div className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-slate mt-1">{artist.about.ratingLabel}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[1.15rem] text-ink tabular-nums">{artist.about.customersCount}</div>
              <div className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-slate mt-1">{artist.about.customersLabel}</div>
            </div>
          </div>
        </Reveal>

        <Reveal direction="right">
          <div className="text-graphite leading-[1.8] space-y-6 text-[1.02rem] max-w-xl">
            <p className="text-ink text-[1.3rem] leading-[1.5]" style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}>
              {artist.about.lead}
            </p>
            {artist.about.paragraphs.map((text, i) => <p key={i}>{text}</p>)}
          </div>

          {/* Principles */}
          <div className="border-t border-ink mt-14">
            {principles.map(({ n, title, body }, i) => (
              <Reveal key={title} delay={i * 0.1} className="grid grid-cols-[auto_1fr] gap-6 py-8 border-b border-rule">
                <span className="font-mono text-[0.66rem] text-vermillion tabular-nums">{n}</span>
                <div>
                  <h2 className="t-section !text-[1.5rem] mb-3">{title}</h2>
                  <p className="text-graphite leading-relaxed text-[0.95rem]">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </div>
    </section>

    {/* Journey a plain dated index, no cards */}
    <section className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 overflow-hidden">
      <ArtSupplies tone="text-ink/[0.05]" />
      <div className="relative z-10">
        <Reveal className="mb-12">
          <div className="section-index mb-7">The Journey</div>
          <h2 className="t-display max-w-2xl">From a father&apos;s hobby to a working studio</h2>
        </Reveal>

        <div className="border-t border-ink">
          {[
            { year: 'Childhood', title: 'First colours', body: 'Watching my father paint as a hobby the first time I understood that colour could hold a feeling.' },
            { year: '2014', title: 'Teaching begins', body: 'Started guiding small groups, and found that explaining a technique is the fastest way to truly learn it.' },
            { year: '2018', title: 'First commissions', body: 'Portraits and name signs for families work made for one specific wall and one specific story.' },
            { year: 'Today', title: 'The studio', body: 'Originals, commissions, and classes running side by side from Ballwin, Missouri, shipping worldwide.' },
          ].map(({ year, title, body }, i) => (
            <Reveal key={year} delay={i * 0.07}>
              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1.5fr] gap-x-8 gap-y-2 items-baseline py-7 border-b border-rule">
                <span className="font-mono text-[0.66rem] text-vermillion tracking-[0.12em] uppercase whitespace-nowrap">{year}</span>
                <h3 className="t-section !text-[1.35rem]">{title}</h3>
                <p className="text-graphite text-[0.95rem] leading-relaxed">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* Pull quote a breath between the timeline and the numbers */}
    <section className="bg-ink on-ink border-y border-ink">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <Reveal className="max-w-4xl">
          <div className="section-index mb-8">In Her Words</div>
          <RevealLines
            as="blockquote"
            className="t-quote text-paper"
            lines={[
              '“I don’t think of a finished painting as',
              'the point. The point is the hour where you',
              'stop noticing that time is passing.”',
            ]}
            stagger={0.1}
          />
          <div className="mt-10 flex items-center gap-4">
            <span className="w-10 h-px bg-vermillion" />
            <span className="font-mono text-[0.64rem] uppercase tracking-[0.2em] text-paper/60">
              On why she still teaches
            </span>
          </div>
        </Reveal>
      </div>
    </section>

    {/* Materials & technique */}
    <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        <Reveal>
          <div className="section-index mb-7">Materials</div>
          <h2 className="t-display mb-4">What goes into a piece</h2>
          <p className="text-graphite leading-relaxed mb-9 max-w-md">
            Materials are chosen so the work outlives the sale. Nothing here is
            student grade.
          </p>
          <ul className="border-t border-ink">
            {[
              ['Surfaces', 'Cotton canvas stretched over kiln-dried bars, or 300gsm cold-pressed paper for watercolour.'],
              ['Paint', 'Artist-grade acrylic and watercolour higher pigment load, so colour holds instead of dulling.'],
              ['Priming', 'Three gesso coats, sanded between, so the tooth is even before the first mark.'],
              ['Varnish', 'UV-resistant and removable, applied only once the paint has fully cured.'],
            ].map(([t, b]) => (
              <li key={t} className="py-4 border-b border-rule">
                <div className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-vermillion mb-2">{t}</div>
                <p className="text-graphite text-[0.9rem] leading-relaxed">{b}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="section-index mb-7">Teaching</div>
          <h2 className="t-display mb-4">How I teach</h2>
          <p className="text-graphite leading-relaxed mb-9 max-w-md">
            Ten years of classes have mostly taught me what not to do. These are the
            things that stuck.
          </p>
          <ol className="border-t border-ink">
            {[
              ['01', 'Confidence before technique', 'Nobody learns anything while worried about ruining the paper. Cheap materials early, on purpose.'],
              ['02', 'Show, then get out of the way', 'A demonstration should be short. The rest of the session belongs to the person painting.'],
              ['03', 'Value before colour', 'Most paintings that feel wrong have a value problem. We fix that first, every time.'],
              ['04', 'Finish things', 'A stack of abandoned starts teaches far less than one piece carried all the way through.'],
            ].map(([n, t, b]) => (
              <li key={n} className="grid grid-cols-[auto_1fr] gap-5 py-4 border-b border-rule">
                <span className="font-mono text-[0.62rem] text-vermillion tabular-nums pt-1">{n}</span>
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

    {/* Numbers hairline grid */}
    <section className="bg-ink on-ink border-y border-ink">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="section-index mb-12">By the Numbers</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-paper/15">
          {achievements.map((a, i) => (
            <Reveal key={a.label} delay={i * 0.07} className="border-r border-b border-paper/15 p-6 sm:p-9">
              <div className="flex items-baseline gap-1 mb-3">
                <span
                  className="text-paper tabular-nums"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(2.2rem,4.5vw,3.4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
                >
                  {a.number}
                </span>
                <span className="text-vermillion text-[1.4rem]" style={{ fontFamily: "var(--font-display)" }}>{a.suffix}</span>
              </div>
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-paper/45">{a.label}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* Press */}
    <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <Reveal className="mb-12">
        <div className="section-index mb-7">In the Press</div>
        <h2 className="t-display">Press &amp; recognition</h2>
      </Reveal>

      <div className="border-t border-ink">
        {pressFeatures.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.08}>
            <article className="grid grid-cols-1 md:grid-cols-[auto_1.1fr_1.4fr_auto] gap-x-8 gap-y-3 items-baseline py-8 border-b border-rule">
              <span className="font-mono text-[0.66rem] text-vermillion tabular-nums">{f.n}</span>
              <h3 className="t-section !text-[1.35rem]">{f.title}</h3>
              <blockquote className="text-graphite text-[0.95rem] leading-relaxed italic" style={{ fontFamily: "var(--font-display)" }}>
                “{f.quote}”
              </blockquote>
              <div className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-slate whitespace-nowrap md:text-right">
                {f.publication}<br />{f.year}
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>

    {/* Closing */}
    <section className="relative overflow-hidden border-t border-ink">
      <ParallaxLayer speed={0.18} className="absolute inset-0 h-full">
        <img src={artist.photo} alt="" className="w-full h-full object-cover object-top" aria-hidden="true" />
      </ParallaxLayer>
      <div className="absolute inset-0 bg-ink/78" />
      <div className="relative z-10 py-24 sm:py-32 px-4 sm:px-6 lg:px-8 on-ink">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-24 items-end">
          <Reveal>
            <div className="section-index mb-8">Start Collecting</div>
            <RevealLines
              as="h2"
              className="t-hero text-paper"
              lines={['Ready to start', 'your collection?']}
            />
          </Reveal>

          <Reveal delay={0.15} className="lg:pb-3">
            <p className="text-paper/60 mb-9 leading-relaxed max-w-sm">
              Explore the gallery, or commission a piece made for your space and your story.
            </p>

            <dl className="border-t border-paper/20 mb-9">
              {[
                ['Originals', 'One of a kind, signed'],
                ['Commissions', 'Painted to your brief'],
                ['Studio', 'Ballwin, Missouri'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3 border-b border-paper/20">
                  <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper/45">{k}</dt>
                  <dd className="font-mono text-[0.68rem] text-paper/85">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/gallery" className="btn-k btn-k-invert">Browse gallery <ArrowUpRight size={14} /></Link>
              <Link to="/custom-order" className="btn-k btn-k-invert">Commission art</Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  </div>
  );
};

export default AboutPage;
