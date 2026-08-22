import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { LayoutGrid, Rows3, Search, X, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import ProductCard from "../components/ProductCard";
import Select from "../components/ui/Select";
import Reveal, { RevealLines } from "../components/motion/Reveal";
import { useProducts } from "../hooks/useProducts";
import usePageHero from "../hooks/usePageHero";
import { EVERYTHING, MAIN_CATEGORIES, PRODUCT_FILTERS } from "../data/shopCategories";

// Categories come from the shared tree the header's mega menu also reads.
// EVERYTHING is the unfiltered view: "All Products" is a real category in the
// database, so using it as the default hid everything under "Indian Products".
const CATEGORY_TABS = [EVERYTHING, ...MAIN_CATEGORIES];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
  { value: "name", label: "Name: A–Z" },
];

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const FALLBACK_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 600 600"><rect width="100%" height="100%" fill="#E7E6DE"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8C8C86" font-family="monospace" font-size="24" letter-spacing="3">NO IMAGE</text></svg>`
  );

const getCover = (item) => {
  if (typeof item?.image === "string" && item.image.trim()) return item.image.trim();
  if (Array.isArray(item?.images) && item.images.length > 0) {
    const first = item.images.find(Boolean);
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object") {
      const v = first.secure_url ?? first.url ?? first.src ?? first.path ?? "";
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  const maybe = item?.thumbnail ?? item?.cover ?? item?.photo ?? item?.picture ?? "";
  if (typeof maybe === "string" && maybe.trim()) return maybe.trim();
  if (maybe && typeof maybe === "object") {
    const v = maybe.secure_url ?? maybe.url ?? maybe.src ?? maybe.path ?? "";
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};

const handleImgError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FALLBACK_SVG;
};

/** Filter row: hairline list item that fills ink when active. */
const filterRow = (active, disabled = false) =>
  `w-full text-left px-3 py-2.5 font-mono text-[0.66rem] uppercase tracking-[0.1em] border-b border-rule transition-colors duration-250 flex items-center justify-between gap-3 ${
    disabled
      ? "text-slate/50 cursor-not-allowed"
      : active
        ? "bg-ink text-paper border-ink"
        : "text-graphite hover:text-vermillion"
  }`;

const ShopPage = () => {
  const hero = usePageHero("shop");
  const location = useLocation();
  const navigate = useNavigate();

  const { items: allItems = [], loading, error } = useProducts();

  const [viewMode, setViewMode] = useState("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortUI, setSortUI] = useState("newest");
  const [currentCat, setCurrentCat] = useState(EVERYTHING);
  const [subcat, setSubcat] = useState("");
  const [subsubcat, setSubsubcat] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    const ps = new URLSearchParams(location.search);
    setCurrentCat(ps.get("category") || EVERYTHING);
    setSubcat(ps.get("subcategory") || "");
    setSubsubcat(ps.get("subsubcategory") || "");
    setSearchTerm(ps.get("q") || "");
    setSortUI(ps.get("sort") || "newest");
    setMinPrice(ps.get("min") || "");
    setMaxPrice(ps.get("max") || "");
  }, [location.search]);

  const pushUrl = useCallback((patch = {}) => {
    const current = {
      category: currentCat, subcategory: subcat, subsubcategory: subsubcat,
      q: searchTerm, sort: sortUI, min: minPrice, max: maxPrice,
      ...patch,
    };
    const ps = new URLSearchParams();
    if (current.category && current.category !== EVERYTHING) ps.set("category", current.category);
    if (current.subcategory) ps.set("subcategory", current.subcategory);
    if (current.subsubcategory) ps.set("subsubcategory", current.subsubcategory);
    if (current.q) ps.set("q", current.q);
    if (current.sort && current.sort !== "newest") ps.set("sort", current.sort);
    if (current.min) ps.set("min", current.min);
    if (current.max) ps.set("max", current.max);
    const qs = ps.toString();
    navigate(qs ? `/shop?${qs}` : "/shop", { replace: true });
  }, [navigate, currentCat, subcat, subsubcat, searchTerm, sortUI, minPrice, maxPrice]);

  const handleCategory = (cat) => pushUrl({ category: cat, subcategory: "", subsubcategory: "" });
  const handleSubcat = (c) => pushUrl({ subcategory: subcat === c ? "" : c, subsubcategory: "" });
  const handleSubsubcat = (name) => pushUrl({ subsubcategory: subsubcat === name ? "" : name });

  const subcategories = PRODUCT_FILTERS[currentCat] || [];
  const selectedSubcatObj = subcategories.find(sc => typeof sc === "object" && sc.label === subcat);
  const subsubcatOptions = selectedSubcatObj?.children || [];

  const viewItems = useMemo(() => {
    let out = allItems.slice();

    if (currentCat && currentCat !== EVERYTHING) out = out.filter(p => (p.category || "") === currentCat);
    if (subcat) out = out.filter(p => (p.subcategory || "") === subcat);
    if (subsubcat) out = out.filter(p => (p.subsubcategory || "") === subsubcat);

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      out = out.filter(i =>
        [i.title, i.medium, i.description, i.category, i.year, i.subcategory, i.subsubcategory]
          .some(val => (val ? String(val).toLowerCase().includes(q) : false))
      );
    }

    const min = minPrice.trim() ? parseFloat(minPrice) : undefined;
    const max = maxPrice.trim() ? parseFloat(maxPrice) : undefined;
    if (min !== undefined && !Number.isNaN(min)) out = out.filter(p => typeof p.price === "number" && p.price >= min);
    if (max !== undefined && !Number.isNaN(max)) out = out.filter(p => typeof p.price === "number" && p.price <= max);

    if (sortUI === "price-low") out.sort((a, b) => (a.salePrice || a.price || 0) - (b.salePrice || b.price || 0));
    if (sortUI === "price-high") out.sort((a, b) => (b.salePrice || b.price || 0) - (a.salePrice || a.price || 0));
    if (sortUI === "name") out.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    if (sortUI === "featured") out.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));

    return out;
  }, [allItems, currentCat, subcat, subsubcat, searchTerm, minPrice, maxPrice, sortUI]);

  const activeFilterCount =
    (currentCat !== EVERYTHING ? 1 : 0) + (subcat ? 1 : 0) + (subsubcat ? 1 : 0) +
    (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (searchTerm ? 1 : 0);

  const clearAll = () => navigate("/shop", { replace: true });

  /* ---------- Filter panel (sidebar + mobile drawer) ---------- */
  /* A render function, not a component. As `<FilterPanel />` it was a fresh
     component type each render, so React remounted the panel — and the price
     inputs lost focus after every character typed. Calling it inline keeps the
     closure over the thirteen values it needs, with no remount. */
  const renderFilterPanel = () => (
    <div className="flex flex-col gap-9">
      <div>
        <h3 className="label-mono mb-3">Collection</h3>
        <div className="border-t border-rule">
          {CATEGORY_TABS.map(cat => (
            <button key={cat} onClick={() => handleCategory(cat)} className={filterRow(currentCat === cat)}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {subcategories.length > 0 && (
        <div>
          <h3 className="label-mono mb-3">Category</h3>
          <div className="border-t border-rule">
            {subcategories.map(sc => {
              const label = typeof sc === "string" ? sc : sc.label;
              const disabled = typeof sc === "object" && !!sc.disabled;
              const hasChildren = typeof sc === "object" && !!sc.children;
              return (
                <button
                  key={label}
                  onClick={() => !disabled && handleSubcat(label)}
                  disabled={disabled}
                  className={filterRow(subcat === label, disabled)}
                >
                  <span>{label}</span>
                  {disabled && <span className="text-[0.55rem]">soon</span>}
                  {hasChildren && !disabled && (
                    <span className={`transition-transform duration-300 ${subcat === label ? "rotate-90" : ""}`}>›</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {subsubcatOptions.length > 0 && subcat === selectedSubcatObj?.label && (
        <div>
          <h3 className="label-mono label-mono-accent mb-3">{selectedSubcatObj.label}</h3>
          <div className="border-t border-rule pl-3 border-l-2 border-l-vermillion">
            {subsubcatOptions.map(ssc => (
              <button key={ssc} onClick={() => handleSubsubcat(ssc)} className={filterRow(subsubcat === ssc)}>
                {ssc}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="label-mono mb-3">Price</h3>
        <div className="flex items-end gap-3">
          <input
            type="number" min={0} inputMode="decimal"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            onBlur={() => pushUrl({ min: minPrice })}
            placeholder="Min"
            aria-label="Minimum price"
            className="field-k font-mono text-[0.8rem]"
          />
          <span className="text-slate pb-2">—</span>
          <input
            type="number" min={0} inputMode="decimal"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            onBlur={() => pushUrl({ max: maxPrice })}
            placeholder="Max"
            aria-label="Maximum price"
            className="field-k font-mono text-[0.8rem]"
          />
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={clearAll}
          className="self-start font-mono text-[0.62rem] uppercase tracking-[0.16em] text-vermillion hover:text-ink transition-colors border-b border-vermillion pb-1"
        >
          Reset all ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-paper min-h-screen">
      {/* Masthead */}
      <div className="border-b border-ink">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <div className="section-index mb-7">{hero.sectionLabel}</div>
              {/* The headline is the active category, not admin copy — it has
                  to follow what the visitor filtered to. */}
              <RevealLines as="h1" className="t-display" lines={[currentCat]} />
            </div>
            {hero.intro && (
              <p className="text-graphite max-w-sm leading-relaxed">{hero.intro}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-12">
          {/* Sidebar */}
          <aside className="hidden lg:block w-[220px] shrink-0">
            <div className="sticky top-28 bg-paper">{renderFilterPanel()}</div>
          </aside>

          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-end gap-4 pb-5 border-b border-ink mb-8">
              <div className="flex items-end flex-1 min-w-[200px] gap-2 border-b border-rule-strong focus-within:border-vermillion transition-colors">
                <Search size={15} className="text-slate mb-2.5 shrink-0" aria-hidden="true" />
                <label htmlFor="shop-search" className="sr-only">Search artworks</label>
                <input
                  id="shop-search"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") pushUrl({ q: searchTerm }); }}
                  onBlur={() => pushUrl({ q: searchTerm })}
                  placeholder="Search artworks…"
                  className="flex-1 bg-transparent border-0 py-2 text-[0.92rem] text-ink focus:outline-none placeholder:text-slate min-w-0"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="text-slate hover:text-vermillion transition-colors mb-2.5"
                    onClick={() => { setSearchTerm(""); pushUrl({ q: "" }); }}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <Select
                id="shop-sort"
                aria-label="Sort by"
                variant="box"
                className="w-[190px] shrink-0"
                buttonClassName="font-mono text-[0.68rem] uppercase tracking-[0.1em]"
                value={sortUI}
                onChange={(v) => pushUrl({ sort: v })}
                options={SORT_OPTIONS}
              />

              <div className="flex border border-rule-strong">
                <button
                  className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-ink text-paper" : "text-graphite hover:text-ink"}`}
                  aria-label="Grid view" aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid size={15} strokeWidth={1.7} />
                </button>
                <button
                  className={`p-2.5 border-l border-rule-strong transition-colors ${viewMode === "list" ? "bg-ink text-paper" : "text-graphite hover:text-ink"}`}
                  aria-label="List view" aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                >
                  <Rows3 size={15} strokeWidth={1.7} />
                </button>
              </div>

              <button
                className="lg:hidden flex items-center gap-2 border border-rule-strong px-3.5 py-2.5 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-ink hover:bg-ink hover:text-paper hover:border-ink transition-colors"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={14} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-vermillion text-white w-[16px] h-[16px] text-[0.55rem] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <span className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-slate tabular-nums w-full sm:w-auto sm:ml-auto pb-1" aria-live="polite">
                {loading ? "Loading…" : `${String(viewItems.length).padStart(2, "0")} works`}
              </span>
            </div>

            {error && (
              <p role="alert" className="mb-8 border border-vermillion bg-vermillion-wash px-5 py-4 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-vermillion-dark">
                {error}
              </p>
            )}

            {/* Results */}
            {loading ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-rule">
                    <div className="aspect-square bg-paper-deep animate-pulse" />
                    <div className="p-5 space-y-3 border-t border-rule">
                      <div className="h-4 bg-paper-deep animate-pulse w-3/4" />
                      <div className="h-3 bg-paper-deep animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : viewItems.length === 0 ? (
              <div className="py-28 text-center">
                <p className="t-section mb-4">Nothing matches those filters</p>
                <p className="text-graphite mb-9">Try a different category, or widen the price range.</p>
                <button onClick={clearAll} className="btn-k">Reset filters</button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
                {viewItems.map((product, idx) => (
                  <Reveal key={product.id || idx} delay={Math.min(idx, 5) * 0.05}>
                    <ProductCard product={product} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <ul className="border-t border-ink">
                {viewItems.map((p, idx) => {
                  const safeSrc = getCover(p) || FALLBACK_SVG;
                  const href = `/product-details?id=${encodeURIComponent(p.id)}`;
                  const onSale = typeof p.salePrice === "number" && p.salePrice !== null;
                  return (
                    <Reveal as="li" key={p.id || idx} delay={Math.min(idx, 6) * 0.04} distance={14}>
                      <Link
                        to={href}
                        className="group grid grid-cols-[auto_88px_1fr_auto] sm:grid-cols-[auto_100px_1fr_auto_auto] items-center gap-4 sm:gap-6 py-4 border-b border-rule hover:border-ink transition-colors duration-400"
                      >
                        <span className="font-mono text-[0.6rem] text-slate tabular-nums">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="block w-[88px] sm:w-[100px] aspect-square overflow-hidden bg-paper-deep">
                          <img
                            src={safeSrc} alt=""
                            className="w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
                            onError={handleImgError} loading="lazy"
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="t-title block truncate group-hover:text-vermillion transition-colors">{p.title}</span>
                          <span className="block font-mono text-[0.58rem] uppercase tracking-[0.12em] text-slate truncate mt-1.5">
                            {[p.category, p.subcategory, p.subsubcategory].filter(Boolean).join(" / ")}
                          </span>
                        </span>
                        <span className="font-mono text-[0.9rem] tabular-nums whitespace-nowrap hidden sm:block">
                          {onSale ? (
                            <>
                              <span className="text-vermillion">{fmtUSD.format(Number(p.salePrice))}</span>
                              <span className="text-slate line-through ml-2 text-[0.72rem]">{fmtUSD.format(Number(p.price || 0))}</span>
                            </>
                          ) : (
                            <span className="text-ink">{fmtUSD.format(Number(p.price || 0))}</span>
                          )}
                        </span>
                        <ArrowUpRight size={17} className="text-slate group-hover:text-vermillion transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 shrink-0" />
                      </Link>
                    </Reveal>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-[1100]">
          <div className="absolute inset-0 bg-ink/55" onClick={() => setFiltersOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm bg-paper border-l border-ink overflow-y-auto">
            <div className="flex items-center justify-between px-5 border-b border-ink sticky top-0 bg-paper" style={{ height: 84 }}>
              <div className="section-index">Filters</div>
              <button
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="w-9 h-9 border border-rule-strong text-ink hover:bg-ink hover:text-paper hover:border-ink flex items-center justify-center transition-colors"
              >
                <X size={15} strokeWidth={1.8} />
              </button>
            </div>
            <div className="px-5 py-8">{renderFilterPanel()}</div>
            <div className="px-5 pb-8">
              <button onClick={() => setFiltersOpen(false)} className="btn-k w-full">
                Show {viewItems.length} result{viewItems.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopPage;
