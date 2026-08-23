import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import { ListEditor, RowEditor } from '../components/ui/RepeatableFields.jsx';
import { uploadImage } from '../api/media.js';
import SectionEyebrow from "../components/SectionEyebrow.jsx";
import FloatingSaveBar from "../components/FloatingSaveBar.jsx";
import ImageDropzone from "../components/ui/ImageDropzone.jsx";

const API = (import.meta.env.VITE_API_URL ?? '') + '/api/artist-profile';

const emptyProfile = {
  name: '',
  role: '',
  location: '',
  photo: '',
  photoAlt: '',
  home: { sectionLabel: '', headingLines: [''], paragraphs: [''], ctaLabel: '', ctaHref: '' },
  about: {
    sectionLabel: '', headingLines: [''], intro: '', details: [{ label: '', value: '' }],
    tags: [''], lead: '', paragraphs: [''],
    ratingScore: '', ratingOutOf: '', ratingLabel: '', customersCount: '', customersLabel: '',
  },
};

/** An empty list still needs one visible row, otherwise there is nothing to type into. */
const atLeastOne = (list, blank) => (Array.isArray(list) && list.length ? list : [blank]);

const fromApi = (doc) => ({
  name: doc?.name ?? '',
  role: doc?.role ?? '',
  location: doc?.location ?? '',
  photo: doc?.photo ?? '',
  photoAlt: doc?.photoAlt ?? '',
  home: {
    sectionLabel: doc?.home?.sectionLabel ?? '',
    headingLines: atLeastOne(doc?.home?.headingLines, ''),
    paragraphs: atLeastOne(doc?.home?.paragraphs, ''),
    ctaLabel: doc?.home?.ctaLabel ?? '',
    ctaHref: doc?.home?.ctaHref ?? '',
  },
  about: {
    sectionLabel: doc?.about?.sectionLabel ?? '',
    headingLines: atLeastOne(doc?.about?.headingLines, ''),
    intro: doc?.about?.intro ?? '',
    details: atLeastOne(
      (doc?.about?.details || []).map(d => ({ label: d.label ?? '', value: d.value ?? '' })),
      { label: '', value: '' }
    ),
    tags: atLeastOne(doc?.about?.tags, ''),
    lead: doc?.about?.lead ?? '',
    paragraphs: atLeastOne(doc?.about?.paragraphs, ''),
    ratingScore: doc?.about?.ratingScore ?? '',
    ratingOutOf: doc?.about?.ratingOutOf ?? '',
    ratingLabel: doc?.about?.ratingLabel ?? '',
    customersCount: doc?.about?.customersCount ?? '',
    customersLabel: doc?.about?.customersLabel ?? '',
  },
});

const Section = ({ n, title, blurb, children }) => (
  <section className="panel panel-pad flex flex-col gap-5">
    <header>
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-[0.62rem] text-vermillion tabular-nums">{n}</span>
        <span className="h-px w-8 bg-rule" />
      </div>
      <h3 className="text-[1.05rem] text-ink" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
        {title}
      </h3>
      {blurb && <p className="text-[0.82rem] text-graphite mt-1">{blurb}</p>}
    </header>
    {children}
  </section>
);

/* ── Page ───────────────────────────────────────────────────────────────── */

const ArtistProfilePage = () => {
  const [form, setForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(API);
      setForm(fromApi(data));
    } catch (err) {
      toast.error('Failed to load the artist profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setHome = (key, value) => setForm(f => ({ ...f, home: { ...f.home, [key]: value } }));
  const setAbout = (key, value) => setForm(f => ({ ...f, about: { ...f.about, [key]: value } }));

  const handleImageChange = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, { folder: 'artist' });
      setField('photo', url);
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Artist name is required.'); return; }
    if (!form.home.headingLines.some(l => l.trim())) {
      setError('The home section needs at least one heading line.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.put(API, form);
      setForm(fromApi(data));
      toast.success('Artist profile saved — live on the site now');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="panel h-56 animate-pulse bg-paper-dim" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Artist profile</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5 max-w-xl">
            One profile, two places: the “The Artist” band on the home page and the
            masthead plus bio on the About page. Saving updates both.
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

        {/* 01 Identity */}
        <Section n="01" title="Identity" blurb="Shown on both pages — the photo, the name caption, and the location badge.">
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-5">
            <div>
              <ImageDropzone
                id="ap-photo"
                label="Photo"
                size="wide"
                previewUrl={form.photo}
                uploading={uploading}
                onChange={handleImageChange}
                onRemove={() => setField('photo', '')}
                hint="Leave empty to keep the photo bundled with the site."
              />
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="ap-name" className="label">Name <span className="text-vermillion">*</span></label>
                <input id="ap-name" className="field" value={form.name} onChange={e => setField('name', e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ap-role" className="label">Role</label>
                  <input id="ap-role" className="field" value={form.role} onChange={e => setField('role', e.target.value)} placeholder="Founder" />
                </div>
                <div>
                  <label htmlFor="ap-location" className="label">Location</label>
                  <input id="ap-location" className="field" value={form.location} onChange={e => setField('location', e.target.value)} placeholder="Ballwin, Missouri" />
                </div>
              </div>
              <div>
                <label htmlFor="ap-alt" className="label">Photo alt text</label>
                <input id="ap-alt" className="field" value={form.photoAlt} onChange={e => setField('photoAlt', e.target.value)}
                  placeholder="Describes the photo for screen readers" />
              </div>
            </div>
          </div>
        </Section>

        {/* 02 Home band */}
        <Section n="02" title="Home page — “The Artist” band" blurb="The section between the process grid and the numbers strip.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ap-h-label" className="label">Section label</label>
              <input id="ap-h-label" className="field" value={form.home.sectionLabel}
                onChange={e => setHome('sectionLabel', e.target.value)} placeholder="06 The Artist" />
            </div>
          </div>

          <ListEditor
            label="Heading lines"
            hint="Each line animates in separately — break the headline where you want it to wrap."
            values={form.home.headingLines}
            onChange={v => setHome('headingLines', v)}
            addLabel="Add line"
            placeholder="A brush, a childhood"
          />

          <ListEditor
            label="Paragraphs"
            hint="The artist's name is highlighted automatically wherever it appears in the first paragraph."
            values={form.home.paragraphs}
            onChange={v => setHome('paragraphs', v)}
            addLabel="Add paragraph"
            multiline
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ap-cta-label" className="label">Button text</label>
              <input id="ap-cta-label" className="field" value={form.home.ctaLabel}
                onChange={e => setHome('ctaLabel', e.target.value)} placeholder="Read the full story" />
            </div>
            <div>
              <label htmlFor="ap-cta-href" className="label">Button link</label>
              <input id="ap-cta-href" className="field" value={form.home.ctaHref}
                onChange={e => setHome('ctaHref', e.target.value)} placeholder="/about" />
            </div>
          </div>
          <p className="text-[0.76rem] text-slate -mt-2">
            Leave either field empty to hide the button.
          </p>
        </Section>

        {/* 03 About masthead */}
        <Section n="03" title="About page — masthead" blurb="The top of /about: headline, intro paragraph, detail table, and tags.">
          <div>
            <label htmlFor="ap-a-label" className="label">Section label</label>
            <input id="ap-a-label" className="field sm:max-w-xs" value={form.about.sectionLabel}
              onChange={e => setAbout('sectionLabel', e.target.value)} placeholder="About The Studio" />
          </div>

          <ListEditor
            label="Heading lines"
            values={form.about.headingLines}
            onChange={v => setAbout('headingLines', v)}
            addLabel="Add line"
            placeholder="Meet the artist"
          />

          <div>
            <label htmlFor="ap-a-intro" className="label">Intro paragraph</label>
            <textarea id="ap-a-intro" rows={3} className="field resize-y" value={form.about.intro}
              onChange={e => setAbout('intro', e.target.value)} />
          </div>

          <RowEditor
            label="Detail table"
            hint="The small label/value rows under the intro."
            values={form.about.details}
            onChange={v => setAbout('details', v)}
            addLabel="Add detail"
            fields={[
              { key: 'label', placeholder: 'Label', width: 'md' },
              { key: 'value', placeholder: 'Value', width: 'lg' },
            ]}
          />

          <ListEditor
            label="Tags"
            values={form.about.tags}
            onChange={v => setAbout('tags', v)}
            addLabel="Add tag"
            placeholder="Traditional techniques"
          />
        </Section>

        {/* 04 About bio */}
        <Section n="04" title="About page — bio" blurb="The long-form story beside the photo, and the rating strip beneath it.">
          <div>
            <label htmlFor="ap-a-lead" className="label">Opening line</label>
            <textarea id="ap-a-lead" rows={2} className="field resize-y" value={form.about.lead}
              onChange={e => setAbout('lead', e.target.value)} />
            <p className="text-[0.76rem] text-slate mt-1.5">Set larger than the rest, in the display serif.</p>
          </div>

          <ListEditor
            label="Story paragraphs"
            values={form.about.paragraphs}
            onChange={v => setAbout('paragraphs', v)}
            addLabel="Add paragraph"
            multiline
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="ap-rate" className="label">Rating</label>
              <input id="ap-rate" className="field" value={form.about.ratingScore}
                onChange={e => setAbout('ratingScore', e.target.value)} placeholder="4.9" />
            </div>
            <div>
              <label htmlFor="ap-rate-of" className="label">Out of</label>
              <input id="ap-rate-of" className="field" value={form.about.ratingOutOf}
                onChange={e => setAbout('ratingOutOf', e.target.value)} placeholder="/5.0" />
            </div>
            <div>
              <label htmlFor="ap-rate-label" className="label">Rating caption</label>
              <input id="ap-rate-label" className="field" value={form.about.ratingLabel}
                onChange={e => setAbout('ratingLabel', e.target.value)} placeholder="Customer rating" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ap-cust" className="label">Customer count</label>
              <input id="ap-cust" className="field" value={form.about.customersCount}
                onChange={e => setAbout('customersCount', e.target.value)} placeholder="1000+" />
            </div>
            <div>
              <label htmlFor="ap-cust-label" className="label">Customer caption</label>
              <input id="ap-cust-label" className="field" value={form.about.customersLabel}
                onChange={e => setAbout('customersLabel', e.target.value)} placeholder="Happy customers" />
            </div>
          </div>
        </Section>

        <FloatingSaveBar
          saving={saving}
          disabled={saving || uploading}
          label="Save profile"
          helperText="Changes go live on the storefront immediately."
        />
      </form>
    </div>
  );
};

export default ArtistProfilePage;
