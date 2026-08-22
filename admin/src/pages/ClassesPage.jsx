import React, { useCallback, useEffect, useRef, useState } from "react";
import { Edit2, Trash2, Image as ImageIcon, Plus, Save, X, GraduationCap, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import Select from "../components/ui/Select.jsx";
import { uploadImage } from "../api/media.js";
import LinkPicker from "../components/ui/LinkPicker.jsx";
import { ListEditor, PairEditor, TripleEditor } from "../components/ui/RepeatableFields.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import useConfirm from "../hooks/useConfirm.js";
import SectionEyebrow from "../components/SectionEyebrow.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const CLASSES_URL = `${API_BASE}/api/classes`;

axios.defaults.withCredentials = true;

const levels = ["Beginner", "Intermediate", "Advanced"];
const modes = ["Online", "Studio"];

const EMPTY_CLASS = {
  id: "", title: "", summary: "", mode: modes[0], level: levels[0], cover: "", published: true,
  startDate: "", endDate: "", time: "", schedule: "",
  durationWeeks: 4, sessionCount: 0, sessionLength: "",
  seats: 10, price: "", location: "", ageGroup: "", language: "", instructor: "", bookingUrl: "",
  description: "", overview: [""], highlights: [""], learn: [""], materials: [""], requirements: [""],
  syllabus: [{ label: "", title: "", body: "" }],
  faqs: [{ q: "", a: "" }],
  gallery: [],
};

/** An empty list still needs one visible row, otherwise there is nothing to type into. */
const atLeastOne = (list, blank) => (Array.isArray(list) && list.length ? list : [blank]);

const mapClassFromApi = (doc) => ({
  id: doc._id,
  title: doc.title || "",
  summary: doc.summary || "",
  mode: doc.mode || modes[0],
  level: doc.level || levels[0],
  cover: doc.cover || "",
  published: !!doc.published,

  startDate: doc.startDate || "",
  endDate: doc.endDate || "",
  time: doc.time || "",
  schedule: doc.schedule || "",
  durationWeeks: typeof doc.durationWeeks === "number" ? doc.durationWeeks : 4,
  sessionCount: typeof doc.sessionCount === "number" ? doc.sessionCount : 0,
  sessionLength: doc.sessionLength || "",

  seats: typeof doc.seats === "number" ? doc.seats : 10,
  price: typeof doc.price === "number" ? doc.price : 0,
  location: doc.location || "",
  ageGroup: doc.ageGroup || "",
  language: doc.language || "",
  instructor: doc.instructor || "",
  bookingUrl: doc.bookingUrl || "",

  description: doc.description || "",
  overview: atLeastOne(doc.overview, ""),
  // Older records stored the card tags as a comma-separated description.
  highlights: atLeastOne(
    doc.highlights?.length
      ? doc.highlights
      : (doc.description || "").split(",").map((s) => s.trim()).filter(Boolean),
    ""
  ),
  learn: atLeastOne(doc.learn, ""),
  materials: atLeastOne(doc.materials, ""),
  requirements: atLeastOne(doc.requirements, ""),
  syllabus: atLeastOne(
    (doc.syllabus || []).map((s) => ({ label: s.label || "", title: s.title || "", body: s.body || "" })),
    { label: "", title: "", body: "" }
  ),
  faqs: atLeastOne((doc.faqs || []).map((f) => ({ q: f.q || "", a: f.a || "" })), { q: "", a: "" }),
  gallery: Array.isArray(doc.gallery) ? doc.gallery : [],
});

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** One titled block of the long class form. */
const FormSection = ({ n, title, blurb, children }) => (
  <section className="border-t border-rule pt-6 first:border-t-0 first:pt-0">
    <header className="mb-4">
      <div className="flex items-center gap-3 mb-1.5">
        <span className="font-mono text-[0.6rem] text-vermillion tabular-nums">{n}</span>
        <span className="h-px w-7 bg-rule" />
      </div>
      <h4 className="text-[0.98rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
        {title}
      </h4>
      {blurb && <p className="text-[0.78rem] text-graphite mt-1">{blurb}</p>}
    </header>
    <div className="flex flex-col gap-4">{children}</div>
  </section>
);

const ClassesPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_CLASS);
  const [editingId, setEditingId] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const fileRef = useRef(null);
  const galleryRef = useRef(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(CLASSES_URL, { withCredentials: true });
      const list = Array.isArray(res.data?.items) ? res.data.items.map(mapClassFromApi) : [];
      setItems(list);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.status === 404 ? "Route not found (/api/classes)" : "Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleCoverFile = async (file) => {
    if (!file) {
      setCoverPreview("");
      set("cover", "");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    try {
      setUploadingCover(true);
      setCoverPreview(URL.createObjectURL(file));
      const { url } = await uploadImage(file, { folder: 'classes' });
      setForm((f) => ({ ...f, cover: url }));
      setCoverPreview(url);
      toast.success("Cover uploaded");
    } catch (e) {
      setCoverPreview("");
      toast.error(e.message || "Image upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleGalleryFiles = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    try {
      setUploadingGallery(true);
      const urls = [];
      for (const file of list) {
        const { url } = await uploadImage(file, { folder: 'classes' });
        urls.push(url);
      }
      setForm((f) => ({ ...f, gallery: [...f.gallery, ...urls] }));
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} added`);
    } catch (e) {
      toast.error(e.message || "Image upload failed");
    } finally {
      setUploadingGallery(false);
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  const resetForm = () => {
    setForm(EMPTY_CLASS);
    setEditingId("");
    setCoverPreview("");
    setFormError("");
    setShowForm(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const saveClass = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.title.trim()) { setFormError("Class title is required."); return; }
    if (!form.startDate) { setFormError("Start date is required."); return; }
    try {
      setSaving(true);
      const payload = {
        title: form.title,
        summary: form.summary,
        mode: form.mode,
        level: form.level,
        cover: form.cover,
        published: !!form.published,

        startDate: form.startDate,
        endDate: form.endDate,
        time: form.time,
        schedule: form.schedule,
        durationWeeks: Number(form.durationWeeks || 1),
        sessionCount: Number(form.sessionCount || 0),
        sessionLength: form.sessionLength,

        seats: Number(form.seats || 1),
        price: form.price ? Number(form.price) : 0,
        location: form.location,
        ageGroup: form.ageGroup,
        language: form.language,
        instructor: form.instructor,
        bookingUrl: form.bookingUrl,

        description: form.description,
        overview: form.overview,
        highlights: form.highlights,
        learn: form.learn,
        materials: form.materials,
        requirements: form.requirements,
        syllabus: form.syllabus,
        faqs: form.faqs,
        gallery: form.gallery,
      };
      if (editingId) {
        const res = await axios.put(`${CLASSES_URL}/${editingId}`, payload, {
          withCredentials: true, headers: { "Content-Type": "application/json" }
        });
        const updated = mapClassFromApi(res.data);
        setItems((arr) => arr.map((it) => (it.id === editingId ? updated : it)));
        toast.success("Class updated");
      } else {
        const res = await axios.post(CLASSES_URL, payload, {
          withCredentials: true, headers: { "Content-Type": "application/json" }
        });
        setItems((arr) => [mapClassFromApi(res.data), ...arr]);
        toast.success("Class created");
      }
      resetForm();
    } catch (e) {
      console.error(e);
      setFormError(e?.response?.data?.message || "Failed to save class.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({ ...item });
    setCoverPreview(item.cover || "");
    setFormError("");
    setShowForm(true);
    const main = document.querySelector("main");
    (main || window).scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteClass = (item) => confirm.ask({
    title: "Delete this class?",
    description: "The class and its detail page are removed from the storefront. Anyone holding a link to it will get a not-found page. This cannot be undone.",
    item: {
      label: item.title || "Untitled class",
      image: item.cover,
      meta: [
        ["Mode", `${item.level} · ${item.mode}`],
        item.startDate && ["Starts", item.startDate],
        ["Seats", String(item.seats)],
      ],
    },
    onConfirm: async () => {
      try {
        await axios.delete(`${CLASSES_URL}/${item.id}`, { withCredentials: true });
        setItems((arr) => arr.filter((c) => c.id !== item.id));
        if (editingId === item.id) resetForm();
        toast.success("Class deleted");
      } catch (e) {
        console.error(e);
        toast.error("Failed to delete class");
      }
    },
  });

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Classes</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5">
            Upcoming art classes and workshops shown on the storefront.
          </p>
        </div>
        <button
          type="button"
          className={showForm && !editingId ? "btn btn-ghost" : "btn btn-primary"}
          onClick={() => {
            if (showForm && !editingId) { setShowForm(false); setForm(EMPTY_CLASS); }
            else { setForm(EMPTY_CLASS); setEditingId(""); setCoverPreview(""); setFormError(""); setShowForm(true); }
          }}
        >
          {showForm && !editingId ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add class</>}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form className="panel mb-6" autoComplete="off" onSubmit={saveClass} noValidate>
          <div className="px-5 py-4 border-b border-rule">
            <h3 className="text-[1.05rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
              {editingId ? "Edit class" : "New class"}
            </h3>
            <p className="text-[0.8rem] text-graphite mt-1">
              Only the basics are required. Everything else builds the class detail page on the storefront.
            </p>
          </div>

          <div className="px-5 py-5 flex flex-col gap-7">

            {/* 01 Basics */}
            <FormSection n="01" title="Basics" blurb="Shown on the class card and at the top of the detail page.">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="cl-title" className="label">Title <span className="text-vermillion">*</span></label>
                  <input id="cl-title" className="field" placeholder="Watercolour mastery"
                    value={form.title} onChange={(e) => set("title", e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="cl-mode" className="label">Mode</label>
                  <Select id="cl-mode" value={form.mode} onChange={(v) => set("mode", v)} options={modes} />
                </div>
                <div>
                  <label htmlFor="cl-level" className="label">Level</label>
                  <Select id="cl-level" value={form.level} onChange={(v) => set("level", v)} options={levels} />
                </div>
                <div className="col-span-full">
                  <label htmlFor="cl-summary" className="label">One-line summary</label>
                  <input id="cl-summary" className="field" placeholder="A relaxed Wednesday evening class for beginners and improvers."
                    value={form.summary} onChange={(e) => set("summary", e.target.value)} />
                  <p className="text-[0.76rem] text-slate mt-1.5">Sits under the title on the card. Keep it to one sentence.</p>
                </div>
                <div>
                  <label htmlFor="cl-visibility" className="label">Visibility</label>
                  <Select
                    id="cl-visibility"
                    value={form.published ? "published" : "draft"}
                    onChange={(v) => set("published", v === "published")}
                    options={[
                      { value: "published", label: "Published", hint: "Visible on the site" },
                      { value: "draft", label: "Draft", hint: "Hidden from visitors" },
                    ]}
                  />
                </div>
              </div>
            </FormSection>

            {/* 02 Schedule */}
            <FormSection n="02" title="Schedule" blurb="Dates and timings. Anything left blank is simply not shown.">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="cl-date" className="label">Start date <span className="text-vermillion">*</span></label>
                  <input id="cl-date" type="date" className="field" value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="cl-enddate" className="label">End date</label>
                  <input id="cl-enddate" type="date" className="field" value={form.endDate}
                    onChange={(e) => set("endDate", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="cl-time" className="label">Time</label>
                  <input id="cl-time" className="field" placeholder="5:30 PM – 7:00 PM"
                    value={form.time} onChange={(e) => set("time", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="cl-sched" className="label">Repeats</label>
                  <input id="cl-sched" className="field" placeholder="Every Wednesday"
                    value={form.schedule} onChange={(e) => set("schedule", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="cl-weeks" className="label">Duration (weeks)</label>
                  <input id="cl-weeks" type="number" min="1" className="field" value={form.durationWeeks}
                    onChange={(e) => set("durationWeeks", Number(e.target.value || 1))} />
                </div>
                <div>
                  <label htmlFor="cl-sessions" className="label">Number of sessions</label>
                  <input id="cl-sessions" type="number" min="0" className="field" value={form.sessionCount}
                    onChange={(e) => set("sessionCount", Number(e.target.value || 0))} />
                </div>
                <div>
                  <label htmlFor="cl-slen" className="label">Session length</label>
                  <input id="cl-slen" className="field" placeholder="90 minutes"
                    value={form.sessionLength} onChange={(e) => set("sessionLength", e.target.value)} />
                </div>
              </div>
            </FormSection>

            {/* 03 Booking */}
            <FormSection n="03" title="Booking &amp; logistics">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="cl-price" className="label">Price (USD)</label>
                  <input id="cl-price" type="number" step="0.01" min="0" className="field" value={form.price}
                    onChange={(e) => set("price", e.target.value)} />
                  <p className="text-[0.76rem] text-slate mt-1.5">Leave at 0 to show “Free”.</p>
                </div>
                <div>
                  <label htmlFor="cl-seats" className="label">Seats</label>
                  <input id="cl-seats" type="number" min="1" className="field" value={form.seats}
                    onChange={(e) => set("seats", Number(e.target.value || 1))} />
                </div>
                <div>
                  <label htmlFor="cl-age" className="label">Age group</label>
                  <input id="cl-age" className="field" placeholder="8 years and up"
                    value={form.ageGroup} onChange={(e) => set("ageGroup", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="cl-lang" className="label">Language</label>
                  <input id="cl-lang" className="field" placeholder="English"
                    value={form.language} onChange={(e) => set("language", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="cl-loc" className="label">Location</label>
                  <input id="cl-loc" className="field" placeholder="Leave blank to use the studio address / “Online (live)”"
                    value={form.location} onChange={(e) => set("location", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="cl-inst" className="label">Instructor</label>
                  <input id="cl-inst" className="field" placeholder="Priyanka Vasista"
                    value={form.instructor} onChange={(e) => set("instructor", e.target.value)} />
                </div>
                <div className="col-span-full">
                  <span className="label">Booking link</span>
                  <LinkPicker
                    id="cl-booking"
                    value={form.bookingUrl}
                    onChange={(v) => set("bookingUrl", v)}
                    emptyLabel="Use the site default enquiry form"
                  />
                </div>
              </div>
            </FormSection>

            {/* 04 Media */}
            <FormSection n="04" title="Images" blurb="The cover leads the card. Extra images appear as a strip on the detail page.">
              <div>
                <span className="label">Cover image</span>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="btn btn-ghost cursor-pointer">
                    <input ref={fileRef} type="file" accept="image/*" className="sr-only"
                      onChange={(e) => handleCoverFile(e.target.files?.[0] || null)} />
                    {uploadingCover ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                    {uploadingCover ? "Uploading…" : "Choose image"}
                  </label>
                  {(coverPreview || form.cover) && (
                    <>
                      <img src={coverPreview || form.cover} alt="Cover preview"
                        className="w-16 h-16 object-cover border border-rule" />
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleCoverFile(null)}>
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <span className="label">Extra images</span>
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <label className="btn btn-ghost cursor-pointer">
                    <input ref={galleryRef} type="file" accept="image/*" multiple className="sr-only"
                      onChange={(e) => handleGalleryFiles(e.target.files)} />
                    {uploadingGallery ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    {uploadingGallery ? "Uploading…" : "Add images"}
                  </label>
                </div>
                {form.gallery.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.gallery.map((url, i) => (
                      <div key={`${url}-${i}`} className="relative group">
                        <img src={url} alt="" className="w-20 h-20 object-cover border border-rule" />
                        <button
                          type="button"
                          aria-label="Remove image"
                          onClick={() => set("gallery", form.gallery.filter((_, j) => j !== i))}
                          className="absolute top-0 right-0 bg-ink text-paper p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormSection>

            {/* 05 Detail content */}
            <FormSection n="05" title="Class details" blurb="This is what the “View details” page on the storefront is built from.">
              <ListEditor
                label="Card tags"
                hint="Short phrases shown on the class card. Three or four is plenty."
                values={form.highlights}
                onChange={(v) => set("highlights", v)}
                addLabel="Add tag"
                placeholder="Beginner friendly"
              />

              <ListEditor
                label="Overview paragraphs"
                hint="The description at the top of the detail page."
                values={form.overview}
                onChange={(v) => set("overview", v)}
                addLabel="Add paragraph"
                multiline
              />

              <ListEditor
                label="What you'll learn"
                values={form.learn}
                onChange={(v) => set("learn", v)}
                addLabel="Add point"
                placeholder="Mixing skin tones from a limited palette"
              />

              <ListEditor
                label="Materials"
                hint="What is provided, and what to bring."
                values={form.materials}
                onChange={(v) => set("materials", v)}
                addLabel="Add material"
                placeholder="All paints and brushes provided"
              />

              <ListEditor
                label="Requirements"
                hint="Anything a student needs before joining. Leave empty if none."
                values={form.requirements}
                onChange={(v) => set("requirements", v)}
                addLabel="Add requirement"
                placeholder="No experience needed"
              />
            </FormSection>

            {/* 06 Syllabus */}
            <FormSection n="06" title="Session plan" blurb="Week-by-week or session-by-session breakdown. Optional.">
              <TripleEditor
                values={form.syllabus}
                onChange={(v) => set("syllabus", v)}
                addLabel="Add session"
                fields={[
                  { key: "label", placeholder: "Week 1", width: "sm" },
                  { key: "title", placeholder: "Value before colour", width: "md" },
                  { key: "body", placeholder: "What happens in this session", width: "lg", multiline: true },
                ]}
              />
            </FormSection>

            {/* 07 FAQs */}
            <FormSection n="07" title="Questions" blurb="Answers shown at the bottom of the class page. Optional.">
              <PairEditor
                values={form.faqs}
                onChange={(v) => set("faqs", v)}
                addLabel="Add question"
                fields={[
                  { key: "q", placeholder: "Do I need to bring anything?" },
                  { key: "a", placeholder: "No — everything is provided in the studio.", multiline: true },
                ]}
              />
            </FormSection>
          </div>

          {formError && (
            <div role="alert" className="mx-5 mb-4 border border-vermillion-dark/40 bg-vermillion-wash text-vermillion-dark px-4 py-2.5 text-[0.85rem]">
              {formError}
            </div>
          )}

          <div className="px-5 py-4 border-t border-rule flex gap-2 flex-wrap sticky bottom-0 bg-surface">
            <button type="submit" className="btn btn-primary" disabled={saving || uploadingCover || uploadingGallery}>
              {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> {editingId ? "Update class" : "Create class"}</>}
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={saving || uploadingCover}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-5 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-paper-dim animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <GraduationCap size={26} className="mx-auto text-slate mb-4" />
            <p className="text-graphite mb-5">No classes yet.</p>
            <button className="btn btn-primary mx-auto" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Add the first class
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-k">
              <thead>
                <tr>
                  <th>Cover</th>
                  <th>Class</th>
                  <th>Schedule</th>
                  <th>Price / seats</th>
                  <th>Detail</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  // How much of the detail page is actually filled in — an
                  // at-a-glance nudge to finish the richer content.
                  const filled = [c.overview, c.learn, c.materials, c.syllabus, c.faqs]
                    .filter((list) => list.some((v) => (typeof v === "string" ? v.trim() : Object.values(v).some(Boolean)))).length;
                  return (
                    <tr key={c.id}>
                      <td>
                        {c.cover ? (
                          <img src={c.cover} alt="" className="w-12 h-12 object-cover border border-rule" loading="lazy" />
                        ) : (
                          <div className="w-12 h-12 border border-rule flex items-center justify-center bg-paper-dim">
                            <ImageIcon size={15} className="text-slate" />
                          </div>
                        )}
                      </td>
                      <td className="min-w-[160px]">
                        <div className="font-semibold text-ink leading-tight">{c.title || "Untitled"}</div>
                        <div className="text-[0.72rem] text-slate mt-0.5">{c.level} · {c.mode}</div>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="text-ink">{c.startDate || "—"}</div>
                        <div className="text-[0.72rem] text-slate">{c.time || `${c.durationWeeks} weeks`}</div>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="font-semibold text-ink">{Number(c.price) > 0 ? fmtUSD.format(Number(c.price)) : "Free"}</div>
                        <div className="text-[0.72rem] text-slate">{c.seats} seats</div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={filled >= 3 ? "tag tag-green" : filled > 0 ? "tag tag-outline" : "tag tag-neutral"}>
                          {filled}/5 sections
                        </span>
                      </td>
                      <td>
                        <span className={c.published ? "tag tag-green" : "tag tag-neutral"}>
                          {c.published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1.5 justify-end">
                          <button className="btn btn-ghost btn-sm !px-2" onClick={() => startEdit(c)} aria-label={`Edit ${c.title}`}>
                            <Edit2 size={13} />
                          </button>
                          <button className="btn btn-danger btn-sm !px-2" onClick={() => deleteClass(c)} aria-label={`Delete ${c.title}`}>
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

      <ConfirmDialog {...confirm.props} />
    </div>
  );
};

export default ClassesPage;
