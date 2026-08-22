import React, { useState } from 'react';
import axios from 'axios';
import { Upload, ArrowUpRight, X, Plus } from 'lucide-react';
import Reveal, { RevealLines } from '../components/motion/Reveal';
import Select from '../components/ui/Select';
import usePageHero from '../hooks/usePageHero';
import customart from "../assets/custom_art_video.mp4";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB matches the copy under the dropzone
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const faqs = [
  { q: 'How long does a commission take?', a: 'Typical turnaround is 2–4 weeks depending on size and complexity; rush options may be available for an additional fee.' },
  { q: 'What’s included in the price?', a: 'Artwork, protective varnish, and a certificate of authenticity. Framing and shipping are additional.' },
  { q: 'Can changes be requested during the process?', a: 'Yes progress photos are provided and minor adjustments are welcome to make sure you’re happy.' },
  { q: 'Do you ship internationally?', a: 'Yes, worldwide shipping is available with tracked delivery and protective packaging.' },
  { q: 'What file types can be uploaded as references?', a: 'PNG and JPG are preferred; high-resolution images help achieve accurate results.' },
  { q: 'Can a specific deadline be met?', a: 'Deadlines can often be accommodated depending on scope. Sharing the date in the form helps us confirm feasibility.' },
  { q: 'What mediums are supported?', a: 'Acrylics, watercolour, charcoal, and mixed media are available for most commissions.' },
  { q: 'How are payments handled?', a: 'A 50% advance secures the slot, with the balance due on approval before shipping.' },
];

const steps = [
  { n: '01', title: 'Consultation', text: 'Share the vision and requirements' },
  { n: '02', title: 'Quote', text: 'Receive detailed pricing and timeline' },
  { n: '03', title: 'Creation', text: 'The artwork comes to life' },
  { n: '04', title: 'Delivery', text: 'Receive the finished piece' },
];

const ART_TYPES = [
  ['', 'Select art type'], ['portrait', 'Portrait'], ['landscape', 'Landscape'],
  ['abstract', 'Abstract'], ['still-life', 'Still life'], ['custom', 'Custom design'],
];
const SIZES = [
  ['', 'Select size'], ['small', 'Small (8×10 in)'], ['medium', 'Medium (16×20 in)'],
  ['large', 'Large (24×36 in)'], ['custom', 'Custom size'],
];
const BUDGETS = [
  ['', 'Select budget range'], ['under-500', 'Under $500'], ['500-1000', '$500 – $1,000'],
  ['1000-2000', '$1,000 – $2,000'], ['2000-plus', '$2,000+'],
];

const emptyForm = {
  name: '', email: '', phone: '', artType: '', size: '',
  description: '', budget: '', deadline: '', reference: null,
};

const FaqItem = ({ item, open, onToggle, id, index }) => (
  <div className="border-b border-rule">
    <h3>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`faq-panel-${id}`}
        className="w-full flex items-baseline justify-between gap-6 py-5 text-left group"
      >
        <span className="flex items-baseline gap-5 min-w-0">
          <span className="font-mono text-[0.6rem] text-vermillion tabular-nums shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="t-title !text-[1.02rem] group-hover:text-vermillion transition-colors">{item.q}</span>
        </span>
        <Plus
          size={15}
          className={`text-slate shrink-0 transition-transform duration-400 ${open ? 'rotate-45 text-vermillion' : ''}`}
        />
      </button>
    </h3>
    {open && (
      <div id={`faq-panel-${id}`} className="pb-6 pl-0 sm:pl-[3.1rem] text-graphite text-[0.92rem] leading-relaxed max-w-2xl">
        {item.a}
      </div>
    )}
  </div>
);

const CustomOrderPage = () => {
  const hero = usePageHero('custom-order');
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [visibleFaqs, setVisibleFaqs] = useState(4);
  const [openFaq, setOpenFaq] = useState(null);
  const [fileError, setFileError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (status.type === 'error') setStatus({ type: '', message: '' });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFileError('');
    if (!file) { setFormData(prev => ({ ...prev, reference: null })); return; }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Please upload a PNG, JPG, or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB the limit is 10MB.`);
      e.target.value = '';
      return;
    }
    setFormData(prev => ({ ...prev, reference: file }));
  };

  const clearFile = () => {
    setFormData(prev => ({ ...prev, reference: null }));
    setFileError('');
    const input = document.getElementById('reference');
    if (input) input.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    if (!formData.name.trim() || !formData.email.trim() || !formData.artType || !formData.size || !formData.description.trim()) {
      setStatus({ type: 'error', message: 'Please fill in the required fields: name, email, art type, size, and description.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'reference') { if (value) fd.append('reference', value); }
        else fd.append(key, value);
      });
      await axios.post(`${API_BASE}/api/custom-orders/submit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      setStatus({ type: 'success', message: 'Your request has been sent. Expect a response within 24 hours.' });
      setFormData(emptyForm);
      clearFile();
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || 'Failed to submit. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-paper min-h-screen">
      {/* Masthead */}
      <section className="border-b border-ink">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-center">
            <div>
              <div className="section-index mb-8">{hero.sectionLabel}</div>
              <RevealLines as="h1" className="t-hero mb-8" lines={hero.headingLines} />
              <p className="text-graphite leading-relaxed max-w-md">
                Turn an idea into a one-of-a-kind piece painted by hand to your brief,
                your budget, and your timeline.
              </p>
            </div>
            <Reveal direction="right" className="relative">
              <div className="absolute -inset-4 border border-rule pointer-events-none hidden sm:block" aria-hidden="true" />
              <video
                src={customart}
                autoPlay muted loop playsInline preload="metadata"
                className="relative block w-full h-full object-cover min-h-[300px] max-h-[440px]"
                aria-label="Custom artwork being painted"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="section-index mb-10">The Process</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-rule">
          {steps.map(({ n, title, text }, i) => (
            <Reveal key={title} delay={i * 0.07} className="border-r border-b border-rule p-6 sm:p-8">
              <div className="font-mono text-[0.66rem] text-vermillion tabular-nums mb-6">{n}</div>
              <h2 className="t-title mb-2">{title}</h2>
              <p className="text-graphite text-[0.85rem] leading-relaxed">{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* What can be commissioned */}
      <section className="bg-paper-dim border-y border-rule py-16 sm:py-24">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-20 items-end mb-14">
            <div>
              <div className="section-index mb-7">What We Paint</div>
              <h2 className="t-display">Commission types</h2>
            </div>
            <p className="text-graphite leading-relaxed max-w-md lg:pb-2">
              If it isn&apos;t listed here, ask anyway most briefs are possible.
              The only work turned down is anything that would need to copy another
              living artist&apos;s piece.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-rule">
            {[
              { n: '01', t: 'Portraits', b: 'People and pets, from photographs. Single subject or family groups, in acrylic or charcoal.' },
              { n: '02', t: 'Indian deity art', b: 'Ma Durga, Ganesha, Lakshmi and others traditional iconography with a contemporary finish.' },
              { n: '03', t: 'Landscapes', b: 'A place that matters to you: a childhood home, a view, somewhere you were married.' },
              { n: '04', t: 'Name signs', b: 'Hand-lettered family names and house signs, often commissioned as wedding gifts.' },
              { n: '05', t: 'Kolam & return gifts', b: 'Coasters, peetham, trays and diya holders made in sets for weddings and festivals.' },
              { n: '06', t: 'Abstract & modern', b: 'Colour-led pieces made to a palette, sized to a specific wall.' },
            ].map(({ n, t, b }, i) => (
              <Reveal key={n} delay={i * 0.05} className="border-r border-b border-rule p-6 sm:p-8 bg-paper">
                <div className="font-mono text-[0.64rem] text-vermillion tabular-nums mb-6">{n}</div>
                <h3 className="t-title mb-2.5">{t}</h3>
                <p className="text-graphite text-[0.88rem] leading-relaxed">{b}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Price guide + what's included */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <Reveal>
            <div className="section-index mb-7">Indicative Pricing</div>
            <h2 className="t-display mb-4">What it costs</h2>
            <p className="text-graphite leading-relaxed mb-9 max-w-md">
              A starting point, not a quote. Detail, medium and framing all move the
              figure you&apos;ll get an exact number before anything is committed.
            </p>

            <div className="border-t border-ink">
              {[
                ['Small', '8×10 in', 'from $180'],
                ['Medium', '16×20 in', 'from $420'],
                ['Large', '24×36 in', 'from $850'],
                ['Custom', 'Your dimensions', 'Quoted'],
              ].map(([size, dims, price]) => (
                <div key={size} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-baseline py-4 border-b border-rule">
                  <span className="t-title !text-[1rem]">{size}</span>
                  <span className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-slate">{dims}</span>
                  <span className="font-mono text-[0.85rem] text-vermillion tabular-nums whitespace-nowrap">{price}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="section-index mb-7">Every Commission</div>
            <h2 className="t-display mb-4">What&apos;s included</h2>
            <p className="text-graphite leading-relaxed mb-9 max-w-md">
              No surprise line items. These come with every piece, whatever the size.
            </p>

            <ul className="border-t border-ink">
              {[
                ['Progress photos', 'Shared at sketch, block-in and finish, so nothing is a surprise.'],
                ['Minor revisions', 'Adjustments during the process are expected and included.'],
                ['Protective varnish', 'UV-resistant, applied only once the paint has fully cured.'],
                ['Certificate of authenticity', 'Signed, with medium, dimensions and completion date.'],
                ['Archival packing', 'Glassine, corner protection and a double-walled box.'],
              ].map(([t, b]) => (
                <li key={t} className="flex gap-5 py-4 border-b border-rule">
                  <span className="text-vermillion shrink-0 mt-0.5" aria-hidden="true">✳</span>
                  <span>
                    <span className="block t-title !text-[1rem] mb-1">{t}</span>
                    <span className="block text-graphite text-[0.88rem] leading-relaxed">{b}</span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-slate mt-6 leading-relaxed">
              Framing and shipping quoted separately
            </p>
          </Reveal>
        </div>
      </section>

      {/* Form */}
      <section className="bg-paper-dim border-y border-rule py-16 sm:py-24">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex items-baseline gap-4 pb-4 border-b border-ink mb-10">
              <span className="font-mono text-[0.66rem] text-vermillion tabular-nums">05</span>
              <h2 className="t-section">Commission request</h2>
            </div>

            {status.type === 'success' ? (
              <div className="border-l-2 border-vermillion pl-6 py-4" role="status">
                <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-vermillion mb-2">Request sent</div>
                <p className="text-graphite mb-7">{status.message}</p>
                <button type="button" className="btn-k btn-k-outline btn-k-sm" onClick={() => setStatus({ type: '', message: '' })}>
                  Submit another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
                {status.type === 'error' && (
                  <div role="alert" className="border-l-2 border-vermillion pl-5 py-3">
                    <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-vermillion mb-1.5">Error</div>
                    <p className="text-[0.92rem] text-graphite">{status.message}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                  <div>
                    <label htmlFor="co-name" className="label-k">Full name <span className="text-vermillion">*</span></label>
                    <input id="co-name" type="text" name="name" required autoComplete="name"
                      value={formData.name} onChange={handleInputChange}
                      className="field-k" placeholder="Your full name" />
                  </div>
                  <div>
                    <label htmlFor="co-email" className="label-k">Email address <span className="text-vermillion">*</span></label>
                    <input id="co-email" type="email" name="email" required autoComplete="email"
                      value={formData.email} onChange={handleInputChange}
                      className="field-k" placeholder="you@example.com" />
                  </div>
                  <div>
                    <label htmlFor="co-phone" className="label-k">Phone number</label>
                    <input id="co-phone" type="tel" name="phone" autoComplete="tel"
                      value={formData.phone} onChange={handleInputChange}
                      className="field-k" placeholder="+1 555 000 0000" />
                  </div>
                  <div>
                    <label htmlFor="co-artType" className="label-k">Art type <span className="text-vermillion">*</span></label>
                    <Select
                      id="co-artType"
                      required
                      value={formData.artType}
                      onChange={(v) => handleInputChange({ target: { name: 'artType', value: v } })}
                      options={ART_TYPES.map(([v, l]) => ({ value: v, label: l }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="co-size" className="label-k">Preferred size <span className="text-vermillion">*</span></label>
                    <Select
                      id="co-size"
                      required
                      value={formData.size}
                      onChange={(v) => handleInputChange({ target: { name: 'size', value: v } })}
                      options={SIZES.map(([v, l]) => ({ value: v, label: l }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="co-budget" className="label-k">Budget range</label>
                    <Select
                      id="co-budget"
                      value={formData.budget}
                      onChange={(v) => handleInputChange({ target: { name: 'budget', value: v } })}
                      options={BUDGETS.map(([v, l]) => ({ value: v, label: l }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="co-deadline" className="label-k">Preferred completion date</label>
                    <input id="co-deadline" type="date" name="deadline" value={formData.deadline} onChange={handleInputChange} className="field-k" />
                  </div>
                </div>

                <div>
                  <label htmlFor="co-description" className="label-k">Project description <span className="text-vermillion">*</span></label>
                  <textarea id="co-description" name="description" required rows={6}
                    value={formData.description} onChange={handleInputChange}
                    className="field-k resize-y"
                    placeholder="Describe the vision: colours, style, subject, mood, and any specific requirements…" />
                </div>

                <div>
                  <span className="label-k">Reference image</span>
                  <label className="block text-center p-9 border border-dashed border-rule-strong bg-paper hover:border-vermillion transition-colors cursor-pointer">
                    <input
                      type="file" id="reference" name="reference"
                      onChange={handleFileChange}
                      accept={ACCEPTED_TYPES.join(',')}
                      className="sr-only"
                    />
                    <Upload size={22} className="mb-3 mx-auto text-vermillion" aria-hidden="true" />
                    <span className="block font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ink">Click to upload</span>
                    <span className="block font-mono text-[0.56rem] uppercase tracking-[0.1em] text-slate mt-2">
                      PNG, JPG or WebP · up to 10MB
                    </span>
                  </label>
                  {fileError && (
                    <p role="alert" className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-vermillion mt-3">{fileError}</p>
                  )}
                  {formData.reference && (
                    <div className="mt-3 flex items-center gap-3 border border-rule px-4 py-3">
                      <span className="text-[0.85rem] text-ink truncate grow">{formData.reference.name}</span>
                      <span className="font-mono text-[0.6rem] text-slate shrink-0 tabular-nums">
                        {(formData.reference.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                      <button type="button" onClick={clearFile} aria-label="Remove file" className="text-slate hover:text-vermillion transition-colors shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <button type="submit" className="btn-k w-full sm:w-auto sm:self-start" disabled={submitting}>
                  {submitting ? 'Submitting…' : <>Submit commission request <ArrowUpRight size={14} /></>}
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Reveal>
          <div className="section-index mb-7">Good to Know</div>
          <h2 className="t-display mb-12">Frequently asked questions</h2>

          <div className="border-t border-ink">
            {faqs.slice(0, visibleFaqs).map((item, idx) => (
              <FaqItem
                key={item.q}
                id={idx}
                index={idx}
                item={item}
                open={openFaq === idx}
                onToggle={() => setOpenFaq(openFaq === idx ? null : idx)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-10">
            {visibleFaqs < faqs.length && (
              <button type="button" className="btn-k btn-k-outline btn-k-sm" onClick={() => setVisibleFaqs((n) => Math.min(n + 4, faqs.length))}>
                Show more ({faqs.length - visibleFaqs} left)
              </button>
            )}
            {visibleFaqs > 4 && (
              <button type="button" className="btn-k btn-k-ghost btn-k-sm" onClick={() => { setVisibleFaqs(4); setOpenFaq(null); }}>
                Show less
              </button>
            )}
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default CustomOrderPage;
