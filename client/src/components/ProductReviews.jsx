import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Star, Loader2, Check, ImagePlus, X } from "lucide-react";
import Reveal from "./motion/Reveal";
import { uploadPublicImage, MAX_REVIEW_PHOTOS } from "../api/media";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const fmtDate = (iso) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date(iso));

/** Read-only star row. */
export const Stars = ({ rating, size = 13 }) => {
  const n = Number(rating) || 0;
  return (
    <span className="inline-flex gap-0.5 align-middle" aria-label={`${n} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={1.6}
          className={i < Math.round(n) ? "text-vermillion" : "text-rule-strong"}
          fill={i < Math.round(n) ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
};

/** The star picker in the form — a radio group, so it is keyboard usable. */
const StarInput = ({ value, onChange, disabled }) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div
      role="radiogroup"
      aria-label="Your rating"
      className="flex items-center gap-1"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="p-0.5 disabled:cursor-not-allowed transition-transform duration-200 hover:scale-110"
        >
          <Star
            size={24}
            strokeWidth={1.5}
            className={n <= shown ? "text-vermillion" : "text-rule-strong"}
            fill={n <= shown ? "currentColor" : "none"}
          />
        </button>
      ))}
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-slate ml-3">
        {value ? `${value} / 5` : "Pick a rating"}
      </span>
    </div>
  );
};

const emptyForm = { name: "", email: "", rating: 0, title: "", body: "", photos: [] };

/**
 * Public ratings and reviews for one product.
 *
 * There are no customer accounts on this site, so anyone can post. The server
 * rate limits writes and enforces one review per email per product; the
 * studio removes fakes from the admin console.
 */
const ProductReviews = ({ productId, productTitle }) => {
  const [data, setData] = useState({ items: [], count: 0, average: 0, distribution: {} });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const { data: res } = await axios.get(`${API_BASE}/api/reviews/product/${productId}`);
      setData(res);
    } catch {
      setData({ items: [], count: 0, average: 0, distribution: {} });
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    setForm(emptyForm);
    setDone(false);
    setShowForm(false);
    setError("");
    load();
  }, [productId, load]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  /* Photos upload as they are picked, so the review itself posts instantly
     and a slow connection never blocks the submit button. */
  const addPhotos = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, MAX_REVIEW_PHOTOS - form.photos.length);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const { url } = await uploadPublicImage(file, { folder: "reviews" });
        setForm((f) => ({ ...f, photos: [...f.photos, url].slice(0, MAX_REVIEW_PHOTOS) }));
      }
    } catch (err) {
      setError(err.message || "That photo could not be uploaded.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Please add your name.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Please add a valid email address.");
    if (!form.rating) return setError("Please choose a rating.");
    if (form.body.trim().length < 4) return setError("Please write a little more about the piece.");

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/api/reviews`, { ...form, product: productId });
      setDone(true);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not post your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
    return undefined;
  };

  /** Distribution bars, 5 down to 1. */
  const bars = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((n) => {
        const count = Number(data.distribution?.[n] || 0);
        return { n, count, pct: data.count ? Math.round((count / data.count) * 100) : 0 };
      }),
    [data]
  );

  return (
    <section aria-labelledby="reviews-heading" className="pt-14 border-t border-ink">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
        <div>
          <div className="section-index mb-6">Reviews</div>
          <h2 id="reviews-heading" className="t-display">What buyers say</h2>
        </div>
        {!showForm && (
          <button type="button" className="btn-k btn-k-sm btn-k-outline" onClick={() => { setShowForm(true); setDone(false); }}>
            Write a review
          </button>
        )}
      </div>

      {done && (
        <div role="status" className="border-l-2 border-vermillion pl-5 py-3 mb-9">
          <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-vermillion mb-1.5">Posted</div>
          <p className="text-[0.92rem] text-graphite">Thank you — your review is live on this page.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 lg:gap-16">
        {/* Summary */}
        <div className="lg:sticky lg:top-28 lg:self-start bg-paper">
          {loading ? (
            <div className="h-40 bg-paper-deep animate-pulse" />
          ) : data.count === 0 ? (
            <div className="border border-rule p-6">
              <p className="text-graphite text-[0.9rem] leading-relaxed">
                No reviews yet. If you own this piece, yours would be the first.
              </p>
            </div>
          ) : (
            <div className="border border-ink">
              <div className="p-6 border-b border-rule">
                <div className="flex items-baseline gap-2 mb-2">
                  <span
                    className="text-ink tabular-nums leading-none"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "clamp(2.4rem,5vw,3.2rem)", letterSpacing: "-0.03em" }}
                  >
                    {data.average.toFixed(1)}
                  </span>
                  <span className="font-mono text-[0.72rem] text-slate">/ 5.0</span>
                </div>
                <Stars rating={data.average} size={15} />
                <div className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-slate mt-3">
                  {data.count} review{data.count === 1 ? "" : "s"}
                </div>
              </div>

              <ul className="p-6 flex flex-col gap-2.5">
                {bars.map(({ n, count, pct }) => (
                  <li key={n} className="flex items-center gap-3">
                    <span className="font-mono text-[0.6rem] text-slate tabular-nums w-3">{n}</span>
                    <Star size={11} className="text-rule-strong shrink-0" />
                    <span className="flex-1 h-1.5 bg-paper-deep overflow-hidden">
                      <span className="block h-full bg-vermillion transition-[width] duration-700" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="font-mono text-[0.6rem] text-slate tabular-nums w-5 text-right">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Form + list */}
        <div className="min-w-0">
          {showForm && (
            <form onSubmit={submit} noValidate className="border border-ink p-6 sm:p-8 mb-10">
              <h3 className="t-title mb-1">Review “{productTitle}”</h3>
              <p className="text-graphite text-[0.86rem] mb-7">
                Your name and review are shown publicly. Your email is not — it is
                only used to keep one review per person.
              </p>

              {error && (
                <div role="alert" className="border border-vermillion bg-vermillion-wash text-vermillion-dark px-4 py-2.5 text-[0.85rem] mb-6">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <span className="label-k">Rating <span className="text-vermillion">*</span></span>
                <StarInput value={form.rating} onChange={(v) => set("rating", v)} disabled={submitting} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div>
                  <label htmlFor="rv-name" className="label-k">Your name <span className="text-vermillion">*</span></label>
                  <input id="rv-name" className="field-k" value={form.name} disabled={submitting}
                    onChange={(e) => set("name", e.target.value)} maxLength={60} autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="rv-email" className="label-k">Email <span className="text-vermillion">*</span></label>
                  <input id="rv-email" type="email" className="field-k" value={form.email} disabled={submitting}
                    onChange={(e) => set("email", e.target.value)} maxLength={160} autoComplete="email"
                    placeholder="Not shown publicly" />
                </div>
              </div>

              <div className="mb-5">
                <label htmlFor="rv-title" className="label-k">Headline</label>
                <input id="rv-title" className="field-k" value={form.title} disabled={submitting}
                  onChange={(e) => set("title", e.target.value)} maxLength={120}
                  placeholder="Sums up your review in a few words" />
              </div>

              <div className="mb-7">
                <label htmlFor="rv-body" className="label-k">Your review <span className="text-vermillion">*</span></label>
                <textarea id="rv-body" rows={5} className="field-k resize-y" value={form.body} disabled={submitting}
                  onChange={(e) => set("body", e.target.value)} maxLength={2000}
                  placeholder="How does it look in the room? How was it packed?" />
                <div className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-slate mt-2 text-right tabular-nums">
                  {form.body.length} / 2000
                </div>
              </div>

              {/* Photos — optional, and the most useful thing a buyer can add. */}
              <div className="mb-7">
                <span className="label-k">Photos <span className="text-slate normal-case tracking-normal font-sans">(optional, up to {MAX_REVIEW_PHOTOS})</span></span>
                <div className="flex flex-wrap gap-2.5">
                  {form.photos.map((url, i) => (
                    <div key={url} className="relative w-20 h-20 border border-rule">
                      <img src={url} alt={`Your photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => set("photos", form.photos.filter((p) => p !== url))}
                        className="absolute top-0 right-0 bg-ink text-paper p-1 hover:bg-vermillion transition-colors"
                        aria-label={`Remove photo ${i + 1}`}
                        disabled={submitting}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}

                  {form.photos.length < MAX_REVIEW_PHOTOS && (
                    <label className={`w-20 h-20 border border-dashed border-rule-strong flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-vermillion transition-colors ${uploading || submitting ? "opacity-50 pointer-events-none" : ""}`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        disabled={uploading || submitting}
                        onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }}
                      />
                      {uploading
                        ? <Loader2 size={18} className="animate-spin text-vermillion" />
                        : <ImagePlus size={18} className="text-vermillion" />}
                      <span className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-slate">
                        {uploading ? "Adding" : "Add"}
                      </span>
                    </label>
                  )}
                </div>
                <p className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-slate mt-2.5">
                  Show the piece in your space — photos are public alongside your review.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button type="submit" className="btn-k" disabled={submitting || uploading}>
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Posting…</> : <>Post review <Check size={14} /></>}
                </button>
                <button type="button" className="btn-k btn-k-ghost" onClick={() => { setShowForm(false); setError(""); }} disabled={submitting}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-paper-deep animate-pulse" />)}
            </div>
          ) : data.items.length === 0 ? (
            !showForm && (
              <div className="border border-rule p-8 text-center">
                <p className="text-graphite mb-6">Nobody has reviewed this piece yet.</p>
                <button type="button" className="btn-k btn-k-sm" onClick={() => setShowForm(true)}>
                  Be the first
                </button>
              </div>
            )
          ) : (
            <ul className="border-t border-ink">
              {data.items.map((r, i) => (
                <Reveal key={r._id} delay={Math.min(i, 4) * 0.05}>
                  <li className="py-4 border-b border-rule">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mb-2">
                      {r.avatarUrl && (
                        <img src={r.avatarUrl} alt="" className="w-5 h-5 rounded-full border border-rule shrink-0" />
                      )}
                      <Stars rating={r.rating} />
                      <span className="font-mono text-[0.64rem] uppercase tracking-[0.1em] text-ink">{r.name}</span>
                      <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-slate ml-auto">
                        {fmtDate(r.createdAt)}
                      </span>
                    </div>
                    {r.title && <h3 className="t-title !text-[0.94rem] mb-1">{r.title}</h3>}
                    <p className="text-graphite text-[0.86rem] leading-normal whitespace-pre-line max-w-2xl">{r.body}</p>

                    {r.photos?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {r.photos.map((url, n) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setLightbox(url)}
                            className="w-16 h-16 border border-rule overflow-hidden hover:border-ink transition-colors"
                            aria-label={`View photo ${n + 1} from ${r.name}`}
                          >
                            <img
                              src={url}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover hover:scale-[1.06] transition-transform duration-500"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-[1100] bg-ink/90 flex items-center justify-center p-4"
          onClick={() => setLightbox("")}
          role="dialog"
          aria-modal="true"
          aria-label="Review photo"
        >
          <button
            type="button"
            onClick={() => setLightbox("")}
            className="absolute top-5 right-5 w-10 h-10 border border-paper/40 text-paper hover:bg-paper hover:text-ink transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <img
            src={lightbox}
            alt="Review photo"
            className="max-w-full max-h-[88vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
};

export default ProductReviews;
