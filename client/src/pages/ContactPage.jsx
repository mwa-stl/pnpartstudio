import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, ArrowUpRight } from 'lucide-react';
import { Instagram, Facebook, Youtube } from '../components/BrandIcons';
import axios from 'axios';
import Reveal, { RevealLines } from '../components/motion/Reveal';
import ParallaxLayer from '../components/motion/ParallaxLayer';
import Select from '../components/ui/Select';
import PageHeroMedia from '../components/PageHeroMedia';
import usePageHero from '../hooks/usePageHero';
import useSiteSettings from '../hooks/useSiteSettings';
import { formatAddress } from '../data/siteSettings';
import priyankaBioImg from '../assets/priyanka bio img.jpeg';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const COUNTRY_CODES = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
];

/* Social icons are matched by name because the links themselves are edited
   in the console; anything unrecognised falls back to the generic mark. */
const SOCIAL_ICONS = { instagram: Instagram, facebook: Facebook, youtube: Youtube };
const iconFor = (label) => SOCIAL_ICONS[String(label).toLowerCase().trim()] || Globe;

/** The four tiles, built from the admin-managed studio details. */
const buildContactInfo = (s) => {
  const [first, ...restHours] = s.hours;
  return [
    s.addressLine1 || s.city
      ? {
          n: '01',
          title: 'Visit the studio',
          details: formatAddress(s),
          sub: s.visitNote,
          href: s.mapUrl || undefined,
        }
      : null,
    s.phone && {
      n: '02',
      title: 'Call us',
      details: s.phone,
      sub: first ? `${first.label}, ${first.value}` : '',
      href: `tel:${s.phone.replace(/[^+\d]/g, '')}`,
    },
    s.email && {
      n: '03',
      title: 'Email us',
      details: s.email,
      sub: s.responseTime,
      href: `mailto:${s.email}`,
    },
    first && {
      n: '04',
      title: 'Studio hours',
      details: `${first.label}: ${first.value}`,
      sub: restHours.map((h) => `${h.label}: ${h.value}`).join(' · '),
    },
  ].filter(Boolean);
};

const SUBJECTS = [
  { value: '', label: 'Select a subject' },
  { value: 'general', label: 'General enquiry' },
  { value: 'commission', label: 'Custom order / commission' },
  { value: 'workshop', label: 'Workshop information' },
  { value: 'purchase', label: 'Purchase enquiry' },
  { value: 'exhibition', label: 'Exhibition / gallery' },
  { value: 'other', label: 'Other' },
];

const ContactPage = () => {
  const hero = usePageHero('contact');
  const settings = useSiteSettings();
  const contactInfo = buildContactInfo(settings);
  const [formData, setFormData] = useState({
    name: '', email: '', subject: '', message: '', phone: '', countryCode: '+1',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(f => ({ ...f, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMsg('Please fill in your name, email, and message.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/api/contact/submit`, {
        ...formData,
        phone: formData.phone ? `${formData.countryCode}${formData.phone}` : ''
      }, { withCredentials: true });
      setIsSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '', phone: '', countryCode: '+1' });
      setTimeout(() => setIsSubmitted(false), 6000);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-paper min-h-screen">
      {/* Masthead */}
      <div className="border-b border-ink">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-20 items-end">
            <div>
              <div className="section-index mb-8">{hero.sectionLabel}</div>
              <RevealLines as="h1" className="t-hero" lines={hero.headingLines} />
            </div>

            <Reveal delay={0.15} className="lg:pb-3">
              <p className="text-graphite leading-relaxed mb-8 max-w-md">
                Questions about a piece? Want to commission something personal? Curious about
                classes? We&apos;d love to hear from you.
              </p>
              <dl className="border-t border-rule">
                {[
                  settings.responseTime && ['Reply time', settings.responseTime],
                  settings.email && ['Email', settings.email],
                  settings.phone && ['Phone', settings.phone],
                ].filter(Boolean).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 border-b border-rule">
                    <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-slate shrink-0">{k}</dt>
                    <dd className="font-mono text-[0.66rem] text-ink text-right break-all">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
          {hero.image && (
            <PageHeroMedia
              src={hero.image}
              alt=""
              className="w-full h-[220px] sm:h-[300px] object-cover border border-ink mt-10"
            />
          )}
        </div>
      </div>

      {/* Contact index */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-l border-rule">
          {contactInfo.map((info, i) => {
            const Wrapper = info.href ? 'a' : 'div';
            return (
              <Reveal key={info.title} delay={i * 0.06} className="border-r border-b border-rule">
                <Wrapper
                  {...(info.href ? { href: info.href } : {})}
                  className="group block h-full p-6 sm:p-8 transition-colors duration-400 hover:bg-ink"
                >
                  <div className="flex items-start justify-between mb-6">
                    <span className="font-mono text-[0.6rem] text-vermillion tabular-nums">{info.n}</span>
                    {info.href && (
                      <ArrowUpRight
                        size={15}
                        className="text-slate group-hover:text-vermillion transition-all duration-400 group-hover:translate-x-1 group-hover:-translate-y-1"
                      />
                    )}
                  </div>
                  <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate group-hover:text-paper/50 transition-colors mb-3">
                    {info.title}
                  </h2>
                  <p className="text-[0.95rem] text-ink group-hover:text-paper transition-colors mb-2 break-words">
                    {info.details}
                  </p>
                  <p className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-slate group-hover:text-paper/45 transition-colors">
                    {info.sub}
                  </p>
                </Wrapper>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* Form + aside */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-20">

          <Reveal direction="left">
            <div className="flex items-baseline gap-4 pb-4 border-b border-ink mb-10">
              <span className="font-mono text-[0.66rem] text-vermillion tabular-nums">05</span>
              <h2 className="t-section">Send us a message</h2>
            </div>

            <div role="status" aria-live="polite">
              {isSubmitted && (
                <div className="border-l-2 border-vermillion pl-5 py-3 mb-9">
                  <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-vermillion mb-1.5">Sent</div>
                  <p className="text-[0.92rem] text-graphite">
                    Thank you your message is on its way. We&apos;ll reply within 24 hours.
                  </p>
                </div>
              )}
            </div>
            {errorMsg && !isSubmitted && (
              <div role="alert" className="border-l-2 border-vermillion pl-5 py-3 mb-9">
                <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-vermillion mb-1.5">Error</div>
                <p className="text-[0.92rem] text-graphite">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8" noValidate>
              <div>
                <label htmlFor="c-name" className="label-k">Full name <span className="text-vermillion">*</span></label>
                <input id="c-name" type="text" name="name" required autoComplete="name"
                  value={formData.name} onChange={handleChange}
                  className="field-k" placeholder="Your full name" />
              </div>
              <div>
                <label htmlFor="c-email" className="label-k">Email address <span className="text-vermillion">*</span></label>
                <input id="c-email" type="email" name="email" required autoComplete="email"
                  value={formData.email} onChange={handleChange}
                  className="field-k" placeholder="you@example.com" />
              </div>

              <div>
                <label htmlFor="c-phone" className="label-k">Phone</label>
                <div className="flex gap-3">
                  <Select
                    id="c-code"
                    aria-label="Country code"
                    className="w-[132px] shrink-0"
                    buttonClassName="font-mono text-[0.85rem]"
                    value={formData.countryCode}
                    onChange={(v) => handleChange({ target: { name: 'countryCode', value: v } })}
                    options={COUNTRY_CODES.map(c => ({ value: c.dial, label: `${c.flag} ${c.dial}`, hint: c.name }))}
                  />
                  <input id="c-phone" type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    className="field-k" placeholder="555 000 0000" inputMode="tel" autoComplete="tel" />
                </div>
              </div>

              <div>
                <label htmlFor="c-subject" className="label-k">Subject</label>
                <Select
                  id="c-subject"
                  value={formData.subject}
                  onChange={(v) => handleChange({ target: { name: 'subject', value: v } })}
                  options={SUBJECTS}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="c-message" className="label-k">Message <span className="text-vermillion">*</span></label>
                <textarea id="c-message" name="message" required rows={7}
                  value={formData.message} onChange={handleChange}
                  className="field-k resize-y"
                  placeholder="Tell us about your enquiry, custom order details, or any questions you have…" />
              </div>

              <div className="md:col-span-2">
                <button type="submit" className="btn-k w-full sm:w-auto" disabled={submitting}>
                  {submitting ? 'Sending…' : <>Send message <ArrowUpRight size={14} /></>}
                </button>
              </div>
            </form>
          </Reveal>

          <Reveal direction="right" className="flex flex-col gap-10 lg:sticky lg:top-28 lg:self-start bg-paper">
            {/* Response promise answers the unspoken "will anyone reply?" */}
            <div className="bg-ink on-ink p-7">
              <div className="section-index mb-6">Response</div>
              <p className="t-section !text-[1.5rem] text-paper mb-5">
                We reply within 24 hours.
              </p>
              <p className="text-paper/55 text-[0.9rem] leading-relaxed mb-7">
                Messages go straight to the studio inbox not a queue. If it&apos;s
                urgent, WhatsApp is faster.
              </p>
              <dl className="border-t border-paper/20">
                {[
                  ['Mon–Fri', '9am – 6pm'],
                  ['Sat–Sun', '10am – 4pm'],
                  ['Timezone', 'CST (Missouri)'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 border-b border-paper/20">
                    <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper/45">{k}</dt>
                    <dd className="font-mono text-[0.66rem] text-paper/85">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <div className="label-mono mb-5">Follow the journey</div>
              <p className="text-graphite text-[0.95rem] leading-relaxed mb-7">
                Behind-the-scenes from the studio, workshop dates, and new artwork reveals.
              </p>
              <div className="flex gap-2">
                {settings.socials.map((social) => {
                  const Icon = iconFor(social.label);
                  return (
                    <a
                      key={social.label}
                      href={social.url}
                      className="w-12 h-12 border border-rule-strong text-graphite flex items-center justify-center hover:bg-ink hover:text-paper hover:border-ink transition-colors duration-300"
                      aria-label={social.label}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <Icon size={17} strokeWidth={1.6} />
                    </a>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Workshops full width, so neither column of the form grid is left
          hanging with empty space beside it. */}
      <section className="bg-paper-dim border-y border-rule">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-20 items-end">
            <Reveal>
              <div className="section-index mb-7">Workshops</div>
              <h2 className="t-display mb-5">Art classes available</h2>
              <p className="text-graphite leading-relaxed max-w-md">
                Hands-on sessions to learn painting, build confidence, and make something
                you&apos;re proud of online or in the studio.
              </p>
            </Reveal>

            <Reveal delay={0.12} className="lg:pb-2">
              <div className="flex flex-wrap gap-2 mb-8">
                {['Beginner friendly', 'Materials included', 'Small groups', 'All ages'].map(t => (
                  <span key={t} className="tag-k">{t}</span>
                ))}
              </div>
              <Link to="/art-classes" className="btn-k btn-k-outline w-full sm:w-auto">
                See class schedule <ArrowUpRight size={14} />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Visit the studio */}
      <section className="relative overflow-hidden border-t border-ink">
        <ParallaxLayer speed={0.18} className="absolute inset-0 h-full">
          <img src={priyankaBioImg} alt="" className="w-full h-full object-cover object-top" aria-hidden="true" />
        </ParallaxLayer>
        <div className="absolute inset-0 bg-ink/78" />
        <div className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8 on-ink">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-24 items-end">
            <Reveal>
              <div className="section-index mb-8">Visit</div>
              <RevealLines
                as="h2"
                className="t-hero text-paper"
                lines={['Come and see', 'the work in person.']}
              />
            </Reveal>

            <Reveal delay={0.15} className="lg:pb-3">
              <p className="text-paper/60 leading-relaxed mb-9 max-w-sm">
                Pieces read differently on a wall than on a screen. Drop us a line
                before you set off and we&apos;ll make sure someone&apos;s in.
              </p>

              <address className="not-italic border-t border-paper/20 mb-9">
                {formatAddress(settings, { multiline: true }).map((line, i) => (
                  <div key={line} className="flex justify-between gap-4 py-3 border-b border-paper/20">
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper/45">
                      {i === 0 ? 'Address' : ''}
                    </span>
                    <span className="font-mono text-[0.68rem] text-paper/85 text-right">{line}</span>
                  </div>
                ))}
                {settings.hours.map((h) => (
                  <div key={h.label} className="flex justify-between gap-4 py-3 border-b border-paper/20">
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper/45">{h.label}</span>
                    <span className="font-mono text-[0.68rem] text-paper/85 text-right">{h.value}</span>
                  </div>
                ))}
              </address>

              {settings.mapUrl && (
                <a
                  href={settings.mapUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-k btn-k-invert w-full sm:w-auto"
                >
                  Open in maps <ArrowUpRight size={14} />
                </a>
              )}
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
