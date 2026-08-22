import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Loader2, Save, RotateCcw, UploadCloud, X } from 'lucide-react';
import { toast } from 'react-toastify';
import Select from '../components/ui/Select.jsx';
import LinkPicker from '../components/ui/LinkPicker.jsx';
import { ListEditor } from '../components/ui/RepeatableFields.jsx';
import { uploadImage } from '../api/media.js';
import SectionEyebrow from "../components/SectionEyebrow.jsx";

const API = (import.meta.env.VITE_API_URL ?? '') + '/api/page-heroes';

/** Page keys the API accepts, with the storefront path each one controls. */
const PAGES = [
  { value: 'shop', label: 'Shop', hint: '/shop' },
  { value: 'gallery', label: 'Gallery', hint: '/gallery' },
  { value: 'art-classes', label: 'Art classes', hint: '/art-classes' },
  { value: 'custom-order', label: 'Custom order', hint: '/custom-order' },
  { value: 'blog', label: 'Studio journal', hint: '/blog' },
  { value: 'contact', label: 'Contact', hint: '/contact' },
  { value: 'track-order', label: 'Track order', hint: '/track-order' },
  { value: 'wishlist', label: 'Wishlist', hint: '/wishlist' },
  { value: 'cart', label: 'Cart', hint: '/cart' },
];

const atLeastOne = (list) => (Array.isArray(list) && list.length ? list : ['']);

const fromApi = (doc) => ({
  sectionLabel: doc?.sectionLabel ?? '',
  headingLines: atLeastOne(doc?.headingLines),
  intro: doc?.intro ?? '',
  tags: atLeastOne(doc?.tags),
  ctaLabel: doc?.ctaLabel ?? '',
  ctaHref: doc?.ctaHref ?? '',
  image: doc?.image ?? '',
});

const PageHeroesPage = () => {
  const [heroes, setHeroes] = useState({});     // key -> doc
  const [active, setActive] = useState(PAGES[0].value);
  const [form, setForm] = useState(fromApi(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(API);
      const map = Object.fromEntries((data.items || []).map((d) => [d.key, d]));
      setHeroes(map);
      setForm(fromApi(map[active]));
    } catch (err) {
      toast.error('Failed to load page mastheads: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
    // `active` is deliberately omitted: switching pages is handled by the
    // click handler, which already has the loaded map in hand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const switchTo = (key) => {
    setActive(key);
    setForm(fromApi(heroes[key]));
    setError('');
  };

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, { folder: 'pages' });
      set('image', url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.headingLines.some((l) => l.trim())) {
      setError('At least one heading line is required.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.put(`${API}/${active}`, form);
      setHeroes((h) => ({ ...h, [active]: data }));
      setForm(fromApi(data));
      toast.success('Masthead saved — live on the site now');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const current = PAGES.find((p) => p.value === active);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        {Array.from({ length: 2 }).map((_, i) => <div key={i} className="panel h-64 animate-pulse bg-paper-dim" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Page mastheads</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5 max-w-xl">
            The headline block at the top of each storefront page. The home
            page uses <strong>Home sliders</strong> instead, and the About page
            masthead lives on <strong>Artist profile</strong>.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={load} disabled={saving}>
          <RotateCcw size={14} /> Discard changes
        </button>
      </div>

      {/* Page picker — tabs on wide screens, a select on narrow ones. */}
      <div className="panel panel-pad mb-5">
        <span className="label">Page</span>
        <div className="hidden md:flex flex-wrap gap-1.5">
          {PAGES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => switchTo(p.value)}
              aria-pressed={active === p.value}
              className={`px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.11em] border transition-colors ${
                active === p.value
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-transparent text-graphite border-rule-strong hover:border-ink hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="md:hidden">
          <Select value={active} onChange={switchTo} options={PAGES} aria-label="Page" />
        </div>
        <p className="text-[0.76rem] text-slate mt-3">
          Editing the masthead for <span className="font-mono text-vermillion">{current?.hint}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-24" noValidate>
        {error && (
          <div role="alert" className="border border-vermillion-dark/40 bg-vermillion-wash text-vermillion-dark px-4 py-2.5 text-[0.85rem]">
            {error}
          </div>
        )}

        <section className="panel panel-pad flex flex-col gap-4">
          <div>
            <label htmlFor="ph-label" className="label">Section label</label>
            <input id="ph-label" className="field sm:max-w-xs" value={form.sectionLabel}
              onChange={(e) => set('sectionLabel', e.target.value)} placeholder="The Collection" />
            <p className="text-[0.76rem] text-slate mt-1.5">The small red line above the headline.</p>
          </div>

          <ListEditor
            label="Heading lines"
            hint="Each line animates in separately — break the headline where you want it to wrap."
            values={form.headingLines}
            onChange={(v) => set('headingLines', v)}
            addLabel="Add line"
            placeholder="Learn,"
          />

          <div>
            <label htmlFor="ph-intro" className="label">Intro paragraph</label>
            <textarea id="ph-intro" rows={3} className="field resize-y" value={form.intro}
              onChange={(e) => set('intro', e.target.value)} />
          </div>

          <ListEditor
            label="Tags"
            hint="Small pills under the intro. Leave empty to hide them."
            values={form.tags}
            onChange={(v) => set('tags', v)}
            addLabel="Add tag"
            placeholder="Beginner friendly"
          />
        </section>

        <section className="panel panel-pad flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ph-cta" className="label">Button text</label>
              <input id="ph-cta" className="field" value={form.ctaLabel}
                onChange={(e) => set('ctaLabel', e.target.value)} placeholder="Browse the shop" />
              <p className="text-[0.76rem] text-slate mt-1.5">Leave empty to hide the button.</p>
            </div>
            <div>
              <span className="label">Button link</span>
              <LinkPicker id="ph-href" value={form.ctaHref} onChange={(v) => set('ctaHref', v)} />
            </div>
          </div>

          <div>
            <span className="label">Masthead image</span>
            <div className="flex items-start gap-4 flex-wrap">
              <label className="btn btn-ghost cursor-pointer">
                <input ref={fileRef} type="file" accept="image/*" className="sr-only"
                  onChange={handleImage} disabled={uploading} />
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                {uploading ? 'Uploading…' : 'Choose image'}
              </label>
              {form.image && (
                <div className="relative">
                  <img src={form.image} alt="Masthead preview" className="w-40 h-24 object-cover border border-rule" />
                  <button type="button" onClick={() => set('image', '')}
                    className="absolute top-0 right-0 bg-ink text-paper p-1" aria-label="Remove image">
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-[0.76rem] text-slate mt-2">
              Optional. Pages that already have their own artwork (the classes film, the gallery grid) ignore this.
            </p>
          </div>
        </section>

        <div className="sticky bottom-0 -mx-1 px-1 py-4 bg-paper border-t border-ink flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save masthead</>}
          </button>
          <span className="text-[0.78rem] text-slate">Saving affects only the {current?.label} page.</span>
        </div>
      </form>
    </div>
  );
};

export default PageHeroesPage;
