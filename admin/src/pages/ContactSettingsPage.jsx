import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Save, RotateCcw, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import { RowEditor } from '../components/ui/RepeatableFields.jsx';
import SectionEyebrow from "../components/SectionEyebrow.jsx";

const API = (import.meta.env.VITE_API_URL ?? '') + '/api/site-settings';

const atLeastOne = (list, blank) => (Array.isArray(list) && list.length ? list : [blank]);

const emptySettings = {
  studioName: '', tagline: '',
  email: '', phone: '', whatsapp: '',
  addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: '',
  mapUrl: '', visitNote: '',
  hours: [{ label: '', value: '' }],
  socials: [{ label: '', url: '' }],
  responseTime: '', classEnquiryUrl: '',
};

const fromApi = (doc) => ({
  studioName: doc?.studioName ?? '',
  tagline: doc?.tagline ?? '',
  email: doc?.email ?? '',
  phone: doc?.phone ?? '',
  whatsapp: doc?.whatsapp ?? '',
  addressLine1: doc?.addressLine1 ?? '',
  addressLine2: doc?.addressLine2 ?? '',
  city: doc?.city ?? '',
  state: doc?.state ?? '',
  postalCode: doc?.postalCode ?? '',
  country: doc?.country ?? '',
  mapUrl: doc?.mapUrl ?? '',
  visitNote: doc?.visitNote ?? '',
  hours: atLeastOne((doc?.hours || []).map(h => ({ label: h.label ?? '', value: h.value ?? '' })), { label: '', value: '' }),
  socials: atLeastOne((doc?.socials || []).map(s => ({ label: s.label ?? '', url: s.url ?? '' })), { label: '', url: '' }),
  responseTime: doc?.responseTime ?? '',
  classEnquiryUrl: doc?.classEnquiryUrl ?? '',
});

const Section = ({ n, title, blurb, children }) => (
  <section className="panel panel-pad flex flex-col gap-4">
    <header>
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-[0.62rem] text-vermillion tabular-nums">{n}</span>
        <span className="h-px w-8 bg-rule" />
      </div>
      <h3 className="text-[1.05rem] text-ink" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{title}</h3>
      {blurb && <p className="text-[0.82rem] text-graphite mt-1">{blurb}</p>}
    </header>
    {children}
  </section>
);

const Field = ({ id, label, hint, ...rest }) => (
  <div>
    <label htmlFor={id} className="label">{label}</label>
    <input id={id} className="field" {...rest} />
    {hint && <p className="text-[0.76rem] text-slate mt-1.5">{hint}</p>}
  </div>
);

const ContactSettingsPage = () => {
  const [form, setForm] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(API);
      setForm(fromApi(data));
    } catch (err) {
      toast.error('Failed to load contact details: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.studioName.trim()) { setError('Studio name is required.'); return; }
    setSaving(true);
    try {
      const { data } = await axios.put(API, form);
      setForm(fromApi(data));
      toast.success('Contact details saved — live on the site now');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="panel h-52 animate-pulse bg-paper-dim" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Contact details</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5 max-w-xl">
            The studio's address, phone, email, opening hours and social links.
            These feed the footer, the contact page, checkout, and the store
            pickup flow — change them once here rather than in each place.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={load} disabled={saving}>
          <RotateCcw size={14} /> Discard changes
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-24" noValidate>
        {error && (
          <div role="alert" className="border border-vermillion-dark/40 bg-vermillion-wash text-vermillion-dark px-4 py-2.5 text-[0.85rem]">
            {error}
          </div>
        )}

        <Section n="01" title="Identity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="cs-name" label="Studio name *" value={form.studioName}
              onChange={e => set('studioName', e.target.value)} placeholder="PnP Artstudio" />
            <Field id="cs-tagline" label="Tagline" value={form.tagline}
              onChange={e => set('tagline', e.target.value)}
              placeholder="Original art, commissions, and classes" />
          </div>
        </Section>

        <Section n="02" title="How to reach the studio">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field id="cs-email" type="email" label="Email" value={form.email}
              onChange={e => set('email', e.target.value)} placeholder="contact@pnpartstudio.com" />
            <Field id="cs-phone" label="Phone" value={form.phone}
              onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" />
            <Field id="cs-wa" label="WhatsApp number" value={form.whatsapp}
              onChange={e => set('whatsapp', e.target.value)} placeholder="Digits only, with country code"
              hint="Used by the floating WhatsApp button." />
          </div>
          <Field id="cs-response" label="Response time note" value={form.responseTime}
            onChange={e => set('responseTime', e.target.value)}
            placeholder="Most messages are answered within one working day." />
        </Section>

        <Section n="03" title="Address" blurb="Shown on the contact page, in the footer, and on pickup orders.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="cs-a1" label="Address line 1" value={form.addressLine1}
              onChange={e => set('addressLine1', e.target.value)} />
            <Field id="cs-a2" label="Address line 2" value={form.addressLine2}
              onChange={e => set('addressLine2', e.target.value)} />
            <Field id="cs-city" label="City" value={form.city} onChange={e => set('city', e.target.value)} />
            <Field id="cs-state" label="State / region" value={form.state} onChange={e => set('state', e.target.value)} />
            <Field id="cs-zip" label="Postal code" value={form.postalCode} onChange={e => set('postalCode', e.target.value)} />
            <Field id="cs-country" label="Country" value={form.country} onChange={e => set('country', e.target.value)} />
          </div>
          <Field id="cs-map" label="Directions link" value={form.mapUrl}
            onChange={e => set('mapUrl', e.target.value)}
            placeholder="https://maps.google.com/…"
            hint="Powers the “Get directions” button. Paste a Google Maps share link." />
          <div>
            <label htmlFor="cs-visit" className="label">Visiting note</label>
            <textarea id="cs-visit" rows={2} className="field resize-y" value={form.visitNote}
              onChange={e => set('visitNote', e.target.value)}
              placeholder="Parking, buzzer, by-appointment only…" />
          </div>
        </Section>

        <Section n="04" title="Opening hours">
          <RowEditor
            values={form.hours}
            onChange={v => set('hours', v)}
            addLabel="Add row"
            fields={[
              { key: 'label', placeholder: 'Monday – Friday', width: 'md' },
              { key: 'value', placeholder: '10:00 – 18:00', width: 'lg' },
            ]}
          />
        </Section>

        <Section n="05" title="Social links" blurb="Shown in the footer and on the contact page.">
          <RowEditor
            values={form.socials}
            onChange={v => set('socials', v)}
            addLabel="Add link"
            fields={[
              { key: 'label', placeholder: 'Instagram', width: 'md' },
              { key: 'url', placeholder: 'https://instagram.com/…', width: 'lg' },
            ]}
          />
          <Field id="cs-enq" label="Class booking link" value={form.classEnquiryUrl}
            onChange={e => set('classEnquiryUrl', e.target.value)}
            placeholder="https://forms.gle/…"
            hint="The default “Reserve a seat” destination for classes that do not set their own." />
          {form.classEnquiryUrl && (
            <a href={form.classEnquiryUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm self-start">
              <ExternalLink size={13} /> Open booking link
            </a>
          )}
        </Section>

        <div className="sticky bottom-0 -mx-1 px-1 py-4 bg-paper border-t border-ink flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save details</>}
          </button>
          <span className="text-[0.78rem] text-slate">Changes go live on the storefront immediately.</span>
        </div>
      </form>
    </div>
  );
};

export default ContactSettingsPage;
