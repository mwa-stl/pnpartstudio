import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Edit2, Trash2, Plus, Star, X, Loader2, UploadCloud, MessageSquareQuote } from "lucide-react";
import { toast } from "react-toastify";
import { uploadImage } from "../api/media.js";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import useConfirm from "../hooks/useConfirm.js";
import SectionEyebrow from "../components/SectionEyebrow.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const TESTIMONIALS_URL = `${API_BASE}/api/testimonials`;

const blank = { name: '', city: '', rating: '5', imageUrl: '', review: '' };

const Stars = ({ rating }) => {
  const n = Number(rating) || 0;
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={12} className={i < n ? "text-vermillion" : "text-rule-strong"} fill={i < n ? "currentColor" : "none"} />
      ))}
    </span>
  );
};

const TestimonialsPage = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTestimonial, setEditTestimonial] = useState(null);
  const confirm = useConfirm();

  const fetchTestimonials = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(TESTIMONIALS_URL);
      setTestimonials(Array.isArray(data?.testimonials) ? [...data.testimonials] : []);
    } catch {
      setTestimonials([]);
      toast.error("Could not load testimonials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTestimonials(); }, [fetchTestimonials]);

  const handleAdd = () => { setEditTestimonial(null); setShowModal(true); };
  const handleEdit = (t) => { setEditTestimonial(t); setShowModal(true); };

  const handleDelete = (t) => confirm.ask({
    title: "Delete this testimonial?",
    description: "It is removed from the storefront review carousel immediately. This cannot be undone.",
    item: {
      label: t.name,
      image: t.imageUrl,
      meta: [
        t.city && ["City", t.city],
        ["Rating", `${t.rating}/5`],
        t.review && ["Review", `${String(t.review).slice(0, 90)}${String(t.review).length > 90 ? "…" : ""}`],
      ],
    },
    onConfirm: async () => {
      try {
        await axios.delete(`${TESTIMONIALS_URL}/${t._id}`);
        toast.success("Testimonial deleted");
        fetchTestimonials();
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
          <h2 className="page-title">Testimonials</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5">Shown in the storefront review carousel.</p>
        </div>
        <button className="btn btn-primary" onClick={handleAdd}>
          <Plus size={15} /> Add testimonial
        </button>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-5 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-paper-dim animate-pulse" />
            ))}
          </div>
        ) : testimonials.length === 0 ? (
          <div className="py-20 text-center">
            <MessageSquareQuote size={26} className="mx-auto text-slate mb-4" />
            <p className="text-graphite mb-5">No testimonials yet.</p>
            <button className="btn btn-primary mx-auto" onClick={handleAdd}>
              <Plus size={15} /> Add the first one
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-k">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Name &amp; city</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {testimonials.map(t => (
                  <tr key={t._id}>
                    <td>
                      {t.imageUrl
                        ? <img src={t.imageUrl} alt="" className="w-11 h-11 object-cover rounded-full border border-rule" loading="lazy" />
                        : <div className="w-11 h-11 bg-paper-dim rounded-full border border-rule" />}
                    </td>
                    <td className="min-w-[130px]">
                      <div className="font-semibold text-ink leading-tight">{t.name}</div>
                      <div className="text-[0.74rem] text-slate mt-0.5">{t.city}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      <Stars rating={t.rating} />
                      <div className="text-[0.7rem] text-slate mt-1">{t.rating}/5</div>
                    </td>
                    <td className="max-w-[360px]">
                      <p className="text-graphite text-[0.82rem] line-clamp-2">{t.review}</p>
                    </td>
                    <td>
                      <div className="flex gap-1.5 justify-end">
                        <button className="btn btn-ghost btn-sm !px-2" onClick={() => handleEdit(t)}
                          aria-label={`Edit testimonial from ${t.name}`}>
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-danger btn-sm !px-2" onClick={() => handleDelete(t)}
                          aria-label={`Delete testimonial from ${t.name}`}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TestimonialUploadModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => { setEditTestimonial(null); fetchTestimonials(); }}
        editTestimonial={editTestimonial}
      />

      <ConfirmDialog {...confirm.props} />
    </div>
  );
};

function TestimonialUploadModal({ show, onClose, onSuccess, editTestimonial }) {
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    if (show) {
      setForm(editTestimonial ? { ...editTestimonial } : { ...blank });
      setError('');
    }
  }, [editTestimonial, show]);

  useEffect(() => {
    if (!show) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !submitting) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, submitting, onClose]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { url } = await uploadImage(file, { folder: 'testimonials' });
      setForm((f) => ({ ...f, imageUrl: url }));
      toast.success("Image uploaded");
    } catch (err) {
      setError(err.message || "Image upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { name, city, rating, review, imageUrl } = form;
    if (!name || !city || !rating || !review || !imageUrl) {
      setError("All fields, including an uploaded image, are required.");
      return;
    }
    setSubmitting(true);
    try {
      if (editTestimonial?._id) {
        await axios.put(`${TESTIMONIALS_URL}/${editTestimonial._id}`, form);
        toast.success('Testimonial updated');
      } else {
        await axios.post(TESTIMONIALS_URL, form);
        toast.success('Testimonial added');
      }
      setForm({ ...blank });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-backdrop" onClick={() => !submitting && onClose()}>
      <div
        className="modal-card max-w-md"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="testimonial-modal-title"
      >
        <div className="modal-head flex items-center justify-between px-6 py-4">
          <h2 id="testimonial-modal-title" className="page-title !text-[1.2rem]">
            {editTestimonial ? "Edit testimonial" : "Add testimonial"}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm !px-2" aria-label="Close" disabled={submitting}>
            <X size={16} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          <div className="modal-body px-6 py-5 flex flex-col gap-4">
          {error && (
            <div role="alert" className="border border-vermillion-dark/40 bg-vermillion-wash text-vermillion-dark px-4 py-2.5 text-[0.85rem]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="t-name" className="label">Name</label>
              <input id="t-name" className="field" name="name" value={form.name} onChange={handleChange} required autoComplete="off" />
            </div>
            <div>
              <label htmlFor="t-city" className="label">City</label>
              <input id="t-city" className="field" name="city" value={form.city} onChange={handleChange} required autoComplete="off" />
            </div>
          </div>

          <div>
            <label htmlFor="t-rating" className="label">Rating (1–5)</label>
            <input id="t-rating" type="number" min="1" max="5" className="field"
              name="rating" value={form.rating} onChange={handleChange} required />
          </div>

          <div>
            <label htmlFor="t-review" className="label">Review</label>
            <textarea id="t-review" className="field resize-y" name="review" value={form.review}
              onChange={handleChange} required rows={4} placeholder="What did they say?" />
          </div>

          <div>
            <span className="label">Photo</span>
            <label className="block border border-dashed border-rule-strong px-3 py-4 text-center cursor-pointer hover:border-vermillion transition-colors bg-paper-dim">
              <input
                type="file" accept="image/*" ref={fileInputRef} className="sr-only"
                onChange={handleImageChange} disabled={uploading}
              />
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Testimonial portrait" className="mx-auto h-20 w-20 rounded-full object-cover border border-rule" />
              ) : (
                <span className="flex flex-col items-center text-slate text-[0.85rem]">
                  {uploading
                    ? <><Loader2 size={22} className="mb-2 animate-spin text-vermillion" /> Uploading…</>
                    : <><UploadCloud size={22} className="mb-2 text-vermillion" /> Click to upload a photo</>}
                </span>
              )}
            </label>
          </div>

          </div>

          <div className="modal-foot px-6 py-4 flex gap-2">
            <button className="btn btn-primary flex-1" type="submit" disabled={submitting || uploading || !form.imageUrl}>
              {submitting
                ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                : (editTestimonial ? 'Update testimonial' : 'Add testimonial')}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={submitting}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TestimonialsPage;
