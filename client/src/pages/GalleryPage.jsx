import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X, LayoutGrid, Rows3, Search, Download, Share2, Copy, Check,
  ChevronLeft, ChevronRight, Expand, Play,
} from "lucide-react";
import axios from "axios";
import Masonry from "react-masonry-css";
import Reveal, { RevealLines } from "../components/motion/Reveal";
import usePageHero from "../hooks/usePageHero";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="100%" height="100%" fill="#E7E6DE"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8C8C86" font-family="monospace" font-size="20" letter-spacing="3">NO IMAGE</text></svg>`
  );

const defaultCategories = ["All", "Paintings", "Handcrafted Items", "Exhibitions", "Other"];

const isVideo = (item) => item?.type === "video";

/** m:ss for a duration in seconds. */
const runtime = (seconds) => {
  const total = Math.round(Number(seconds) || 0);
  if (!total) return "";
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const Toast = ({ show, text }) => (
  <div
    role="status"
    aria-live="polite"
    className={`fixed left-1/2 bottom-8 z-[1200] -translate-x-1/2 bg-ink text-paper px-5 py-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] pointer-events-none transition-all duration-300 ${
      show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
    }`}
  >
    {text}
  </div>
);

const plate = (i) => String(i + 1).padStart(3, "0");

/* ── Plate ────────────────────────────────────────────────────────────────
 Metadata rides up over the image on hover instead of sitting in a fixed
 caption bar, so the artwork owns the whole tile at rest.

 Module scope on purpose: declared inside GalleryPage it was a new component
 type every render, so every tile remounted — restarting the hover
 transition and throwing away the browser's decoded images. */
const Plate = ({ image, index, viewMode, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(index)}
    className="group relative block w-full text-left overflow-hidden bg-paper-deep border border-rule hover:border-ink transition-colors duration-500"
    aria-label={`Open ${image.title || "artwork"}`}
  >
    <img
      src={(isVideo(image) ? image.poster : image.src) || FALLBACK_IMG}
      alt={image.title || "Artwork"}
      loading="lazy"
      decoding="async"
      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
      className={`w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06] ${
        viewMode === "grid" ? "h-full aspect-[4/5]" : "h-auto min-h-[180px]"
      }`}
    />

    {/* A film in the archive announces itself, and says how long it runs. */}
    {isVideo(image) && (
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="w-14 h-14 rounded-full bg-ink/70 text-paper flex items-center justify-center backdrop-blur-sm transition-transform duration-500 group-hover:scale-110">
          <Play size={20} fill="currentColor" className="ml-0.5" />
        </span>
      </span>
    )}

    {/* Plate number — always visible, the one piece of chrome at rest. */}
    <span className="absolute top-0 left-0 bg-paper text-ink border-r border-b border-ink px-2.5 py-1.5 font-mono text-[0.55rem] tabular-nums">
      {plate(index)}
    </span>

    {/* Hover: ink scrim + caption rising from the base */}
    <span className="absolute inset-0 bg-ink/0 group-hover:bg-ink/72 transition-colors duration-500" aria-hidden="true" />

    <span className="absolute inset-x-0 bottom-0 p-4 sm:p-5 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
      <span className="block font-mono text-[0.54rem] uppercase tracking-[0.16em] text-vermillion mb-2">
        {image.category || "Artwork"}
      </span>
      <span className="block text-paper text-[1.05rem] leading-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
        {image.title || "Untitled"}
      </span>
      {(image.medium || image.year) && (
        <span className="block font-mono text-[0.56rem] uppercase tracking-[0.12em] text-paper/55 mt-1.5">
          {[image.medium, image.year].filter(Boolean).join(" · ")}
        </span>
      )}
    </span>

    {isVideo(image) && runtime(image.duration) && (
      <span className="absolute bottom-0 right-0 bg-ink text-paper px-2 py-1 font-mono text-[0.55rem] tabular-nums group-hover:opacity-0 transition-opacity duration-300">
        {runtime(image.duration)}
      </span>
    )}

    <span className="absolute top-0 right-0 bg-vermillion text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-400" aria-hidden="true">
      <Expand size={13} strokeWidth={2} />
    </span>
  </button>
);

const GalleryPage = () => {
  const hero = usePageHero("gallery");

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filterCategory, setFilterCategory] = useState("All");
  const [viewMode, setViewMode] = useState("masonry");
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(defaultCategories);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState({ show: false, text: "" });
  const gridRef = useRef(null);

  const flash = useCallback((text) => {
    setToast({ show: true, text });
    setTimeout(() => setToast({ show: false, text: "" }), 1600);
  }, []);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    (async () => {
      setErr("");
      try {
        const { data } = await axios.get(`${API_BASE}/api/gallery?limit=9999`, {
          withCredentials: true,
          signal: controller.signal,
        });
        if (ignore) return;
        const arr = (data.items || []).map((it) => ({ ...it, src: it.src || it.url || "" }));
        setItems(arr);
        const discovered = Array.from(new Set(arr.map((i) => i.category).filter(Boolean)));
        if (discovered.length) setCategories(["All", ...discovered]);
      } catch (e) {
        if (!ignore && !axios.isCancel(e)) setErr("We couldn’t load the gallery just now. Please refresh to try again.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; controller.abort(); };
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (filterCategory !== "All") {
      const normCat = filterCategory.trim().toLowerCase();
      list = list.filter((i) => (i.category || "").trim().toLowerCase() === normCat);
    }
    if (searchTerm.trim().length) {
      const q = searchTerm.toLowerCase();
      list = list.filter((i) =>
        [i.title, i.medium, i.description, i.category, i.year]
          .some((val) => (val ? String(val).toLowerCase() : "").includes(q))
      );
    }
    return list;
  }, [items, filterCategory, searchTerm]);

  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : null;

  /* Lightbox: escape closes, arrows walk the filtered set. Navigating inside
     the viewer beats closing and reopening for every piece. */
  const step = useCallback((delta) => {
    setSelectedIndex((i) => {
      if (i < 0 || !filtered.length) return i;
      return (i + delta + filtered.length) % filtered.length;
    });
  }, [filtered.length]);

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedIndex(-1);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [selected, step]);

  // A filter change can leave the open index pointing at a different piece.
  useEffect(() => { setSelectedIndex(-1); }, [filterCategory, searchTerm]);

  const countFor = useCallback(
    (cat) => (cat === "All" ? items.length : items.filter((i) => (i.category || "").trim() === cat).length),
    [items]
  );

  const breakpointColumns = { default: 4, 1400: 3, 900: 2, 0: 1 };

  const downloadImage = async (src, name = "artwork.jpg") => {
    try {
      const res = await fetch(src, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      flash("Download started");
    } catch {
      window.open(src, "_blank", "noopener,noreferrer");
    }
  };

  const copyToClipboard = async (text) => {
    try { await navigator.clipboard.writeText(text); flash("Link copied"); }
    catch { flash("Copy failed"); }
  };

  const shareImage = async (img) => {
    const title = img?.title || "Artwork";
    const src = img?.src;
    if (navigator.share && src) {
      try { await navigator.share({ title, text: title, url: src }); return; }
      catch { /* user dismissed the share sheet */ }
    }
    if (src) await copyToClipboard(src);
  };

  const scrollToGrid = () => {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="bg-paper min-h-screen">
      {/* ── Masthead: headline left, live counters right ──────────────── */}
      <section className="border-b border-ink">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-20 items-end">
            <div>
              <div className="section-index mb-8">{hero.sectionLabel}</div>
              <RevealLines as="h1" className="t-hero" lines={hero.headingLines} />
            </div>

            <Reveal delay={0.12} className="lg:pb-2">
              {hero.intro && <p className="text-graphite leading-relaxed max-w-md mb-8">{hero.intro}</p>}
              <dl className="grid grid-cols-2 border-t border-l border-rule">
                <div className="border-r border-b border-rule px-5 py-4">
                  <dd className="text-ink tabular-nums leading-none" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.7rem,3vw,2.4rem)" }}>
                    {loading ? "—" : plate(items.length - 1)}
                  </dd>
                  <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-slate mt-2.5">Works archived</dt>
                </div>
                <div className="border-r border-b border-rule px-5 py-4">
                  <dd className="text-ink tabular-nums leading-none" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.7rem,3vw,2.4rem)" }}>
                    {loading ? "—" : String(Math.max(0, categories.length - 1)).padStart(2, "0")}
                  </dd>
                  <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-slate mt-2.5">Collections</dt>
                </div>
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Collections index — the categories as a catalogue list ─────── */}
      {!loading && categories.length > 1 && (
        <section className="border-b border-rule bg-paper-dim">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <div className="label-mono mb-6">Browse by collection</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-rule">
              {categories.map((cat, i) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { setFilterCategory(cat); scrollToGrid(); }}
                  aria-pressed={filterCategory === cat}
                  className={`text-left border-r border-b border-rule px-5 py-5 group transition-colors duration-300 ${
                    filterCategory === cat ? "bg-ink text-paper" : "bg-paper hover:bg-paper-deep"
                  }`}
                >
                  <span className={`block font-mono text-[0.54rem] tabular-nums mb-3 ${filterCategory === cat ? "text-vermillion" : "text-vermillion"}`}>
                    {String(i).padStart(2, "0")}
                  </span>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="t-title !text-[1.05rem] truncate">{cat}</span>
                    <span className={`font-mono text-[0.6rem] tabular-nums shrink-0 ${filterCategory === cat ? "text-paper/60" : "text-slate"}`}>
                      {String(countFor(cat)).padStart(2, "0")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Control bar ────────────────────────────────────────────────── */}
      <div ref={gridRef} className="sticky top-[84px] z-30 bg-paper/95 backdrop-blur-md border-b border-ink">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-4">
          <div className="flex items-end flex-1 min-w-0 max-w-md gap-2 border-b border-rule-strong focus-within:border-vermillion transition-colors">
            <Search size={15} className="text-slate mb-2.5 shrink-0" aria-hidden="true" />
            <label htmlFor="gallery-search" className="sr-only">Search artworks</label>
            <input
              id="gallery-search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search title, medium, year…"
              className="flex-1 bg-transparent border-0 py-2 text-[0.9rem] text-ink focus:outline-none placeholder:text-slate min-w-0"
            />
            {searchTerm && (
              <button type="button" className="text-slate hover:text-vermillion transition-colors mb-2.5" onClick={() => setSearchTerm("")} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          {filterCategory !== "All" && (
            <button
              type="button"
              onClick={() => setFilterCategory("All")}
              className="hidden sm:inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] bg-ink text-paper px-3 py-2 hover:bg-vermillion transition-colors"
            >
              {filterCategory} <X size={12} />
            </button>
          )}

          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-slate tabular-nums ml-auto shrink-0" aria-live="polite">
            {loading ? "Loading…" : `${String(filtered.length).padStart(3, "0")} shown`}
          </span>

          <div className="flex border border-rule-strong shrink-0">
            <button
              className={`p-2.5 transition-colors ${viewMode === "masonry" ? "bg-ink text-paper" : "text-graphite hover:text-ink"}`}
              onClick={() => setViewMode("masonry")}
              aria-label="Masonry view" aria-pressed={viewMode === "masonry"}
            >
              <Rows3 size={15} strokeWidth={1.7} />
            </button>
            <button
              className={`p-2.5 border-l border-rule-strong transition-colors ${viewMode === "grid" ? "bg-ink text-paper" : "text-graphite hover:text-ink"}`}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view" aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid size={15} strokeWidth={1.7} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Plates ─────────────────────────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 pb-24">
        {err && (
          <div role="alert" className="border border-vermillion bg-vermillion-wash px-5 py-4 mb-8 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-vermillion-dark text-center">
            {err}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-paper-deep animate-pulse border border-rule" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-28">
            <p className="t-section mb-4">Nothing here yet</p>
            <p className="text-graphite mb-8">No artworks match those filters.</p>
            <button
              type="button"
              className="btn-k btn-k-sm btn-k-outline"
              onClick={() => { setFilterCategory("All"); setSearchTerm(""); }}
            >
              Clear filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((img, i) => (
              <Plate image={img} index={i} viewMode={viewMode} onOpen={setSelectedIndex} key={img._id || img.id || `${img.src}${i}`} />
            ))}
          </div>
        ) : (
          <Masonry breakpointCols={breakpointColumns} className="flex -mx-2" columnClassName="px-2">
            {filtered.map((img, i) => (
              <div className="mb-4" key={img._id || img.id || `${img.src}${i}`}>
                <Plate image={img} index={i} viewMode={viewMode} onOpen={setSelectedIndex} />
              </div>
            ))}
          </Masonry>
        )}
      </div>

      {/* ── Lightbox: image left, catalogue entry right, arrows to walk ── */}
      {selected && (
        <div
          className="fixed inset-0 z-[1100] bg-ink/92 flex items-center justify-center p-3 sm:p-6"
          onClick={() => setSelectedIndex(-1)}
          role="dialog"
          aria-modal="true"
          aria-label={selected.title || "Artwork"}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); step(-1); }}
            className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center border border-paper/30 text-paper hover:bg-paper hover:text-ink transition-colors z-10"
            aria-label="Previous artwork"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); step(1); }}
            className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center border border-paper/30 text-paper hover:bg-paper hover:text-ink transition-colors z-10"
            aria-label="Next artwork"
          >
            <ChevronRight size={18} />
          </button>

          <div
            className="w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-paper border border-ink grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-paper-deep flex items-center justify-center relative min-h-[240px]">
              {isVideo(selected) ? (
                <video
                  key={selected._id || selected.src}
                  src={selected.src}
                  poster={selected.poster || undefined}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="w-full max-h-[50vh] lg:max-h-[88vh] bg-ink"
                >
                  Your browser cannot play this video.
                </video>
              ) : (
                <img
                  src={selected.src || FALLBACK_IMG}
                  alt={selected.title || "Artwork"}
                  className="object-contain w-full max-h-[50vh] lg:max-h-[88vh]"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
                />
              )}
              <span className="absolute top-0 left-0 bg-ink text-paper px-3 py-2 font-mono text-[0.58rem] tabular-nums">
                {plate(selectedIndex)} <span className="text-paper/50">/ {plate(filtered.length - 1)}</span>
              </span>
            </div>

            <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-ink">
              <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-vermillion">
                  {isVideo(selected) ? "Film" : (selected.category || "Artwork")}
                </span>
                <button
                  onClick={() => setSelectedIndex(-1)}
                  className="w-9 h-9 border border-rule-strong text-ink hover:bg-ink hover:text-paper hover:border-ink flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X size={15} strokeWidth={1.8} />
                </button>
              </div>

              <div className="p-6 sm:p-8 flex-1">
                <h2 className="t-display !text-[clamp(1.5rem,2.6vw,2.1rem)] mb-5">{selected.title || "Untitled"}</h2>

                <dl className="border-t border-rule mb-7">
                  {[
                    isVideo(selected) && runtime(selected.duration) && ["Runtime", runtime(selected.duration)],
                    selected.medium && ["Medium", selected.medium],
                    selected.year && ["Year", String(selected.year)],
                    selected.category && ["Collection", selected.category],
                  ].filter(Boolean).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2.5 border-b border-rule">
                      <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-slate pt-0.5">{k}</dt>
                      <dd className="text-[0.88rem] text-ink text-right">{v}</dd>
                    </div>
                  ))}
                </dl>

                <p className="text-graphite leading-relaxed text-[0.95rem]">
                  {selected.description || <span className="italic text-slate">No description provided.</span>}
                </p>
              </div>

              <div className="p-6 pt-0 flex flex-col gap-2.5">
                <div className="flex gap-2.5">
                  <button
                    className="btn-k btn-k-sm flex-1"
                    onClick={() => downloadImage(selected.src, `${(selected.title || "artwork").replace(/\s+/g, "_")}.${isVideo(selected) ? "mp4" : "webp"}`)}
                    type="button"
                  >
                    <Download size={13} /> Download
                  </button>
                  <button className="btn-k btn-k-sm btn-k-ghost flex-1" onClick={() => shareImage(selected)} type="button">
                    <Share2 size={13} /> Share
                  </button>
                  <button className="btn-k btn-k-sm btn-k-ghost flex-1" onClick={() => copyToClipboard(selected.src)} type="button">
                    {toast.text === "Link copied" && toast.show ? <Check size={13} /> : <Copy size={12} />} Copy
                  </button>
                </div>

                {/* Touch users get the arrows here, where the side buttons are hidden. */}
                <div className="flex gap-2.5 md:hidden">
                  <button className="btn-k btn-k-sm btn-k-ghost flex-1" onClick={() => step(-1)} type="button">
                    <ChevronLeft size={13} /> Previous
                  </button>
                  <button className="btn-k btn-k-sm btn-k-ghost flex-1" onClick={() => step(1)} type="button">
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast show={toast.show} text={toast.text} />
    </div>
  );
};

export default GalleryPage;
