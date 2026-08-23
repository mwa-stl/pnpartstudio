import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Edit2, Trash2, Loader2, X, Plus, Images } from "lucide-react";
import ImageDropzone from "../components/ui/ImageDropzone.jsx";
import { toast } from 'react-toastify';
import LinkPicker from '../components/ui/LinkPicker.jsx';
import { uploadImage } from '../api/media.js';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import useConfirm from '../hooks/useConfirm.js';
import SectionEyebrow from "../components/SectionEyebrow.jsx";

const API = (import.meta.env.VITE_API_URL ?? "") + "/api/hero-sliders";

const emptyForm = { image: "", alt: "", eyebrow: "", heading: "", sub: "", ctaLabel: "", ctaHref: "" };

const AdminHeroSliderPage = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSlide, setEditSlide] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const confirm = useConfirm();

  const loadSlides = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(API);
      setSlides(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      toast.error("Failed to fetch slides: " + (err.response?.data?.message || err.message));
      setSlides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSlides(); }, [loadSlides]);

  const openAddModal = () => { setEditSlide(null); setForm(emptyForm); setFormError(""); setShowModal(true); };
  const openEditModal = (slide) => { setEditSlide(slide); setForm(slide); setFormError(""); setShowModal(true); };
  const closeModal = useCallback(() => {
    setEditSlide(null);
    setForm(emptyForm);
    setShowModal(false);
    setUploading(false);
    setSubmitting(false);
    setFormError("");
  }, []);

  useEffect(() => {
    if (!showModal) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !submitting) closeModal(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showModal, submitting, closeModal]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleImageChange = async file => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, { folder: 'hero' });
      setForm(f => ({ ...f, image: url }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFormSubmit = async e => {
    e.preventDefault();
    setFormError("");
    if (!form.image) { setFormError("Please upload an image."); return; }
    if (!form.alt || !form.heading || !form.ctaLabel || !form.ctaHref) {
      setFormError("Alt text, heading, button text, and button link are all required.");
      return;
    }
    setSubmitting(true);
    try {
      if (editSlide?._id) {
        await axios.patch(`${API}/${editSlide._id}`, form);
        toast.success("Slide updated");
      } else {
        await axios.post(API, form);
        toast.success("Slide added");
      }
      closeModal();
      loadSlides();
    } catch (err) {
      setFormError(err?.response?.data?.message || err.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (slide) => confirm.ask({
    title: "Delete this slide?",
    description: "It disappears from the storefront hero carousel straight away. This cannot be undone.",
    item: {
      label: slide.heading,
      image: slide.image,
      meta: [
        slide.eyebrow && ["Eyebrow", slide.eyebrow],
        ["Button", `${slide.ctaLabel} → ${slide.ctaHref}`],
      ],
    },
    onConfirm: async () => {
      try {
        await axios.delete(`${API}/${slide._id}`);
        toast.success("Slide deleted");
        loadSlides();
      } catch {
        toast.error("Delete failed");
      }
    },
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Home sliders</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5">
            Slides shown in the storefront hero carousel, in order.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={15} /> Add slide
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="panel h-80 animate-pulse bg-paper-dim" />
          ))}
        </div>
      ) : slides.length === 0 ? (
        <div className="panel py-20 text-center">
          <Images size={26} className="mx-auto text-slate mb-4" />
          <p className="text-graphite mb-5">No slides yet.</p>
          <button className="btn btn-primary mx-auto" onClick={openAddModal}>
            <Plus size={15} /> Add the first slide
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {slides.map(s => (
            <article key={s._id || s.id} className="panel flex flex-col overflow-hidden">
              <div className="relative">
                <img src={s.image} alt={s.alt} className="w-full h-44 object-cover bg-paper-dim" loading="lazy" />
                {s.eyebrow && (
                  <span className="absolute left-3 top-3 tag tag-red bg-surface/92 backdrop-blur-sm">{s.eyebrow}</span>
                )}
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-[1.05rem] text-ink mb-2" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                  {s.heading}
                </h3>
                {s.sub && <p className="text-graphite text-[0.85rem] mb-3 line-clamp-2">{s.sub}</p>}

                <div className="flex items-center gap-2 flex-wrap text-[0.72rem] mb-4">
                  <span className="tag tag-neutral">{s.ctaLabel}</span>
                  <span className="text-slate font-mono truncate">{s.ctaHref}</span>
                </div>

                <div className="flex gap-2 mt-auto pt-4 border-t border-rule">
                  <button onClick={() => openEditModal(s)} className="btn btn-ghost btn-sm flex-1">
                    <Edit2 size={13} /> Edit
                  </button>
                  <button onClick={() => handleDelete(s)} className="btn btn-danger btn-sm flex-1">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => !submitting && closeModal()}>
          <div className="modal-card max-w-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="slide-modal-title">
            <div className="modal-head flex items-center justify-between px-6 py-4">
              <h2 id="slide-modal-title" className="page-title !text-[1.2rem]">
                {editSlide ? "Edit slide" : "Add slide"}
              </h2>
              <button className="btn btn-ghost btn-sm !px-2" onClick={closeModal} aria-label="Close" disabled={submitting}>
                <X size={16} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleFormSubmit} autoComplete="off" noValidate>
              <div className="modal-body px-6 py-5 flex flex-col gap-4">
              {formError && (
                <div role="alert" className="border border-vermillion-dark/40 bg-vermillion-wash text-vermillion-dark px-4 py-2.5 text-[0.85rem]">
                  {formError}
                </div>
              )}

              <div>
                <ImageDropzone
                  id="hs-image"
                  label="Image"
                  required
                  size="wide"
                  previewUrl={form.image}
                  uploading={uploading}
                  onChange={handleImageChange}
                  onRemove={() => setForm(f => ({ ...f, image: "" }))}
                />
              </div>

              <div>
                <label htmlFor="sl-alt" className="label">Alt text <span className="text-vermillion">*</span></label>
                <input id="sl-alt" name="alt" value={form.alt} onChange={handleChange} required className="field"
                  placeholder="Describes the image for screen readers" />
              </div>
              <div>
                <label htmlFor="sl-eyebrow" className="label">Eyebrow</label>
                <input id="sl-eyebrow" name="eyebrow" value={form.eyebrow} onChange={handleChange} className="field"
                  placeholder="Small label above the heading" />
              </div>
              <div>
                <label htmlFor="sl-heading" className="label">Heading <span className="text-vermillion">*</span></label>
                <input id="sl-heading" name="heading" value={form.heading} onChange={handleChange} required className="field" />
              </div>
              <div>
                <label htmlFor="sl-sub" className="label">Description</label>
                <textarea id="sl-sub" name="sub" rows={3} value={form.sub} onChange={handleChange} className="field resize-y" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sl-ctaLabel" className="label">Button text <span className="text-vermillion">*</span></label>
                  <input id="sl-ctaLabel" name="ctaLabel" value={form.ctaLabel} onChange={handleChange} required className="field" />
                </div>
                <div>
                  <span className="label">Button link <span className="text-vermillion">*</span></span>
                  {/* Picked by page name — an admin should not have to know
                      that commissions live at /custom-order. */}
                  <LinkPicker
                    id="sl-ctaHref"
                    value={form.ctaHref}
                    onChange={(v) => setForm(f => ({ ...f, ctaHref: v }))}
                    allowEmpty={false}
                  />
                </div>
              </div>

              </div>

              <div className="modal-foot px-6 py-4 flex gap-2">
                <button disabled={submitting || uploading} type="submit" className="btn btn-primary flex-1">
                  {submitting ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : (editSlide ? "Update slide" : "Add slide")}
                </button>
                <button type="button" onClick={closeModal} className="btn btn-ghost" disabled={submitting}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirm.props} />
    </div>
  );
};

export default AdminHeroSliderPage;
