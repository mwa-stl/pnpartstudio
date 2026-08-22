import React, { useCallback, useEffect, useState } from "react";
import {
  Image as ImageIcon, Trash2, Plus, Pencil, Save, X, Upload, Loader2, RefreshCw,
  Film, Play
} from "lucide-react";
import axios from "axios";
import Select from "../components/ui/Select.jsx";
import { uploadMedia, formatBytes } from "../api/media.js";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import useConfirm from "../hooks/useConfirm.js";
import { toast } from "react-toastify";
import SectionEyebrow from "../components/SectionEyebrow.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const GALLERY_URL = `${API_BASE}/api/gallery`;

axios.defaults.withCredentials = true;

const isVideoFile = (file) => Boolean(file?.type?.startsWith("video/"));

/** Media the gallery accepts: still images and short films of the studio. */
const ACCEPT = "image/*,video/mp4,video/quicktime,video/webm,video/x-matroska";

const categories = ["Paintings", "Handcrafted Items", "Exhibitions", "Other"];

const fallbackImg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="#e8e0d2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8b8279" font-size="16" font-family="sans-serif">Image</text></svg>`
)}`;

const emptyForm = () => ({
  title: "", category: "Paintings", year: new Date().getFullYear(),
  medium: "", description: "", file: null,
});

/**
 * Shared form fields for add + edit.
 *
 * Defined at module scope on purpose. Declared inside GalleryPage it was a
 * brand-new component type on every render, so React tore down the subtree
 * and rebuilt it after each keystroke — the inputs lost focus every letter.
 * `busy` and `progress` therefore come in as props rather than by closure.
 */
const FormFields = ({ form, setFormState, fileKey, fileLabel, currentSrc, busy, progress }) => (
  <>
    <div>
      <span className="label">{fileLabel} {fileKey === "file" && <span className="text-vermillion">*</span>}</span>
      <label className="block border border-dashed border-rule-strong px-3 py-5 text-center cursor-pointer hover:border-vermillion transition-colors bg-paper-dim">
        <input
          type="file" accept={ACCEPT} className="sr-only"
          onChange={(e) => setFormState(f => ({ ...f, [fileKey]: e.target.files?.[0] || null }))}
          disabled={busy}
        />
        {form[fileKey] ? (
          <span className="flex flex-col items-center gap-2">
            {isVideoFile(form[fileKey]) ? (
              <span className="h-24 w-24 border border-rule bg-ink text-paper flex items-center justify-center">
                <Film size={26} />
              </span>
            ) : (
              <img src={URL.createObjectURL(form[fileKey])} alt="Preview" className="h-24 w-24 object-cover border border-rule" />
            )}
            <span className="text-[0.78rem] text-graphite truncate max-w-full">{form[fileKey].name}</span>
            <span className="text-[0.72rem] text-slate">
              {formatBytes(form[fileKey].size)}
              {isVideoFile(form[fileKey]) ? " · will be compressed to MP4" : " · will be converted to WebP"}
            </span>
          </span>
        ) : currentSrc ? (
          <span className="flex flex-col items-center gap-2">
            <img src={currentSrc} alt="Current" className="h-24 w-24 object-cover border border-rule" />
            <span className="text-[0.78rem] text-slate">Click to replace</span>
          </span>
        ) : (
          <span className="flex flex-col items-center text-slate text-[0.85rem]">
            <Upload size={22} className="mb-2 text-vermillion" /> Click to choose an image or video
          </span>
        )}
      </label>
      {busy && progress > 0 && (
        <div className="mt-2.5">
          <div className="h-1.5 bg-paper-deep overflow-hidden">
            <div className="h-full bg-vermillion transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[0.72rem] text-slate mt-1.5 tabular-nums">
            {progress < 100 ? `Uploading ${progress}%` : "Processing on the server…"}
          </p>
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="label">Title</label>
        <input className="field" value={form.title}
          onChange={(e) => setFormState(f => ({ ...f, title: e.target.value }))} placeholder="Untitled" />
      </div>
      <div>
        <label className="label">Category</label>
        <Select
          value={form.category}
          onChange={(v) => setFormState(f => ({ ...f, category: v }))}
          options={categories}
          aria-label="Category"
        />
      </div>
      <div>
        <label className="label">Year</label>
        <input type="number" className="field" value={form.year}
          onChange={(e) => setFormState(f => ({ ...f, year: e.target.value }))} />
      </div>
      <div>
        <label className="label">Medium</label>
        <input className="field" value={form.medium}
          onChange={(e) => setFormState(f => ({ ...f, medium: e.target.value }))} placeholder="Acrylic on canvas" />
      </div>
    </div>

    <div>
      <label className="label">Description</label>
      <textarea className="field resize-y" rows={3} value={form.description}
        onChange={(e) => setFormState(f => ({ ...f, description: e.target.value }))} />
    </div>
  </>
);

const GalleryPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filterCategory, setFilterCategory] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm());

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ ...emptyForm(), replaceFile: null });

  const filteredItems = filterCategory === "all"
    ? items
    : items.filter(item => item.category === filterCategory);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key !== "Escape" || busy) return;
      if (addOpen) setAddOpen(false);
      if (editOpen) setEditOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [addOpen, editOpen, busy]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(GALLERY_URL, { withCredentials: true });
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setAddForm(emptyForm()); setAddOpen(true); };

  const submitAdd = async (e) => {
    e?.preventDefault?.();
    if (!addForm.file) { toast.error("Please select an image or video"); return; }
    try {
      setBusy(true);
      setProgress(0);
      const media = await uploadMedia(addForm.file, { folder: "gallery", onProgress: setProgress });

      const item = {
        title: addForm.title?.trim() || "Untitled",
        category: addForm.category || "Paintings",
        year: Number(addForm.year) || new Date().getFullYear(),
        medium: addForm.medium || "",
        description: addForm.description || "",
        type: media.type,
        src: media.url,
        storagePath: media.path,
        poster: media.poster || "",
        posterPath: media.posterPath || "",
        duration: media.duration || 0,
        width: media.width || 0,
        height: media.height || 0,
        tags: [],
      };

      let res;
      try {
        res = await axios.post(GALLERY_URL, { items: [item] }, {
          headers: { "Content-Type": "application/json" }, withCredentials: true,
        });
      } catch (err) {
        // Older API shape fallback
        if (err?.response?.status === 400) {
          res = await axios.post(GALLERY_URL, {
            images: [{ ...media }],
            meta: {
              title: item.title, category: item.category, year: item.year,
              medium: item.medium, description: item.description, tags: item.tags,
            },
          }, { headers: { "Content-Type": "application/json" }, withCredentials: true });
        } else throw err;
      }

      const created = Array.isArray(res.data?.items) ? res.data.items : [];
      setItems((prev) => [...created, ...prev]);
      setAddOpen(false);
      toast.success(
        media.type === "video"
          ? `Video compressed to ${formatBytes(media.bytes)} and added`
          : `Image converted to WebP (${formatBytes(media.bytes)}) and added`
      );
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || "Add failed");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const startEdit = (item) => {
    setEditItem(item);
    setEditForm({
      title: item.title || "Untitled",
      category: item.category || "Paintings",
      year: item.year || new Date().getFullYear(),
      medium: item.medium || "",
      description: item.description || "",
      replaceFile: null,
    });
    setEditOpen(true);
  };

  const saveEdit = async (e) => {
    e?.preventDefault?.();
    if (!editItem?._id) { toast.error("Invalid item id"); return; }
    try {
      setBusy(true);
      let body = {
        title: editForm.title?.trim() || "Untitled",
        category: editForm.category || "Paintings",
        year: Number(editForm.year) || new Date().getFullYear(),
        medium: editForm.medium || "",
        description: editForm.description || "",
      };

      if (editForm.replaceFile) {
        setProgress(0);
        const media = await uploadMedia(editForm.replaceFile, { folder: "gallery", onProgress: setProgress });
        body = {
          ...body,
          type: media.type,
          src: media.url,
          storagePath: media.path,
          poster: media.poster || "",
          posterPath: media.posterPath || "",
          duration: media.duration || 0,
          width: media.width || 0,
          height: media.height || 0,
          // Tells the API to drop the file this one replaces.
          oldStoragePath: editItem.storagePath || "",
        };
      }

      const { data } = await axios.patch(`${GALLERY_URL}/${editItem._id}`, body, {
        headers: { "Content-Type": "application/json" }, withCredentials: true,
      });

      setItems((arr) => arr.map((g) => (String(g._id) === String(editItem._id) ? { ...g, ...data } : g)));
      setEditOpen(false);
      setEditItem(null);
      toast.success("Gallery item updated");
    } catch (e) {
      console.error(e);
      toast.error("Update failed");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const removeAt = (item) => confirm.ask({
    title: "Delete this gallery item?",
    description: "It is removed from the public gallery immediately. This cannot be undone.",
    item: {
      label: item.title || "Untitled",
      image: item.type === "video" ? item.poster : (item.src || item.url),
      meta: [
        ["Type", item.type === "video" ? "Video" : "Image"],
        item.category && ["Collection", item.category],
        item.medium && ["Medium", item.medium],
        item.year && ["Year", String(item.year)],
      ],
    },
    onConfirm: async () => {
      try {
        await axios.delete(`${GALLERY_URL}/${encodeURIComponent(item._id)}`, { withCredentials: true });
        setItems((arr) => arr.filter((g) => String(g._id) !== String(item._id)));
        toast.success("Removed");
      } catch (e) {
        console.error(e);
        toast.error("Delete failed");
      }
    },
  });

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Gallery</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5">
            Artwork archive shown on the storefront gallery page. Images are
            converted to WebP and videos compressed to MP4 on upload.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={15} /> Add media
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="panel panel-pad mb-6 flex flex-wrap gap-2 items-center">
        <button
          className={`btn btn-sm ${filterCategory === "all" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setFilterCategory("all")}
        >
          All <span className="opacity-60">({items.length})</span>
        </button>
        {categories.map(cat => {
          const count = items.filter(i => i.category === cat).length;
          return (
            <button
              key={cat}
              className={`btn btn-sm ${filterCategory === cat ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="panel aspect-square animate-pulse bg-paper-dim" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="panel py-20 text-center">
          <ImageIcon size={26} className="mx-auto text-slate mb-4" />
          <p className="text-graphite mb-5">
            {filterCategory === "all" ? "Nothing in the gallery yet." : `Nothing in ${filterCategory}.`}
          </p>
          <button className="btn btn-primary mx-auto" onClick={openAdd}>
            <Plus size={15} /> Add media
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((g, i) => {
            const key = g._id || g.src || g.url || i;
            const src = g.src || g.url || fallbackImg;
            return (
              <article key={key} className="panel overflow-hidden flex flex-col group">
                <div className="relative aspect-square bg-paper-dim overflow-hidden">
                  <img
                    src={g.type === "video" ? (g.poster || fallbackImg) : src}
                    alt={g.title || "Gallery item"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = fallbackImg; }}
                  />
                  {g.type === "video" && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 bg-ink text-paper px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.12em]">
                      <Play size={10} fill="currentColor" />
                      {g.duration ? `${Math.round(g.duration)}s` : "Video"}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2 flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-gradient-to-t from-ink/70 to-transparent">
                    <button className="btn btn-ghost btn-sm !px-2 !bg-surface" onClick={() => startEdit(g)}
                      aria-label={`Edit ${g.title || "image"}`}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-danger btn-sm !px-2 !bg-surface" onClick={() => removeAt(g)}
                      aria-label={`Delete ${g.title || "image"}`}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="px-3.5 py-3">
                  <p className="font-medium text-[0.86rem] text-ink truncate">{g.title || "Untitled"}</p>
                  <p className="text-[0.7rem] text-slate mt-0.5 truncate">
                    {[g.category, g.year].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      {addOpen && (
        <div className="modal-backdrop" onClick={() => !busy && setAddOpen(false)}>
          <div className="modal-card max-w-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-gallery-title">
            <div className="modal-head flex items-center justify-between px-6 py-4">
              <h2 id="add-gallery-title" className="page-title !text-[1.2rem]">Add gallery image</h2>
              <button className="btn btn-ghost btn-sm !px-2" onClick={() => setAddOpen(false)} aria-label="Close" disabled={busy}>
                <X size={16} />
              </button>
            </div>
            <form className="modal-form" onSubmit={submitAdd}>
              <div className="modal-body px-6 py-5 flex flex-col gap-4">
              <FormFields form={addForm} setFormState={setAddForm} fileKey="file" fileLabel="Image or video" busy={busy} progress={progress} />
              </div>
              <div className="modal-foot px-6 py-4 flex gap-2">
                <button type="submit" className="btn btn-primary flex-1" disabled={busy || !addForm.file}>
                  {busy ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : <><Save size={15} /> Add to gallery</>}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)} disabled={busy}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && editItem && (
        <div className="modal-backdrop" onClick={() => !busy && setEditOpen(false)}>
          <div className="modal-card max-w-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-gallery-title">
            <div className="modal-head flex items-center justify-between px-6 py-4">
              <h2 id="edit-gallery-title" className="page-title !text-[1.2rem]">Edit gallery image</h2>
              <button className="btn btn-ghost btn-sm !px-2" onClick={() => setEditOpen(false)} aria-label="Close" disabled={busy}>
                <X size={16} />
              </button>
            </div>
            <form className="modal-form" onSubmit={saveEdit}>
              <div className="modal-body px-6 py-5 flex flex-col gap-4">
              <FormFields
                form={editForm}
                setFormState={setEditForm}
                fileKey="replaceFile"
                fileLabel="Replace media"
                currentSrc={editItem.src || editItem.url}
                busy={busy}
                progress={progress}
              />
              </div>
              <div className="modal-foot px-6 py-4 flex gap-2">
                <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
                  {busy ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save changes</>}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(false)} disabled={busy}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirm.props} />
    </div>
  );
};

export default GalleryPage;
