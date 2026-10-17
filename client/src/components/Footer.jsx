import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Globe, ArrowUpRight } from 'lucide-react';
import { Instagram, Facebook, Youtube } from './BrandIcons';
import axios from "axios";
import useSiteSettings from '../hooks/useSiteSettings';
import { formatAddress } from '../data/siteSettings';
import logoWhite from '../assets/pnplogowhite.png';

const year = new Date().getFullYear();

/* Social links are admin-managed, so the icon is matched by name rather than
   hardcoded alongside the URL. Anything unrecognised gets the generic mark. */
const SOCIAL_ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
};
const iconFor = (label) => SOCIAL_ICONS[String(label).toLowerCase().trim()] || Globe;

const quickLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/blog', label: 'Journal' },
  { to: '/contact', label: 'Contact' },
];

const shopLinks = [
  { to: '/shop', label: 'All Products' },
  { to: '/shop/category/paintings', label: 'Paintings' },
  { to: '/shop/category/handcrafted-items', label: 'Handcrafted' },
  { to: '/shop/category/digital-prints', label: 'Digital Prints' },
  { to: '/custom-order', label: 'Custom Orders' },
];

const legalLinks = [
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/returns', label: 'Returns' },
  { to: '/shipping', label: 'Shipping' },
];

const API_BASE = import.meta.env.VITE_API_URL || "";

const FooterLink = ({ to, children }) => (
  <Link
    to={to}
    className="group inline-flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-paper/55 hover:text-vermillion transition-colors duration-300"
  >
    <span className="w-0 group-hover:w-3 h-px bg-vermillion transition-all duration-300" />
    {children}
  </Link>
);

const Footer = () => {
  const settings = useSiteSettings();
  const addressLines = formatAddress(settings, { multiline: true });
  const [email, setEmail] = useState('');
  const [subState, setSubState] = useState({ loading: false, success: false, error: "", already: false });

  const validateEmail = (value) =>
    /^([a-z0-9._%+-]+)@(gmail\.com|yahoo\.com|hotmail\.com)$/i.test(value);

  const checkIfSubscribed = async (email) => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/newsletters/subscriber-exists`, { params: { email } });
      return !!data?.exists;
    } catch {
      return false;
    }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSubState({ loading: true, success: false, error: "", already: false });

    if (!validateEmail(email)) {
      setSubState({
        loading: false, success: false,
        error: "Enter a valid @gmail.com, @yahoo.com, or @hotmail.com address",
        already: false
      });
      return;
    }

    if (await checkIfSubscribed(email)) {
      setSubState({ loading: false, success: false, error: "", already: true });
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/newsletters/subscribe`, { email });
      setSubState({ loading: false, success: true, error: "", already: false });
      setEmail('');
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setSubState({ loading: false, success: false, error: "", already: true });
      } else if (err.response?.data?.message) {
        setSubState({ loading: false, success: false, error: err.response.data.message, already: false });
      } else {
        setSubState({ loading: false, success: false, error: "Subscription failed. Please try again.", already: false });
      }
    }
  };

  return (
    <footer className="bg-ink on-ink mt-auto">
      {/* Newsletter band */}
      <div className="border-b border-paper/12">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-20 items-end">
          <div>
            <div className="section-index mb-6">Newsletter</div>
            <h2 className="t-display text-paper max-w-lg">
              New work, class dates,<br />and the occasional studio note.
            </h2>
          </div>

          <form onSubmit={handleSubscribe} noValidate className="w-full">
            <label htmlFor="news-email" className="label-mono block mb-4">Your email address</label>
            <div className="flex items-end gap-3 border-b border-paper/35 focus-within:border-vermillion transition-colors pb-1">
              <input
                id="news-email"
                name="email"
                type="email"
                autoComplete="email"
                className="flex-1 bg-transparent border-0 text-paper text-[1.05rem] py-2 focus:outline-none placeholder:text-paper/25 min-w-0"
                placeholder="you@example.com"
                value={email}
                disabled={subState.loading}
                onChange={e => { setEmail(e.target.value); setSubState({ loading: false, success: false, error: "", already: false }); }}
                aria-describedby="news-status"
                required
              />
              <button
                type="submit"
                disabled={subState.loading}
                className="shrink-0 flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-paper hover:text-vermillion transition-colors disabled:opacity-40 pb-2"
              >
                {subState.loading ? "Sending…" : <>Subscribe <ArrowUpRight size={14} /></>}
              </button>
            </div>
            <div id="news-status" role="status" aria-live="polite" className="min-h-[1.25rem] mt-3">
              {subState.error && <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-vermillion">{subState.error}</span>}
              {subState.success && <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-paper/70">Thank you you&apos;re on the list.</span>}
              {subState.already && <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-paper/50">You&apos;re already subscribed.</span>}
            </div>
          </form>
        </div>
      </div>

      {/* Columns */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-8">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <img src={logoWhite} alt="" className="h-11 w-auto mb-5" loading="lazy" />
            <div
              className="text-paper mb-3"
              style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 500, fontSize: "1.55rem", letterSpacing: "-0.02em" }}
            >
              PnP Artstudio
            </div>
            <p className="text-paper/45 text-[0.88rem] leading-relaxed max-w-xs mb-7">
              Handcrafted originals, limited editions, and custom commissions —
              made with archival materials, signed and shipped from the studio.
            </p>
            <div className="flex gap-2">
              {settings.socials.map(({ label, url }) => {
                const Icon = iconFor(label);
                return (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="w-10 h-10 flex items-center justify-center border border-paper/25 text-paper/60 hover:bg-vermillion hover:border-vermillion hover:text-white transition-colors duration-300"
                >
                  <Icon size={16} strokeWidth={1.6} />
                </a>
                );
              })}
            </div>
          </div>

          <nav aria-label="Explore">
            <h2 className="label-mono mb-5">Explore</h2>
            <ul className="flex flex-col gap-3">
              {quickLinks.map(({ to, label }) => <li key={label}><FooterLink to={to}>{label}</FooterLink></li>)}
            </ul>
          </nav>

          <nav aria-label="Shop">
            <h2 className="label-mono mb-5">Shop</h2>
            <ul className="flex flex-col gap-3">
              {shopLinks.map(({ to, label }) => <li key={label}><FooterLink to={to}>{label}</FooterLink></li>)}
            </ul>
          </nav>

          <div>
            <h2 className="label-mono mb-5">Studio</h2>
            <address className="not-italic flex flex-col gap-4 text-[0.88rem] text-paper/55">
              {addressLines.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="mt-1 text-vermillion shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span>
                    {addressLines.map((line, i) => (
                      <React.Fragment key={line}>{i > 0 && <br />}{line}</React.Fragment>
                    ))}
                  </span>
                </div>
              )}
              {settings.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-vermillion shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <a className="hover:text-vermillion transition-colors" href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}>
                    {settings.phone}
                  </a>
                </div>
              )}
              {settings.email && (
                <div className="flex items-start gap-2.5">
                  <Mail size={14} className="mt-1 text-vermillion shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <a className="hover:text-vermillion transition-colors break-all" href={`mailto:${settings.email}`}>
                    {settings.email}
                  </a>
                </div>
              )}
            </address>
          </div>
        </div>
      </div>

      {/* Wordmark marquee. Full-bleed and looping; leading is >1 so the
          descenders aren't sheared off the way a cropped block clipped them. */}
      <div className="relative overflow-hidden select-none border-t border-paper/12 py-7 sm:py-9" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <span key={copy} className="inline-flex items-center">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="inline-flex items-center">
                  <span
                    className="text-paper/[0.09] leading-[1.1] px-7"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 400,
                      fontSize: "clamp(2.4rem, 6.5vw, 6rem)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    PnP Artstudio
                  </span>
                  <span className="text-vermillion/45 text-[1.1rem]">✳</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Base bar */}
      <div className="border-t border-paper/12">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
          <small className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-paper/35 text-center sm:text-left">
            © {year} PnP Artstudio All rights reserved
          </small>
          <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {legalLinks.map(({ to, label }) => (
              <Link
                key={label}
                to={to}
                className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-paper/35 hover:text-vermillion transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
