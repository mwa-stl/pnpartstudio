import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart, Share2, ArrowLeft, ArrowRight, Check, ArrowUpRight, Minus, Plus
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { getProduct, listProducts } from "../api/products";
import ProductCard from "../components/ProductCard";
import Reveal, { RevealLines } from "../components/motion/Reveal";
import ProductReviews from "../components/ProductReviews";

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const EASE = [0.16, 1, 0.3, 1];

const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="100%" height="100%" fill="#E7E6DE"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8C8C86" font-family="monospace" font-size="20" letter-spacing="3">NO IMAGE</text></svg>`
  );

const toUrl = (entry) => {
  if (!entry) return "";
  if (typeof entry === "string") return entry.trim();
  if (typeof entry === "object") {
    const u = entry.secure_url || entry.url || entry.src || entry.path || "";
    return String(u).trim();
  }
  return "";
};

function wordLimitDesc(text, limit = 40) {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ") + "…";
}

const ProductViewPage = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const { state, dispatch } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [descExpanded, setDescExpanded] = useState(false);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) { setProduct(null); setLoading(false); return; }
      try {
        setLoading(true); setErr("");
        const p = await getProduct(id);
        if (!cancelled) {
          setProduct(p?.id ? p : null);
          setSelectedImageIndex(0);
          setQuantity(1);
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Failed to load artwork";
        if (!cancelled) { setErr(msg); setProduct(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    setDescExpanded(false);
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function loadRelated() {
      if (!product?.category || !product?.subcategory) { setRelated([]); return; }
      try {
        const { items } = await listProducts({
          category: product.category,
          subcategory: product.subcategory,
          published: true
        });
        const trimmed = items.filter((p) => p.id !== product.id).slice(0, 4);
        if (!cancelled) setRelated(trimmed);
      } catch {
        if (!cancelled) setRelated([]);
      }
    }
    loadRelated();
    return () => { cancelled = true; };
  }, [product?.category, product?.subcategory, product?.id]);

  const images = useMemo(() => {
    if (!product) return [];
    const fromArray = Array.isArray(product.images) ? product.images.map(toUrl).filter(Boolean) : [];
    if (fromArray.length > 0) return fromArray;
    const single = toUrl(product.image);
    return single ? [single] : [];
  }, [product]);

  useEffect(() => {
    if (selectedImageIndex >= images.length) setSelectedImageIndex(0);
  }, [images, selectedImageIndex]);

  // Single cover URL the cart stores one string, not the whole array
  const cover = images[0] || FALLBACK_IMG;

  const nextImage = () => images.length && setSelectedImageIndex((p) => (p + 1) % images.length);
  const prevImage = () => images.length && setSelectedImageIndex((p) => (p - 1 + images.length) % images.length);
  const handleImgError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; };

  const addToCart = () => {
    if (!product?.inStock) return;
    dispatch({
      type: "ADD_ITEM",
      payload: {
        id: product.id,
        title: product.title,
        price: product.price,
        salePrice: product.salePrice,
        image: cover,
        images,
        category: product.category,
        subcategory: product.subcategory,
        subsubcategory: product.subsubcategory,
        color: product.color,
        description: product.description || "",
        quantity
      }
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const isWishlisted = product ? (state?.wishlist || []).some((w) => w.id === product.id) : false;

  const toggleWishlist = () => {
    if (!product) return;
    dispatch({
      type: "WISHLIST_TOGGLE",
      payload: {
        id: product.id,
        title: product.title,
        price: product.price,
        salePrice: product.salePrice,
        image: cover,
        category: product.category,
        subcategory: product.subcategory,
        subsubcategory: product.subsubcategory,
        color: product.color
      }
    });
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product?.title, url }); return; } catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-paper">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-paper-deep animate-pulse" />
            <div className="space-y-5 pt-6">
              <div className="h-3 w-28 bg-paper-deep animate-pulse" />
              <div className="h-12 w-3/4 bg-paper-deep animate-pulse" />
              <div className="h-8 w-32 bg-paper-deep animate-pulse" />
              <div className="h-28 w-full bg-paper-deep animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex items-center bg-paper px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="max-w-xl">
            <div className="section-index mb-8">Error 404</div>
            <h1 className="t-display mb-6">Artwork not found</h1>
            <p className="mb-10 text-graphite">{err || "This piece doesn’t exist or has been moved."}</p>
            <Link to="/shop" className="btn-k">Browse all artworks <ArrowUpRight size={13} /></Link>
          </div>
        </div>
      </div>
    );
  }

  const desc = product.description || "";
  const isLong = desc.trim().split(/\s+/).length > 40;

  const whatsappHref = (() => {
    const phone = String(import.meta.env.VITE_WHATSAPP_NUMBER || "").replace(/\D/g, "");
    const msg = `Hi! I'm interested in "${product.title}". Could you please share the price?`;
    return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : "/contact";
  })();

  const onSale =
    typeof product.salePrice === "number" && product.salePrice !== null && product.salePrice < product.price;

  const specs = [
    product.dimensions && { label: "Dimensions", value: product.dimensions },
    product.color && { label: "Colour", value: product.color },
    product.subcategory && { label: "Category", value: product.subcategory },
    { label: "Availability", value: product.inStock ? "In stock" : "Sold out" },
  ].filter(Boolean);

  const iconBtn = "w-12 h-12 border flex items-center justify-center transition-colors duration-300";

  return (
    <div className="bg-paper min-h-screen">
      {/* Breadcrumb strip */}
      <nav aria-label="Breadcrumb" className="border-b border-rule">
        <ol className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center gap-2.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate">
          <li><Link to="/" className="hover:text-vermillion transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to="/shop" className="hover:text-vermillion transition-colors">Shop</Link></li>
          {product.category && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-vermillion transition-colors">
                  {product.category}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li className="text-ink truncate max-w-[200px]" aria-current="page">{product.title}</li>
        </ol>
      </nav>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 mb-24">

          {/* Plate */}
          <div>
            <div className="relative overflow-hidden bg-paper-deep border border-rule" style={{ aspectRatio: "1 / 1" }}>
              <motion.img
                key={selectedImageIndex}
                src={images.length > 0 ? images[selectedImageIndex] : cover}
                alt={product.title}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: EASE }}
                className="w-full h-full object-cover"
                onError={handleImgError}
              />

              {!product.inStock && (
                <span className="absolute top-0 left-0 bg-ink text-paper px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.16em]">
                  Sold out
                </span>
              )}

              {images.length > 1 && (
                <div className="absolute bottom-0 right-0 flex">
                  <button onClick={prevImage} aria-label="Previous image"
                    className="w-11 h-11 bg-paper/95 border-l border-t border-rule text-ink hover:bg-ink hover:text-paper transition-colors flex items-center justify-center">
                    <ArrowLeft size={15} strokeWidth={1.8} />
                  </button>
                  <button onClick={nextImage} aria-label="Next image"
                    className="w-11 h-11 bg-paper/95 border-l border-t border-rule text-ink hover:bg-ink hover:text-paper transition-colors flex items-center justify-center">
                    <ArrowRight size={15} strokeWidth={1.8} />
                  </button>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-[72px] h-[72px] shrink-0 overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === idx ? "border-vermillion" : "border-rule hover:border-ink"
                    }`}
                    aria-label={`View image ${idx + 1}`}
                    aria-pressed={selectedImageIndex === idx}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" onError={handleImgError} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Placard */}
          <div className="lg:pt-4">
            <Reveal direction="right" distance={18}>
              {product.category && (
                <div className="section-index mb-7">
                  {[product.category, product.subcategory].filter(Boolean).join(" / ")}
                </div>
              )}

              <RevealLines as="h1" className="t-display mb-8" lines={[product.title]} />

              {/* Price */}
              <div className="pb-8 mb-8 border-b border-ink">
                {product.donated ? (
                  <span className="tag-k tag-k-ink">Donated piece</span>
                ) : product.contactForPrice ? (
                  <span className="tag-k tag-k-wash">Price on request</span>
                ) : (
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <span className="font-mono text-[2rem] font-medium text-ink tabular-nums leading-none">
                      {fmtUSD.format(onSale ? product.salePrice : product.price)}
                    </span>
                    {onSale && (
                      <>
                        <span className="font-mono text-[1rem] text-slate line-through tabular-nums">
                          {fmtUSD.format(product.price)}
                        </span>
                        <span className="tag-k tag-k-red">
                          Save {Math.round((1 - product.salePrice / product.price) * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              {desc && (
                <div className="text-graphite leading-[1.75] mb-9">
                  <p>{descExpanded ? desc : wordLimitDesc(desc, 40)}</p>
                  {isLong && (
                    <button
                      className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-vermillion hover:text-ink transition-colors"
                      onClick={() => setDescExpanded(v => !v)}
                      type="button"
                    >
                      {descExpanded ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              )}

              {/* Spec table */}
              {specs.length > 0 && (
                <dl className="border-t border-rule mb-9">
                  {specs.map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-[130px_1fr] gap-4 py-3 border-b border-rule">
                      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate">{label}</dt>
                      <dd className="text-[0.9rem] text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* Purchase */}
              <div className="flex flex-col gap-5">
                {!product.donated && !product.contactForPrice && (
                  <div className="flex items-center gap-5">
                    <span className="label-k !mb-0">Quantity</span>
                    <div className="flex items-center border border-rule-strong">
                      <button
                        type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-10 h-10 flex items-center justify-center text-ink hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink transition-colors"
                        aria-label="Decrease quantity"
                      ><Minus size={13} /></button>
                      <span className="w-11 text-center font-mono text-[0.82rem] tabular-nums" aria-live="polite">{quantity}</span>
                      <button
                        type="button" onClick={() => setQuantity(q => q + 1)}
                        className="w-10 h-10 flex items-center justify-center text-ink hover:bg-ink hover:text-paper transition-colors"
                        aria-label="Increase quantity"
                      ><Plus size={13} /></button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 flex-wrap items-center">
                  {!product.donated && !product.contactForPrice && (
                    <button
                      type="button"
                      onClick={addToCart}
                      disabled={!product.inStock}
                      className="btn-k flex-1 min-w-[210px]"
                    >
                      {added ? <><Check size={15} /> Added to cart</> : (product.inStock ? "Add to cart" : "Sold out")}
                    </button>
                  )}

                  {product.contactForPrice && !product.donated && (
                    <a
                      href={whatsappHref}
                      target={whatsappHref.startsWith("http") ? "_blank" : undefined}
                      rel={whatsappHref.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="btn-k flex-1 min-w-[210px]"
                    >
                      Ask about this piece <ArrowUpRight size={13} />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={toggleWishlist}
                    className={`${iconBtn} ${
                      isWishlisted
                        ? "bg-vermillion text-white border-vermillion"
                        : "bg-transparent text-ink border-rule-strong hover:bg-ink hover:text-paper hover:border-ink"
                    }`}
                    aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    aria-pressed={isWishlisted}
                  >
                    <Heart size={17} strokeWidth={1.7} fill={isWishlisted ? "currentColor" : "none"} />
                  </button>

                  <button
                    type="button"
                    onClick={share}
                    className={`${iconBtn} bg-transparent text-ink border-rule-strong hover:bg-ink hover:text-paper hover:border-ink`}
                    aria-label="Share this artwork"
                  >
                    {copied ? <Check size={17} className="text-vermillion" /> : <Share2 size={16} strokeWidth={1.7} />}
                  </button>
                </div>

                {/* Reassurance */}
                <ul className="mt-4 pt-6 border-t border-rule grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    ["Ships in", "2–3 business days"],
                    ["Packed with", "Archival materials"],
                    ["Delivery", "Tracked & insured"],
                  ].map(([k, v]) => (
                    <li key={k}>
                      <div className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-slate mb-1.5">{k}</div>
                      <div className="text-[0.85rem] text-ink">{v}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Reviews — open to anyone, moderated from the admin console. */}
        <ProductReviews productId={id} productTitle={product.title} />

        {/* Related */}
        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="pt-14 border-t border-ink">
            <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
              <div>
                <div className="section-index mb-6">More like this</div>
                <h2 id="related-heading" className="t-display">Related works</h2>
              </div>
              <Link
                to={`/shop?category=${encodeURIComponent(product.category)}&subcategory=${encodeURIComponent(product.subcategory)}`}
                className="group inline-flex items-center gap-2 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-ink hover:text-vermillion transition-colors border-b border-ink hover:border-vermillion pb-2"
              >
                View all
                <ArrowUpRight size={14} className="transition-transform duration-400 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {related.map((rp, idx) => (
                <Reveal key={rp.id} delay={idx * 0.06}>
                  <ProductCard product={rp} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductViewPage;
