import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Edit2, Trash2, Image as ImageIcon, Plus, Maximize2, X,
  ChevronLeft, ChevronRight, Droplets, Save, Loader2, RefreshCw, Search, Package
} from "lucide-react";
import axios from "axios";
import Select from "../components/ui/Select.jsx";
import ImageDropzone from "../components/ui/ImageDropzone.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import useConfirm from "../hooks/useConfirm.js";
import { toast } from "react-toastify";
import { applyWatermark, uploadWatermarked, urlToFile } from "../utils/watermark.js";
import { WatermarkPositionModal } from "../components/WatermarkModal.jsx";
import SectionEyebrow from "../components/SectionEyebrow.jsx";
import { getCategories } from "../api/categories.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const PRODUCTS_URL = `${API_BASE}/api/products`;
axios.defaults.withCredentials = true;

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const EMPTY_PRODUCT = {
  id: "", title: "", category: "", subcategory: "", subsubcategory: "", categoryPath: [], price: "", salePrice: "", stock: 1,
  images: [], description: "", storyBehindArt: "", published: true, dimensions: "", color: "",
  inStock: true, featured: false, donated: false, contactForPrice: false
};

const toCapitalWords = (str) => String(str || "").toLowerCase().replace(/\b(\w)/g, (s) => s.toUpperCase());

const mapProductFromApi = (doc) => {
  const images = Array.isArray(doc?.images) ? doc.images.filter(Boolean) : [];
  return {
    id: doc._id, title: doc.title || "", category: doc.category || "", subcategory: doc.subcategory || "",
    subsubcategory: doc.subsubcategory || "",
    // Full picker path older products predate this field, so fall back to
    // reconstructing it from the three legacy fields they do have.
    categoryPath: Array.isArray(doc.categoryPath) && doc.categoryPath.length
      ? doc.categoryPath.map(String)
      : [doc.category, doc.subcategory, doc.subsubcategory].filter(Boolean),
    price: typeof doc.price === "number" ? doc.price : "",
    salePrice: doc.salePrice === null ? null : (typeof doc.salePrice === "number" ? doc.salePrice : null),
    stock: typeof doc.stock === "number" ? doc.stock : 0, images, description: doc.description || "",
    storyBehindArt: doc.storyBehindArt || "",
    published: !!doc.published, slug: doc.slug || "", dimensions: doc.dimensions || "",
    color: toCapitalWords(doc.color || ""),
    inStock: typeof doc?.inStock === "boolean" ? doc.inStock : (typeof doc?.stock === "number" ? doc.stock > 0 : true),
    featured: !!doc?.featured,
    donated: !!doc?.donated,
    contactForPrice: !!doc?.contactForPrice
  };
};

const IMG_FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" fill="#e8e0d2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8b8279" font-size="10" font-family="sans-serif">No image</text></svg>`
);

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const confirm = useConfirm();
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [uploadingImgs, setUploadingImgs] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [slide, setSlide] = useState(0);

  const [pendingFiles, setPendingFiles] = useState(null);
  const [showWmModal, setShowWmModal] = useState(false);
  const [rewmMode, setRewmMode] = useState(false);
  const [rewmLoading, setRewmLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(PRODUCTS_URL, { withCredentials: true });
      const items = Array.isArray(res.data?.items) ? res.data.items.map(mapProductFromApi) : [];
      setProducts(items);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load products");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getCategories().then(setCategoryTree).catch(() => toast.error("Failed to load categories"));
  }, []);

  /**
   * One cascading Select per depth of the category tree the product's path
   * actually reaches — the tree can nest arbitrarily deep now, so this walks
   * `categoryTree` following `form.categoryPath` instead of assuming a fixed
   * 3 levels. Stops once the chosen node has no children (a leaf) or once a
   * level is reached that hasn't been answered yet.
   *
   * If a stored path segment no longer matches any live node (renamed or
   * deleted since the product was saved), it's injected as an extra option
   * so the Select shows the real stored value instead of a blank placeholder.
   */
  const pickerLevels = useMemo(() => {
    const levels = [];
    let nodes = categoryTree;
    const path = form.categoryPath || [];
    for (let depth = 0; depth < 12; depth += 1) {
      const chosen = path[depth] || "";
      const parentName = depth > 0 ? path[depth - 1] : "";
      const label = depth === 0 ? "Category" : depth === 1 ? "Subcategory" : `${parentName} type`;

      if (!Array.isArray(nodes) || nodes.length === 0) {
        if (!chosen) break; // nothing live and nothing stored either done
        levels.push({ depth, label, options: [{ value: chosen, label: chosen }] });
        break; // an orphaned leaf has no known children to drill into
      }

      const options = nodes.map(n => ({ value: n.name, label: n.name, disabled: !!n.disabled, hint: n.disabled ? "Coming soon" : "" }));
      const match = nodes.find(n => n.name === chosen);
      if (chosen && !match) options.push({ value: chosen, label: chosen });
      levels.push({ depth, label, options });

      if (!chosen) break;
      nodes = match?.children || [];
    }
    return levels;
  }, [categoryTree, form.categoryPath]);

  const setCategoryPathAt = (depth, value) =>
    setForm(f => ({ ...f, categoryPath: [...(f.categoryPath || []).slice(0, depth), value] }));

  // Lightbox controls, declared above the effect that calls them so the
  // reference is never to a `const` that has not run yet.
  const closeExpand = () => { setOpen(false); setActive(null); setSlide(0); };
  const goPrev = () => setSlide(s => (active?.images?.length ? (s + active.images.length - 1) % active.images.length : 0));
  const goNext = () => setSlide(s => (active?.images?.length ? (s + 1) % active.images.length : 0));

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeExpand();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const handleFiles = (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setPendingFiles(list);
    setShowWmModal(true);
  };

  const handleWmConfirm = async (opts) => {
    setShowWmModal(false);
    const list = pendingFiles;
    setPendingFiles(null);
    if (!list?.length) return;
    try {
      setUploadingImgs(true);
      const urls = [];
      for (const f of list) {
        const watermarked = await applyWatermark(f, opts);
        const { url } = await uploadWatermarked(watermarked);
        urls.push(String(url));
      }
      if (rewmMode) {
        setForm(prev => ({ ...prev, images: urls }));
        toast.success(`Re-watermarked ${urls.length} image${urls.length !== 1 ? 's' : ''}`);
      } else {
        setForm(prev => ({ ...prev, images: Array.from(new Set([...(prev.images || []), ...urls])) }));
        toast.success("Images uploaded");
      }
      setRewmMode(false);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Image upload failed");
    } finally {
      setUploadingImgs(false);
    }
  };

  const handleWmCancel = () => {
    setShowWmModal(false);
    setPendingFiles(null);
    setRewmMode(false);
  };

  const handleRewatermarkClick = async () => {
    if (!form.images?.length) return;
    setRewmLoading(true);
    try {
      const files = await Promise.all(form.images.map((url, i) => urlToFile(url, `img-${i}.jpg`)));
      setRewmMode(true);
      setPendingFiles(files);
      setShowWmModal(true);
    } catch {
      toast.error('Failed to fetch images for re-watermarking');
    } finally {
      setRewmLoading(false);
    }
  };

  const removeImageAt = (idx) => setForm((f) => ({ ...f, images: (f.images || []).filter((_, i) => i !== idx) }));

  // Stable identity so the Escape-key effect does not re-bind every render.
  const resetForm = useCallback(() => {
    setForm(EMPTY_PRODUCT);
    setEditingId("");
    setShowForm(false);
  }, []);

  // Escape closes the product dialog, as it does everywhere else here.
  // Declared after resetForm: referencing a `const` before its line has run
  // throws at render time, which no build step catches.
  useEffect(() => {
    if (!showForm) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !saving && !uploadingImgs) resetForm(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showForm, saving, uploadingImgs, resetForm]);

  const refetchAfter = async (fn) => { await fn(); await load(); };

  const saveProduct = async (e) => {
    e?.preventDefault?.();
    if (!form.title.trim()) return toast.warning("Product title is required");
    if (!form.donated && !form.contactForPrice && (!form.price || Number(form.price) <= 0)) return toast.warning("A valid price is required");
    if (!form.categoryPath?.[0]) return toast.warning("Select a category");
    const lastLevel = pickerLevels[pickerLevels.length - 1];
    if (lastLevel && lastLevel.options.length > 0 && !form.categoryPath[lastLevel.depth]) {
      return toast.warning(`Select a ${lastLevel.label.toLowerCase()}`);
    }
    if (!form.donated && !form.contactForPrice && form.salePrice !== "" && form.salePrice !== null && Number(form.salePrice) > Number(form.price)) {
      return toast.warning("Sale price cannot exceed the regular price");
    }
    try {
      setSaving(true);
      const payload = {
        title: form.title, categoryPath: form.categoryPath.filter(Boolean),
        price: (form.donated || form.contactForPrice) ? 0 : Number(form.price),
        salePrice: (form.donated || form.contactForPrice) ? null : (form.salePrice !== "" && form.salePrice !== null ? Number(form.salePrice) : null),
        stock: Number(form.stock || 0), images: Array.isArray(form.images) ? form.images.map(String) : [],
        description: form.description || "", storyBehindArt: form.storyBehindArt || "", published: !!form.published,
        dimensions: form.dimensions || "", color: toCapitalWords(form.color),
        inStock: !!form.inStock, featured: !!form.featured, donated: !!form.donated,
        contactForPrice: !!form.contactForPrice
      };
      await refetchAfter(async () => {
        if (editingId) {
          await axios.put(`${PRODUCTS_URL}/${editingId}`, payload, {
            withCredentials: true, headers: { "Content-Type": "application/json" }
          });
          toast.success("Product updated");
        } else {
          await axios.post(PRODUCTS_URL, payload, {
            withCredentials: true, headers: { "Content-Type": "application/json" }
          });
          toast.success("Product created");
        }
      });
      resetForm();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || "Failed to save product";
      const det = e?.response?.data?.details ? ` (${Object.values(e.response.data.details).join(", ")})` : "";
      toast.error(msg + det);
    } finally {
      setSaving(false);
    }
  };

  const editProduct = (id) => {
    const found = products.find((p) => p.id === id);
    if (!found) return;
    setEditingId(id);
    setForm({ ...EMPTY_PRODUCT, ...found });
    setShowForm(true);
    const main = document.querySelector("main");
    (main || window).scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProduct = (p) => confirm.ask({
    title: "Delete this product?",
    description: "The listing is removed from the shop immediately. Past orders keep their own copy of the item, but any link to this product page will stop working. This cannot be undone.",
    item: {
      label: p.title,
      image: p.images?.[0],
      meta: [
        ["Category", [p.category, p.subcategory].filter(Boolean).join(" · ")],
        ["Price", p.contactForPrice ? "On request" : fmtUSD.format(Number(p.price) || 0)],
        ["Stock", String(p.stock ?? 0)],
      ],
    },
    onConfirm: async () => {
      try {
        await refetchAfter(async () => {
          await axios.delete(`${PRODUCTS_URL}/${p.id}`, { withCredentials: true });
          toast.success("Product deleted");
        });
        if (editingId === p.id) resetForm();
      } catch (e) { console.error(e); toast.error("Failed to delete product"); }
    },
  });

  const firstUrl = (p) => {
    const arr = Array.isArray(p?.images) ? p.images : [];
    const first = arr.find(Boolean);
    if (!first) return "";
    if (typeof first === "string") return first;
    if (typeof first === "object") return first.secure_url || first.url || first.src || "";
    return "";
  };

  const handleImgError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMG_FALLBACK; };

  const visible = query.trim()
    ? products.filter(p => [p.title, p.category, p.subcategory, p.subsubcategory, p.color]
        .some(v => v && String(v).toLowerCase().includes(query.trim().toLowerCase())))
    : products;

  const noPrice = form.donated || form.contactForPrice;

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Products</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5">Manage listings, images, and pricing.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            className={showForm && !editingId ? "btn btn-ghost" : "btn btn-primary"}
            onClick={() => {
              if (showForm && !editingId) resetForm();
              else { setForm(EMPTY_PRODUCT); setEditingId(""); setShowForm(true); }
            }}
          >
            {showForm && !editingId ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add product</>}
          </button>
        </div>
      </div>

      {/* Form — a dialog rather than an inline panel. Inline, it doubled the
          page height and left the list stranded far below a long form. */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => !saving && !uploadingImgs && resetForm()}>
          <form
            className="modal-card max-w-3xl"
            onSubmit={saveProduct}
            noValidate
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
          >
            <div className="modal-head flex items-center justify-between px-5 py-4">
              <h3 id="product-form-title" className="page-title !text-[1.2rem]">
                {editingId ? "Edit product" : "New product"}
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm !px-2"
                onClick={resetForm}
                aria-label="Close"
                disabled={saving || uploadingImgs}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label htmlFor="p-title" className="label">Title <span className="text-vermillion">*</span></label>
              <input id="p-title" className="field" value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>

            {pickerLevels.map((level) => (
              <div key={level.depth}>
                <label htmlFor={`p-cat-${level.depth}`} className="label">
                  {level.label} <span className="text-vermillion">*</span>
                </label>
                <Select
                  id={`p-cat-${level.depth}`}
                  value={form.categoryPath[level.depth] || ""}
                  placeholder={`Select a ${level.label.toLowerCase()}`}
                  onChange={(v) => setCategoryPathAt(level.depth, v)}
                  options={level.options}
                />
              </div>
            ))}

            <div>
              <label htmlFor="p-price" className="label">Price (USD) {!noPrice && <span className="text-vermillion">*</span>}</label>
              <input id="p-price" type="number" step="0.01" min="0" className="field" value={form.price}
                disabled={noPrice}
                onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="p-sale" className="label">Sale price</label>
              <input id="p-sale" type="number" step="0.01" min="0" className="field"
                value={form.salePrice ?? ""} disabled={noPrice}
                onChange={(e) => setForm(f => ({ ...f, salePrice: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="p-stock" className="label">Stock</label>
              <input id="p-stock" type="number" min="0" className="field" value={form.stock}
                onChange={(e) => setForm(f => ({ ...f, stock: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="p-dims" className="label">Dimensions</label>
              <input id="p-dims" className="field" value={form.dimensions} placeholder='16" × 20"'
                onChange={(e) => setForm(f => ({ ...f, dimensions: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="p-color" className="label">Colour</label>
              <input id="p-color" className="field" value={form.color}
                onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))} />
            </div>

            <div className="col-span-full">
              <label htmlFor="p-desc" className="label">Description</label>
              <textarea id="p-desc" className="field resize-y" rows={3} value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="col-span-full">
              <label htmlFor="p-story" className="label">Story behind the art</label>
              <textarea id="p-story" className="field resize-y" rows={4} value={form.storyBehindArt}
                placeholder="Share the inspiration, technique, or meaning behind this piece"
                onChange={(e) => setForm(f => ({ ...f, storyBehindArt: e.target.value }))} />
            </div>

            {/* Flags */}
            <div className="col-span-full flex flex-wrap gap-x-6 gap-y-3 py-1">
              {[
                ["published", "Published"],
                ["inStock", "In stock"],
                ["featured", "Featured"],
                ["donated", "Donated"],
                ["contactForPrice", "Price on request"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-[0.86rem] text-graphite">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--color-vermillion)] cursor-pointer"
                    checked={!!form[key]}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Images */}
            <div className="col-span-full">
              <ImageDropzone
                id="p-images"
                label="Images watermarked on upload"
                size="wide"
                multiple
                uploading={uploadingImgs}
                onFiles={(files) => handleFiles(files)}
              />
              {form.images?.length > 0 && (
                <button type="button" className="btn btn-ghost mt-3" onClick={handleRewatermarkClick} disabled={rewmLoading || uploadingImgs}>
                  {rewmLoading ? <Loader2 size={15} className="animate-spin" /> : <Droplets size={15} />}
                  Re-watermark all
                </button>
              )}

              {form.images?.length > 0 && (
                <div className="flex gap-2.5 flex-wrap">
                  {form.images.map((src, idx) => (
                    <div key={`${src}-${idx}`} className="relative group">
                      <img src={src} alt="" className="w-20 h-20 object-cover border border-rule" onError={handleImgError} />
                      <button
                        type="button"
                        onClick={() => removeImageAt(idx)}
                        className="absolute top-0 right-0 w-5 h-5 bg-vermillion-dark text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        aria-label={`Remove image ${idx + 1}`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

            <div className="modal-foot px-5 py-4 flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving || uploadingImgs}>
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> {editingId ? "Update product" : "Create product"}</>}
              </button>
              <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={saving || uploadingImgs}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="panel panel-pad mb-5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center flex-1 min-w-[200px] max-w-sm bg-surface border border-rule focus-within:border-vermillion transition-colors">
          <Search size={15} className="text-slate ml-2.5 shrink-0" aria-hidden="true" />
          <label htmlFor="p-search" className="sr-only">Search products</label>
          <input
            id="p-search"
            className="flex-1 py-2 px-2 bg-transparent outline-none text-[0.85rem] text-ink placeholder:text-slate min-w-0"
            placeholder="Search by title, category, colour…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="mr-2 text-slate hover:text-vermillion">
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-[0.8rem] text-slate ml-auto" aria-live="polite">
          {loading ? "Loading…" : `${visible.length} product${visible.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-5 flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-paper-dim animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center">
            <Package size={26} className="mx-auto text-slate mb-4" />
            <p className="text-graphite mb-5">{query ? "No products match that search." : "No products yet."}</p>
            {!query && (
              <button className="btn btn-primary mx-auto" onClick={() => setShowForm(true)}>
                <Plus size={15} /> Add the first product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-k">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Flags</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const cover = firstUrl(p);
                  const sale = p.salePrice !== null && p.salePrice !== "" ? Number(p.salePrice) : null;
                  return (
                    <tr key={p.id}>
                      <td>
                        <button
                          type="button"
                          className="relative block w-12 h-12 border border-rule overflow-hidden bg-paper-dim group"
                          onClick={() => { if (p.images?.length) { setActive(p); setSlide(0); setOpen(true); } }}
                          aria-label={`View images for ${p.title}`}
                        >
                          {cover ? (
                            <img src={cover} alt="" className="w-full h-full object-cover" onError={handleImgError} loading="lazy" />
                          ) : (
                            <ImageIcon size={15} className="text-slate m-auto" />
                          )}
                          {p.images?.length > 1 && (
                            <span className="absolute inset-0 bg-ink/50 text-white text-[0.6rem] font-bold items-center justify-center hidden group-hover:flex">
                              <Maximize2 size={13} />
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="min-w-[180px]">
                        <div className="font-semibold text-ink leading-tight">{p.title || "Untitled"}</div>
                        <div className="text-[0.72rem] text-slate mt-0.5">
                          {[p.category, p.subcategory, p.subsubcategory].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        {p.donated ? (
                          <span className="tag tag-green">Donated</span>
                        ) : p.contactForPrice ? (
                          <span className="tag tag-red">On request</span>
                        ) : sale !== null ? (
                          <>
                            <div className="font-semibold text-vermillion">{fmtUSD.format(sale)}</div>
                            <div className="text-[0.72rem] text-slate line-through">{fmtUSD.format(Number(p.price || 0))}</div>
                          </>
                        ) : (
                          <div className="font-semibold text-ink">{fmtUSD.format(Number(p.price || 0))}</div>
                        )}
                      </td>
                      <td>
                        <span className={p.inStock ? "text-ink" : "text-vermillion-dark"}>{p.stock}</span>
                      </td>
                      <td>
                        <div className="flex gap-1 flex-wrap">
                          <span className={p.published ? "tag tag-green" : "tag tag-neutral"}>
                            {p.published ? "Live" : "Draft"}
                          </span>
                          {p.featured && <span className="tag tag-red">Featured</span>}
                          {!p.inStock && <span className="tag tag-red">Sold out</span>}
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-1.5 justify-end">
                          <button className="btn btn-ghost btn-sm !px-2" onClick={() => editProduct(p.id)} aria-label={`Edit ${p.title}`}>
                            <Edit2 size={13} />
                          </button>
                          <button className="btn btn-danger btn-sm !px-2" onClick={() => deleteProduct(p)} aria-label={`Delete ${p.title}`}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Image lightbox */}
      {open && active && (
        <div className="modal-backdrop" onClick={closeExpand}>
          <div className="modal-card max-w-2xl bg-surface" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Images for ${active.title}`}>
            <div className="modal-head flex items-center justify-between px-6 py-4">
              <h2 className="page-title !text-[1.15rem] truncate">{active.title}</h2>
              <button className="btn btn-ghost btn-sm !px-2" onClick={closeExpand} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="relative bg-paper-dim">
              <img
                src={active.images?.[slide] || IMG_FALLBACK}
                alt={`${active.title} image ${slide + 1}`}
                className="w-full max-h-[62vh] object-contain"
                onError={handleImgError}
              />
              {active.images?.length > 1 && (
                <>
                  <button onClick={goPrev} aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface/92 border border-rule flex items-center justify-center hover:bg-ink hover:text-paper transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={goNext} aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface/92 border border-rule flex items-center justify-center hover:bg-ink hover:text-paper transition-colors">
                    <ChevronRight size={18} />
                  </button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 tag tag-neutral bg-surface/92">
                    {slide + 1} / {active.images.length}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showWmModal && pendingFiles && (
        <WatermarkPositionModal
          files={pendingFiles}
          onConfirm={handleWmConfirm}
          onCancel={handleWmCancel}
        />
      )}

      <ConfirmDialog {...confirm.props} />
    </div>
  );
}
