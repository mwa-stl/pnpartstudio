import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import Reveal, { RevealLines } from '../components/motion/Reveal';

const PageNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[85vh] flex items-center bg-paper px-4 sm:px-6 lg:px-8 py-24">
      <div className="max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12 lg:gap-20 items-center">

          {/* Oversized numeral */}
          <Reveal direction="left" className="order-2 lg:order-1">
            <div className="section-index mb-8">Error Not Found</div>
            <RevealLines
              as="h1"
              className="t-display mb-8"
              lines={['This page isn’t', 'in the collection.']}
            />
            <p className="text-graphite leading-relaxed max-w-md mb-10">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
              Check the address, or pick up the trail below.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link to="/" className="btn-k">Go home <ArrowUpRight size={13} /></Link>
              <Link to="/shop" className="btn-k btn-k-ghost">Browse the shop</Link>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="group inline-flex items-center gap-2 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-slate hover:text-vermillion transition-colors"
            >
              <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-1" />
              Back to previous page
            </button>

            <div className="rule mt-12 mb-6" />

            <p className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-slate">
              Still stuck? <Link to="/contact" className="link-k text-ink">Get in touch</Link>
            </p>
          </Reveal>

          <Reveal direction="right" className="order-1 lg:order-2 select-none" aria-hidden="true">
            <div
              className="text-ink leading-[0.8] text-center lg:text-right"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(7rem, 22vw, 18rem)", letterSpacing: "-0.05em" }}
            >
              4<span className="text-vermillion">0</span>4
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
};

export default PageNotFound;
