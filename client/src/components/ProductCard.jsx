import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Minus, Plus, ArrowUpRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatUSD } from '../utils/currency';

function truncateWords(desc = '', n = 12) {
  if (!desc) return '';
  const words = desc.trim().split(/\s+/);
  if (words.length <= n) return desc;
  return words.slice(0, n).join(' ') + '…';
}

const isKolamMinQty = (subsub) =>
  typeof subsub === "string" &&
  ["kolam coasters", "kolam peetham"].includes(subsub.trim().toLowerCase());

const MIN_KOLAM_QTY = 5;
const MIN_DEFAULT_QTY = 1;

const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
       <rect width="100%" height="100%" fill="#E7E6DE"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8C8C86" font-family="monospace" font-size="18" letter-spacing="3">NO IMAGE</text>
     </svg>`
  );

const ProductCard = ({ product }) => {
  const { state, dispatch } = useCart();
  const navigate = useNavigate();
  const isWishlisted = (state?.wishlist || []).some((w) => w.id === product.id);

  const cover = React.useMemo(() => {
    const single = typeof product?.image === 'string' ? product.image.trim() : '';
    if (single) return single;
    const arr = Array.isArray(product?.images) ? product.images : [];
    const first = arr.find(Boolean);
    if (!first) return '';
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first !== null) {
      return first.secure_url || first.url || first.src || '';
    }
    return '';
  }, [product]);

  const handleImgError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = FALLBACK_IMG;
  };

  const minQty = isKolamMinQty(product.subsubcategory) ? MIN_KOLAM_QTY : MIN_DEFAULT_QTY;
  const [qty, setQty] = useState(minQty);

  const addToCart = () => {
    if (!product?.inStock) return;
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        id: product.id,
        title: product.title,
        price: product.price,
        salePrice: product.salePrice,
        image: cover,
        category: product.category,
        subcategory: product.subcategory,
        subsubcategory: product.subsubcategory,
        color: product.color,
        description: product.description,
        quantity: qty,
      }
    });
  };

  const toggleWishlist = () => {
    dispatch({
      type: 'WISHLIST_TOGGLE',
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

  const openProduct = () => navigate(`/product-details?id=${encodeURIComponent(product.id)}`);
  const detailHref = `/product-details?id=${encodeURIComponent(product.id)}`;

  const onSale = typeof product.salePrice === "number" && product.salePrice !== null;

  return (
    <article className="card-k group h-full flex flex-col">
      {/* Plate */}
      <div className="relative overflow-hidden bg-paper-deep" style={{ aspectRatio: "1 / 1" }}>
        <Link to={detailHref} tabIndex={-1} aria-hidden="true" className="block w-full h-full">
          <img
            src={cover || FALLBACK_IMG}
            alt=""
            className="object-cover w-full h-full transition-transform duration-[1100ms] ease-out group-hover:scale-[1.045]"
            loading="lazy"
            decoding="async"
            onError={handleImgError}
          />
        </Link>

        {product.category && (
          <span className="absolute top-0 left-0 bg-paper/95 backdrop-blur-sm border-r border-b border-rule px-2 py-1 sm:px-2.5 sm:py-1.5 font-mono text-[0.5rem] sm:text-[0.56rem] uppercase tracking-[0.12em] sm:tracking-[0.14em] text-graphite max-w-[75%] truncate">
            {product.category}
          </span>
        )}

        {product.inStock ? (
          product.featured && (
            <span className="absolute top-0 right-0 bg-vermillion text-white px-2 py-1 sm:px-2.5 sm:py-1.5 font-mono text-[0.5rem] sm:text-[0.56rem] uppercase tracking-[0.12em] sm:tracking-[0.14em]">
              Featured
            </span>
          )
        ) : (
          <span className="absolute top-0 right-0 bg-ink text-paper px-2 py-1 sm:px-2.5 sm:py-1.5 font-mono text-[0.5rem] sm:text-[0.56rem] uppercase tracking-[0.12em] sm:tracking-[0.14em]">
            Sold out
          </span>
        )}

        <button
          type="button"
          aria-label={isWishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
          aria-pressed={isWishlisted}
          onClick={toggleWishlist}
          className={`absolute right-0 bottom-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center border-l border-t transition-all duration-300
            ${isWishlisted
              ? 'bg-vermillion text-white border-vermillion'
              : 'bg-paper/95 text-ink border-rule opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 hover:bg-ink hover:text-paper hover:border-ink'}`}
        >
          <Heart size={15} strokeWidth={1.7} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Placard */}
      <div className="p-3 sm:p-5 flex flex-col flex-1 border-t border-rule">
        <h3 className="t-title !text-[0.95rem] sm:!text-[1.18rem] mb-1.5 sm:mb-2 line-clamp-2">
          <Link to={detailHref} className="hover:text-vermillion transition-colors duration-300">
            {product.title}
          </Link>
        </h3>

        {(product.subcategory || product.subsubcategory) && (
          <div className="font-mono text-[0.52rem] sm:text-[0.58rem] uppercase tracking-[0.12em] text-slate mb-2 sm:mb-3 line-clamp-1">
            {[product.subcategory, product.subsubcategory].filter(Boolean).join(' / ')}
          </div>
        )}

        {product.description && (
          <p className="hidden sm:block text-[0.85rem] text-graphite leading-relaxed mb-4 line-clamp-2">
            {truncateWords(product.description)}
          </p>
        )}

        {isKolamMinQty(product.subsubcategory) && (
          <div className="mb-3">
            <span className="tag-k tag-k-wash">Min order {MIN_KOLAM_QTY}</span>
          </div>
        )}

        {/* Price on request → WhatsApp */}
        {product.contactForPrice && !product.donated && (() => {
          const phone = String(import.meta.env.VITE_WHATSAPP_NUMBER || "").replace(/\D/g, "");
          const msg = `Hi! I'm interested in "${product.title}". Could you please share the price?`;
          const href = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : "/contact";
          return (
            <a
              href={href}
              target={phone ? "_blank" : undefined}
              rel={phone ? "noopener noreferrer" : undefined}
              className="btn-k btn-k-sm btn-k-outline mt-auto w-full"
            >
              Ask for price <ArrowUpRight size={12} />
            </a>
          );
        })()}

        {!product.contactForPrice && (
          <div className="mt-auto pt-3 sm:pt-4 border-t border-rule">
            {/* Price line */}
            <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
              {product.donated ? (
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-graphite">Donated</span>
              ) : onSale ? (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono text-[0.88rem] sm:text-[1rem] font-medium text-vermillion tabular-nums">
                    {formatUSD(Number(product.salePrice))}
                  </span>
                  <span className="font-mono text-[0.66rem] sm:text-[0.72rem] text-slate line-through tabular-nums">
                    {formatUSD(Number(product.price || 0))}
                  </span>
                </div>
              ) : (
                <span className="font-mono text-[0.88rem] sm:text-[1rem] font-medium text-ink tabular-nums">
                  {formatUSD(Number(product.price || 0))}
                </span>
              )}

              {isKolamMinQty(product.subsubcategory) && (
                <div className="flex items-center border border-rule-strong">
                  <button
                    type="button"
                    className="w-7 h-7 flex items-center justify-center text-ink hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink transition-colors"
                    onClick={() => setQty(q => Math.max(MIN_KOLAM_QTY, q - 1))}
                    disabled={qty <= MIN_KOLAM_QTY}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-7 text-center font-mono text-[0.72rem] tabular-nums" aria-live="polite">{qty}</span>
                  <button
                    type="button"
                    className="w-7 h-7 flex items-center justify-center text-ink hover:bg-ink hover:text-paper transition-colors"
                    onClick={() => setQty(q => q + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              {!product.donated && (
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={!product.inStock}
                  className="btn-k btn-k-sm flex-1"
                  aria-label={product.inStock ? `Add ${product.title} to cart` : 'Out of stock'}
                >
                  {product.inStock ? 'Add to cart' : 'Sold out'}
                </button>
              )}
              <button type="button" onClick={openProduct} className="btn-k btn-k-sm btn-k-ghost flex-1">
                View
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

export default ProductCard;
