import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Trash2, Star, RefreshCw, MessageSquareQuote, Search, X, ExternalLink, TrendingUp, FlagTriangleRight } from "lucide-react";
import Select from "../components/ui/Select.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import useConfirm from "../hooks/useConfirm.js";
import SectionEyebrow from "../components/SectionEyebrow.jsx";
import StatTile from "../components/StatTile.jsx";

/** A left accent that reads a review's quality at a glance without opening it. */
const ratingAccent = (rating) => {
  const n = Number(rating) || 0;
  if (n <= 2) return "var(--color-vermillion)";
  if (n >= 4) return "var(--color-forest)";
  return "var(--color-rule-strong)";
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const REVIEWS_URL = `${API_BASE}/api/reviews`;
// The storefront is a separate origin from this console, so a bare
// "/product-details?..." href would resolve against the admin app and 404.
const CLIENT_BASE = import.meta.env.VITE_CLIENT_URL || "http://localhost:5173";

const Stars = ({ rating }) => {
  const n = Number(rating) || 0;
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < n ? "text-vermillion" : "text-rule-strong"}
          fill={i < n ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
};

const fmtDate = (iso) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

const ReviewsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(REVIEWS_URL);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      toast.error("Failed to load reviews: " + (err.response?.data?.message || err.message));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Products that actually have a review, for the filter. */
  const products = useMemo(() => {
    const map = new Map();
    items.forEach((r) => {
      if (r.product?._id) map.set(r.product._id, r.product.title || "Untitled");
    });
    return [
      { value: "all", label: "All products" },
      ...Array.from(map, ([value, label]) => ({ value, label })),
    ];
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (ratingFilter !== "all") list = list.filter((r) => String(r.rating) === ratingFilter);
    if (productFilter !== "all") list = list.filter((r) => r.product?._id === productFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        [r.name, r.email, r.title, r.body, r.product?.title]
          .some((v) => String(v || "").toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, ratingFilter, productFilter, search]);

  const stats = useMemo(() => {
    if (!items.length) return { count: 0, average: 0, low: 0 };
    const total = items.reduce((sum, r) => sum + Number(r.rating || 0), 0);
    return {
      count: items.length,
      average: (total / items.length).toFixed(2),
      // One- and two-star reviews are the ones worth reading first, whether
      // they are genuine complaints or spam.
      low: items.filter((r) => Number(r.rating) <= 2).length,
    };
  }, [items]);

  const remove = (review) => confirm.ask({
    title: "Delete this review?",
    description: "It is removed from the product page immediately, and the reviewer is free to post a new one. This cannot be undone.",
    item: {
      label: `${review.name} — ${review.rating}/5`,
      image: review.product?.images?.[0],
      meta: [
        ["Product", review.product?.title || "Deleted product"],
        ["Email", review.email],
        ["Posted", fmtDate(review.createdAt)],
        review.photos?.length && ["Photos", `${review.photos.length} — deleted with the review`],
        ["Review", `${String(review.body).slice(0, 110)}${String(review.body).length > 110 ? "…" : ""}`],
      ],
    },
    onConfirm: async () => {
      try {
        await axios.delete(`${REVIEWS_URL}/${review._id}`);
        setItems((list) => list.filter((r) => r._id !== review._id));
        toast.success("Review deleted");
      } catch (err) {
        toast.error(err?.response?.data?.message || "Delete failed");
        throw err;
      }
    },
  });

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Reviews</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5 max-w-xl">
            Every rating and review left on a product page. Anyone can post one,
            so this is where fakes and abuse get removed.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        <StatTile icon={MessageSquareQuote} label="Total reviews" value={stats.count} />
        <StatTile icon={TrendingUp} label="Average rating" value={stats.count ? stats.average : "—"} accent />
        <StatTile icon={FlagTriangleRight} label="1–2 star" value={stats.low} />
      </div>

      {/* Filters */}
      <div className="panel panel-pad flex flex-wrap items-end gap-3 mb-5">
        <div className="flex items-center gap-2 border border-rule-strong bg-surface px-3 flex-1 min-w-[200px] focus-within:border-vermillion transition-colors">
          <Search size={15} className="text-slate shrink-0" aria-hidden="true" />
          <label htmlFor="rev-search" className="sr-only">Search reviews</label>
          <input
            id="rev-search"
            className="flex-1 bg-transparent border-0 py-2 text-[0.86rem] text-ink focus:outline-none placeholder:text-slate min-w-0"
            placeholder="Name, email, product, or text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search" className="text-slate hover:text-vermillion">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="w-[150px]">
          <label htmlFor="rev-rating" className="label">Rating</label>
          <Select
            id="rev-rating"
            value={ratingFilter}
            onChange={setRatingFilter}
            options={[
              { value: "all", label: "Any rating" },
              ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? "" : "s"}` })),
            ]}
          />
        </div>

        <div className="w-[220px]">
          <label htmlFor="rev-product" className="label">Product</label>
          <Select id="rev-product" value={productFilter} onChange={setProductFilter} options={products} />
        </div>

        <span className="text-[0.78rem] text-slate ml-auto tabular-nums">
          {filtered.length} of {items.length}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="panel h-28 animate-pulse bg-paper-dim" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel py-20 text-center">
          <MessageSquareQuote size={26} className="mx-auto text-slate mb-4" />
          <p className="text-graphite">
            {items.length === 0 ? "No reviews yet." : "No reviews match those filters."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-10">
          {filtered.map((r) => (
            <article
              key={r._id}
              className="panel p-0 border-l-[3px] overflow-hidden"
              style={{ borderLeftColor: ratingAccent(r.rating) }}
            >
              {/* Head — who, how many stars, when, and the delete action. */}
              <div className="flex items-center gap-3 px-5 py-3.5 bg-paper-dim border-b border-rule">
                <img
                  src={r.avatarUrl}
                  alt=""
                  className="w-9 h-9 rounded-full border border-rule shrink-0 bg-paper"
                />
                <div className="min-w-0">
                  <div
                    className="text-ink leading-tight truncate"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.02rem" }}
                  >
                    {r.name}
                  </div>
                  <div className="text-[0.68rem] text-slate font-mono truncate">{r.email}</div>
                </div>

                <div className="ml-auto flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <Stars rating={r.rating} />
                    <div className="text-[0.68rem] text-slate mt-0.5">{fmtDate(r.createdAt)}</div>
                  </div>
                  <button
                    className="btn btn-danger btn-sm !px-2"
                    onClick={() => remove(r)}
                    aria-label={`Delete the review from ${r.name}`}
                    title="Delete review"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex gap-4 px-5 py-4">
                {r.product?.images?.[0] && (
                  <a
                    href={`${CLIENT_BASE}/product-details?id=${r.product._id}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="shrink-0 block w-16 h-16 border border-rule hover:border-vermillion transition-colors"
                    title="Open product page"
                  >
                    <img src={r.product.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </a>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 sm:hidden">
                    <Stars rating={r.rating} />
                    <span className="text-[0.68rem] text-slate">{fmtDate(r.createdAt)}</span>
                  </div>

                  {r.product?._id ? (
                    <a
                      href={`${CLIENT_BASE}/product-details?id=${r.product._id}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 tag tag-neutral hover:text-vermillion transition-colors mb-2.5"
                      title="Open product page"
                    >
                      {r.product.title || "Untitled product"}
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="tag tag-neutral mb-2.5 inline-block">Deleted product</span>
                  )}

                  {r.title && <h3 className="text-ink font-semibold text-[0.95rem] mb-1">{r.title}</h3>}
                  <p className="text-graphite text-[0.86rem] leading-relaxed whitespace-pre-line">{r.body}</p>

                  {/* Reviewer photos — often the quickest tell that a review is
                      genuine, or that it is stock imagery lifted from elsewhere. */}
                  {r.photos?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {r.photos.map((url, n) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="block w-16 h-16 border border-rule hover:border-vermillion transition-colors"
                          title={`Photo ${n + 1} — open full size`}
                        >
                          <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog {...confirm.props} />
    </div>
  );
};

export default ReviewsPage;
