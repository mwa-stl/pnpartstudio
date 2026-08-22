import React from "react";
import { Link } from "react-router-dom";
import Reveal, { RevealLines } from "./motion/Reveal";

/* Shared chrome for the four long-form policy pages (Terms, Privacy,
   Returns, Shipping). Readability first: one measured column, generous
   leading, hairline rules doing all the separating. */

export const Section = ({ title, children }) => (
  <section className="mt-12 first:mt-0 grid grid-cols-1 md:grid-cols-[minmax(0,180px)_1fr] gap-x-10 gap-y-4">
    <h2 className="t-title !text-[1.02rem] md:sticky md:top-28 md:self-start bg-paper">{title}</h2>
    <div className="text-graphite leading-[1.8] text-[0.95rem] space-y-4">{children}</div>
  </section>
);

export const Bullets = ({ items, ordered = false }) => {
  const List = ordered ? "ol" : "ul";
  return (
    <List className={`${ordered ? "list-decimal" : "list-disc"} pl-5 space-y-2 marker:text-vermillion`}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </List>
  );
};

export const InlineLink = ({ to, href, children }) =>
  to ? (
    <Link to={to} className="link-k font-medium">{children}</Link>
  ) : (
    <a href={href} className="link-k font-medium">{children}</a>
  );

export const Note = ({ children }) => (
  <aside className="mt-16 border-t border-ink pt-6 flex gap-5">
    <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-vermillion shrink-0 pt-1">Note</span>
    <p className="text-[0.88rem] text-graphite leading-relaxed">{children}</p>
  </aside>
);

const LegalLayout = ({ title, eyebrow = "Policies", lastUpdated, intro, children }) => (
  <div className="bg-paper min-h-screen">
    {/* Masthead */}
    <div className="border-b border-ink">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="section-index mb-8">{eyebrow}</div>
        <RevealLines as="h1" className="t-display mb-8" lines={[title]} />
        {lastUpdated && (
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate">
            Last updated {lastUpdated}
          </p>
        )}
      </div>
    </div>

    {/* Body */}
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <Reveal>
        {intro && (
          <p className="text-ink text-[1.15rem] leading-[1.65] mb-14 pb-14 border-b border-rule max-w-3xl"
             style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}>
            {intro}
          </p>
        )}
        {children}
      </Reveal>
    </div>
  </div>
);

export default LegalLayout;
