import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Megaphone, Plus, RefreshCw, Pencil, Trash2, X, Search, Loader2, Save, Percent, ExternalLink,
} from "lucide-react";
import Select from "../components/ui/Select.jsx";
import ImageDropzone from "../components/ui/ImageDropzone.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import SectionEyebrow from "../components/SectionEyebrow.jsx";
import useConfirm from "../hooks/useConfirm.js";
import { uploadImage, formatBytes } from "../api/media.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const CLIENT_BASE = (import.meta.env.VITE_CLIENT_URL || "").replace(/\/$/, "");
const URL_ANNOUNCEMENTS = `${API_BASE}/api/announcements`;
const URL_PRODUCTS = `${API_BASE}/api/products`;

axios.defaults.withCredentials = true;

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const KINDS = [
  { value: "festival", label: "Festival offer", hint: "Diwali, Christmas, Pongal…" },
  { value: "clearance", label: "Clearance sale", hint: "Make room for new work" },
  { value: "seasonal", label: "Seasonal sale", hint: "Summer, year-end…" },
  { value: "flash", label: "Flash sale", hint: "A short, sharp window" },
  { value: "custom", label: "Other announcement" },
];

const ACCENTS = ["#E8340C", "#B62607", "#1F6B4A", "#0B0B0B", "#6B3FA0", "#C9892B", "#1D6F8A"];

const STATUS_TAG = {
  live: ["tag tag-green", "Live"],
  scheduled: ["tag tag-ink", "Scheduled"],
  ended: ["tag tag-neutral", "Ended"],
  draft: ["tag tag-outline", "Draft"],
};

const EMPTY = {
  _id: "", title: "", kind: "festival", message: "", badgeText: "", description: "",
  bannerImage: "", accent: "#E8340C", ctaLabel: "Shop the sale", navLabel: "Sale",
  showInNav: true, showBar: true, showBanner: true, published: true,
  startsAt: "", endsAt: "", items: [],
};

/** ISO <-> the value a <input type="datetime-local"> wants (local time, no zone). */
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : null;

const windowLabel = (a) => {
  const s = fmtDate(a.startsAt), e = fmtDate(a.endsAt);
  if (!s && !e) return "Always on until unpublished";
  if (s && e) return `${s} → ${e}`;
  return s ? `From ${s}` : `Until ${e}`;
};

const pctOff = (price, sale) => (price > 0 && sale > 0 && sale < price ? Math.round((1 - sale / price) * 100) : 0);

export default function AnnouncementsPage() {
  const confirm = useConfirm();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(null);          // null = closed
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [catalogue, setCatalogue] = useState([]);  // raw products, for the picker
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [bulkPct, setBulkPct] = useState(20);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(URL_ANNOUNCEMENTS);
      setList(Array.isArray(data?.items) ? data.items : []);
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadCatalogue = useCallback(async () => {
    if (catalogue.length) return;
    try {
      setCatalogueLoading(true);
      // raw=1: prices exactly as stored, not with a live sale already applied.
      const { data } = await axios.get(URL_PRODUCTS, { params: { raw: 1 } });
      const items = (Array.isArray(data?.items) ? data.items : []).filter((p) => !p.donated && !p.contactForPrice);
      setCatalogue(items);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setCatalogueLoading(false);
    }
  }, [catalogue.length]);

  const open = (a) => {
    setFieldErrors({});
    setSearch("");
    setForm(a
      ? {
          ...EMPTY, ...a,
          startsAt: toLocalInput(a.startsAt),
          endsAt: toLocalInput(a.endsAt),
          items: (a.items || []).map((i) => ({ product: i.product, title: i.title, price: i.price, image: i.image, salePrice: String(i.salePrice) })),
        }
      : { ...EMPTY });
    loadCatalogue();
  };

  const close = useCallback(() => { if (!saving && !uploading) setForm(null); }, [saving, uploading]);

  useEffect(() => {
    if (!form) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !confirm.props.open) close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [form, close, confirm.props.open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  /* ── Banner image ─────────────────────────────────────────────── */
  const handleBanner = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadImage(file, { folder: "announcements" });
      set("bannerImage", res.url);
      toast.success(`Banner uploaded (${formatBytes(res.originalBytes)} → ${formatBytes(res.bytes)})`);
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ── Products on offer ────────────────────────────────────────── */
  const formItems = form ? form.items : null;
  const selectedIds = useMemo(() => new Set((formItems || []).map((i) => i.product)), [formItems]);

  const addProduct = (p) => {
    if (selectedIds.has(p._id)) return;
    setForm((f) => ({
      ...f,
      items: [...f.items, { product: p._id, title: p.title, price: p.price, image: p.images?.[0] || "", salePrice: String(Math.round(p.price * 0.8 * 100) / 100) }],
    }));
  };
  const removeProduct = (id) => setForm((f) => ({ ...f, items: f.items.filter((i) => i.product !== id) }));
  const setSalePrice = (id, v) => setForm((f) => ({ ...f, items: f.items.map((i) => (i.product === id ? { ...i, salePrice: v } : i)) }));
  const applyPercentToAll = () => {
    const pct = Number(bulkPct);
    if (!(pct > 0 && pct < 100)) return toast.warning("Enter a percentage between 1 and 99");
    setForm((f) => ({
      ...f,
      items: f.items.map((i) => ({ ...i, salePrice: String(Math.round(i.price * (1 - pct / 100) * 100) / 100) })),
    }));
  };

  const pickable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalogue
      .filter((p) => !selectedIds.has(p._id))
      .filter((p) => !q || `${p.title} ${p.category} ${p.subcategory}`.toLowerCase().includes(q))
      .slice(0, 60);
  }, [catalogue, selectedIds, search]);

  const itemProblem = (i) => {
    const sp = Number(i.salePrice);
    if (!Number.isFinite(sp) || sp <= 0) return "Enter a sale price";
    if (sp >= i.price) return "Must be below the regular price";
    return "";
  };

  /* ── Save ─────────────────────────────────────────────────────── */
  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.warning("Give the announcement a title");
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
      return toast.warning("The end must be after the start");
    }
    const bad = form.items.find(itemProblem);
    if (bad) return toast.warning(`${bad.title}: ${itemProblem(bad).toLowerCase()}`);

    const payload = {
      ...form,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      items: form.items.map((i) => ({ product: i.product, salePrice: Number(i.salePrice) })),
    };
    delete payload._id; delete payload.status; delete payload.slug; delete payload.createdAt; delete payload.updatedAt; delete payload.__v;

    try {
      setSaving(true);
      setFieldErrors({});
      if (form._id) await axios.put(`${URL_ANNOUNCEMENTS}/${form._id}`, payload);
      else await axios.post(URL_ANNOUNCEMENTS, payload);
      toast.success(form._id ? "Announcement updated" : "Announcement created");
      setForm(null);
      load();
    } catch (err) {
      setFieldErrors(err?.response?.data?.details || {});
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = (a) => confirm.ask({
    title: "Delete this announcement?",
    description: "The banner, top bar and Sale link disappear and every special price in it returns to normal straight away. This cannot be undone.",
    item: {
      label: a.title,
      image: a.bannerImage || a.items?.[0]?.image,
      meta: [["Status", STATUS_TAG[a.status]?.[1] || a.status], ["Products", String(a.items?.length || 0)], ["Runs", windowLabel(a)]],
    },
    onConfirm: async () => {
      try {
        await axios.delete(`${URL_ANNOUNCEMENTS}/${a._id}`);
        toast.success("Announcement deleted");
        load();
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to delete");
        throw err;
      }
    },
  });

  const togglePublished = async (a) => {
    try {
      await axios.put(`${URL_ANNOUNCEMENTS}/${a._id}`, {
        ...a,
        published: !a.published,
        items: (a.items || []).map((i) => ({ product: i.product, salePrice: i.salePrice })),
      });
      toast.success(a.published ? "Moved to draft — prices are back to normal" : "Published");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update");
    }
  };

  const err = (k) => fieldErrors[k] && <p className="text-[0.76rem] text-vermillion-dark mt-1.5">{fieldErrors[k]}</p>;

  return (
    <div className="mx-auto max-w-6xl w-full">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Announcements &amp; sales</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5 max-w-2xl">
            Festival offers, clearance sales and flash sales. While one is live it shows as a banner and a top bar,
            adds an animated <strong>Sale</strong> link to the menu, and puts your special prices on the chosen products
            everywhere — including checkout. It ends on its own.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={load} disabled={loading} type="button">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => open(null)} type="button">
            <Plus size={15} /> New announcement
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => <div key={i} className="panel h-44 animate-pulse bg-paper-dim" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="panel py-16 text-center">
          <Megaphone size={26} className="mx-auto text-slate mb-3" />
          <p className="text-graphite text-[0.9rem] mb-4">No announcements yet.</p>
          <button className="btn btn-primary" onClick={() => open(null)} type="button"><Plus size={15} /> Create your first sale</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((a) => {
            const [tagClass, tagLabel] = STATUS_TAG[a.status] || STATUS_TAG.draft;
            const depth = a.items?.length ? Math.round(a.items.reduce((s, i) => s + pctOff(i.price, i.salePrice), 0) / a.items.length) : 0;
            return (
              <article key={a._id} className="panel flex flex-col overflow-hidden">
                <div className="h-1.5" style={{ background: a.accent }} />
                <div className="p-5 flex gap-4">
                  <div className="w-24 h-24 shrink-0 bg-paper-dim border border-rule overflow-hidden flex items-center justify-center">
                    {a.bannerImage || a.items?.[0]?.image
                      ? <img src={a.bannerImage || a.items[0].image} alt="" className="w-full h-full object-cover" />
                      : <Megaphone size={22} className="text-slate" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={tagClass}>{tagLabel}</span>
                      <span className="tag tag-outline">{KINDS.find((k) => k.value === a.kind)?.label || a.kind}</span>
                    </div>
                    <h3 className="text-[1.1rem] text-ink leading-snug truncate" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{a.title}</h3>
                    {a.badgeText && <p className="text-[0.82rem] mt-0.5" style={{ color: a.accent }}>{a.badgeText}</p>}
                    <p className="text-[0.76rem] text-slate mt-1.5">{windowLabel(a)}</p>
                    <p className="text-[0.76rem] text-graphite mt-0.5">
                      {a.items?.length || 0} product{a.items?.length === 1 ? "" : "s"}{depth ? ` · avg ${depth}% off` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-auto px-5 py-3 border-t border-rule flex items-center gap-2 flex-wrap">
                  <button className="btn btn-ghost btn-sm" onClick={() => open(a)} type="button"><Pencil size={13} /> Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => togglePublished(a)} type="button">
                    {a.published ? "Move to draft" : "Publish"}
                  </button>
                  {a.status === "live" && CLIENT_BASE && (
                    <a className="btn btn-ghost btn-sm" href={`${CLIENT_BASE}/sale/${a.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={13} /> View
                    </a>
                  )}
                  <button className="btn btn-danger btn-sm !px-2 ml-auto" onClick={() => remove(a)} aria-label={`Delete ${a.title}`} type="button"><Trash2 size={13} /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Editor ─────────────────────────────────────────────────── */}
      {form && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal-card max-w-4xl bg-surface" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ann-title">
            <div className="modal-head flex items-center justify-between px-6 py-4">
              <h2 id="ann-title" className="page-title !text-[1.2rem]">{form._id ? "Edit announcement" : "New announcement"}</h2>
              <button className="btn btn-ghost btn-sm !px-2" onClick={close} aria-label="Close" type="button"><X size={16} /></button>
            </div>

            <form onSubmit={save} className="modal-form">
              <div className="modal-body px-6 py-5 flex flex-col gap-7">

                {/* Basics */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="an-title" className="label">Title <span className="text-vermillion">*</span></label>
                    <input id="an-title" className="field" placeholder="Diwali Festival Sale" value={form.title} onChange={(e) => set("title", e.target.value)} required />
                    {err("title")}
                  </div>
                  <div>
                    <label htmlFor="an-kind" className="label">Type</label>
                    <Select id="an-kind" value={form.kind} onChange={(v) => set("kind", v)} options={KINDS} />
                  </div>
                  <div>
                    <label htmlFor="an-badge" className="label">Badge</label>
                    <input id="an-badge" className="field" placeholder="Up to 40% off" value={form.badgeText} onChange={(e) => set("badgeText", e.target.value)} maxLength={60} />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="an-msg" className="label">Top-bar message</label>
                    <input id="an-msg" className="field" placeholder="Diwali offers are live — handpicked pieces at special prices" value={form.message} onChange={(e) => set("message", e.target.value)} maxLength={200} />
                    <p className="text-[0.76rem] text-slate mt-1.5">One line shown in the strip above the menu.</p>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="an-desc" className="label">Description</label>
                    <textarea id="an-desc" rows={3} className="field" placeholder="Shown on the sale page and the home-page banner." value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={1500} />
                  </div>
                </section>

                {/* Look */}
                <section className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
                  <ImageDropzone
                    id="an-banner" label="Banner image" size="md"
                    previewUrl={form.bannerImage} uploading={uploading}
                    onChange={handleBanner} onRemove={() => set("bannerImage", "")}
                    hint="Optional. Wide images work best; it is converted to a small WebP automatically."
                  />
                  <div className="flex flex-col gap-4">
                    <div>
                      <span className="label">Accent colour</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {ACCENTS.map((c) => (
                          <button key={c} type="button" onClick={() => set("accent", c)} aria-label={`Use ${c}`} aria-pressed={form.accent === c}
                            className={`w-8 h-8 border-2 ${form.accent === c ? "border-ink" : "border-transparent"}`} style={{ background: c }} />
                        ))}
                        <input aria-label="Custom colour" type="color" value={form.accent} onChange={(e) => set("accent", e.target.value)} className="w-8 h-8 p-0 border border-rule cursor-pointer bg-transparent" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="an-cta" className="label">Button text</label>
                        <input id="an-cta" className="field" value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} maxLength={40} />
                      </div>
                      <div>
                        <label htmlFor="an-nav" className="label">Menu link text</label>
                        <input id="an-nav" className="field" value={form.navLabel} onChange={(e) => set("navLabel", e.target.value)} maxLength={20} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {[["showInNav", "Animated menu link"], ["showBar", "Top bar"], ["showBanner", "Home-page banner"]].map(([k, label]) => (
                        <label key={k} className="flex items-center gap-2 text-[0.86rem] text-graphite cursor-pointer">
                          <input type="checkbox" className="h-4 w-4 accent-[var(--color-vermillion)]" checked={form[k]} onChange={(e) => set(k, e.target.checked)} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Schedule */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="an-start" className="label">Starts</label>
                    <input id="an-start" type="datetime-local" className="field" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
                    <p className="text-[0.74rem] text-slate mt-1">Blank = immediately</p>
                  </div>
                  <div>
                    <label htmlFor="an-end" className="label">Ends</label>
                    <input id="an-end" type="datetime-local" className="field" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
                    <p className="text-[0.74rem] text-slate mt-1">Blank = until you unpublish</p>
                    {err("endsAt")}
                  </div>
                  <div>
                    <label htmlFor="an-pub" className="label">Visibility</label>
                    <Select id="an-pub" value={form.published ? "published" : "draft"} onChange={(v) => set("published", v === "published")}
                      options={[{ value: "published", label: "Published", hint: "Goes live in its window" }, { value: "draft", label: "Draft", hint: "Hidden everywhere" }]} />
                  </div>
                </section>

                {/* Products */}
                <section>
                  <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
                    <div>
                      <h3 className="text-[1.05rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                        Products on offer <span className="text-slate font-normal">({form.items.length})</span>
                      </h3>
                      <p className="text-[0.78rem] text-slate">Choose the products, then set the special price for each.</p>
                    </div>
                    {form.items.length > 0 && (
                      <div className="flex items-end gap-2">
                        <div>
                          <label htmlFor="an-bulk" className="label !mb-1">Take % off all</label>
                          <div className="relative">
                            <input id="an-bulk" type="number" min={1} max={99} className="field !w-24 !pr-7" value={bulkPct} onChange={(e) => setBulkPct(e.target.value)} />
                            <Percent size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate" />
                          </div>
                        </div>
                        <button type="button" className="btn btn-ghost" onClick={applyPercentToAll}>Apply</button>
                      </div>
                    )}
                  </div>
                  {err("items")}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Chosen */}
                    <div className="border border-rule min-h-[200px]">
                      <div className="px-3 py-2 border-b border-rule bg-paper-dim label-mono">Selected</div>
                      {form.items.length === 0 ? (
                        <p className="p-5 text-[0.85rem] text-slate">Nothing chosen yet — add products from the list.</p>
                      ) : (
                        <ul className="divide-y divide-rule max-h-[340px] overflow-y-auto">
                          {form.items.map((i) => {
                            const problem = itemProblem(i);
                            const off = pctOff(i.price, Number(i.salePrice));
                            return (
                              <li key={i.product} className="p-3 flex items-center gap-3">
                                <img src={i.image || undefined} alt="" className="w-11 h-11 object-cover bg-paper-dim border border-rule shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[0.86rem] text-ink truncate">{i.title}</p>
                                  <p className="text-[0.74rem] text-slate tabular-nums">Regular {fmtUSD.format(i.price)}{off > 0 && <span className="text-forest"> · {off}% off</span>}</p>
                                  {problem && <p className="text-[0.72rem] text-vermillion-dark">{problem}</p>}
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate text-[0.8rem]">$</span>
                                  <input aria-label={`Sale price for ${i.title}`} type="number" min={0.01} step="0.01" className="field !w-28 !pl-5 tabular-nums"
                                    value={i.salePrice} onChange={(e) => setSalePrice(i.product, e.target.value)} />
                                </div>
                                <button type="button" className="btn btn-ghost btn-sm !px-2" onClick={() => removeProduct(i.product)} aria-label={`Remove ${i.title}`}><X size={13} /></button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    {/* Picker */}
                    <div className="border border-rule min-h-[200px]">
                      <div className="px-3 py-2 border-b border-rule bg-paper-dim flex items-center gap-2">
                        <Search size={14} className="text-slate shrink-0" />
                        <input aria-label="Search products" className="bg-transparent outline-none text-[0.85rem] w-full" placeholder="Search products to add…" value={search} onChange={(e) => setSearch(e.target.value)} />
                      </div>
                      {catalogueLoading ? (
                        <div className="p-6 flex justify-center"><Loader2 size={18} className="animate-spin text-slate" /></div>
                      ) : pickable.length === 0 ? (
                        <p className="p-5 text-[0.85rem] text-slate">{catalogue.length ? "No more matching products." : "No products found."}</p>
                      ) : (
                        <ul className="divide-y divide-rule max-h-[340px] overflow-y-auto">
                          {pickable.map((p) => (
                            <li key={p._id}>
                              <button type="button" onClick={() => addProduct(p)} className="w-full p-3 flex items-center gap-3 text-left hover:bg-paper-dim transition-colors">
                                <img src={p.images?.[0] || undefined} alt="" className="w-11 h-11 object-cover bg-paper-dim border border-rule shrink-0" />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[0.86rem] text-ink truncate">{p.title}</span>
                                  <span className="block text-[0.74rem] text-slate truncate">{[p.category, p.subcategory].filter(Boolean).join(" · ")}</span>
                                </span>
                                <span className="text-[0.8rem] text-graphite tabular-nums shrink-0">{fmtUSD.format(p.price)}</span>
                                <Plus size={14} className="text-vermillion shrink-0" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              <div className="modal-foot px-6 py-4 flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
                  {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> {form._id ? "Save changes" : "Create announcement"}</>}
                </button>
                <button type="button" className="btn btn-ghost" onClick={close} disabled={saving || uploading}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirm.props} />
    </div>
  );
}
