import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { X, Plus, Minus, ArrowUpRight } from "lucide-react";
import { useCart } from "../context/CartContext";

const EASE = [0.16, 1, 0.3, 1];

const FALLBACK_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 600 600">
       <rect width="100%" height="100%" fill="#E7E6DE"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8C8C86" font-family="monospace" font-size="26" letter-spacing="3">NO IMAGE</text>
     </svg>`
  );

const fmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

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

const qtyBtn =
  "w-7 h-7 flex items-center justify-center text-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink";

const CartDropdown = () => {
  const { state, dispatch, totalPrice } = useCart();

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) dispatch({ type: "REMOVE_ITEM", payload: id });
    else dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } });
  };

  const close = () => dispatch({ type: "CLOSE_CART" });

  useEffect(() => {
    if (!state.isOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isOpen]);

  /*
   * Portaled straight to <body> instead of rendering inside <Header>. A
   * `position: fixed` descendant is only fixed to the viewport as long as no
   * ancestor sets a transform/filter/perspective (Framer Motion elements can
   * apply these mid-animation) — if one does, "fixed" quietly becomes fixed
   * to THAT ancestor's box instead, which is exactly what made this panel
   * look like it never fully opened. Rendering outside the header's subtree
   * removes the possibility entirely.
   */
  return createPortal(
    <AnimatePresence>
      {state.isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/45 z-[1040]"
            onClick={close}
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="fixed top-0 right-0 h-full w-[400px] max-w-full bg-paper z-[1050] border-l border-ink flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
          >
            {/* Head */}
            <div className="flex justify-between items-center px-6 border-b border-ink shrink-0" style={{ height: 84 }}>
              <div>
                <div className="section-index !gap-2.5 mb-1">Cart</div>
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate">
                  {state.items.length} {state.items.length === 1 ? "item" : "items"}
                </span>
              </div>
              <button
                onClick={close}
                type="button"
                aria-label="Close cart"
                className="w-9 h-9 border border-rule-strong text-ink hover:bg-ink hover:text-paper hover:border-ink flex items-center justify-center transition-colors"
              >
                <X size={15} strokeWidth={1.8} />
              </button>
            </div>

            {/* Body. `data-lenis-prevent` for the same reason as the mobile
                nav — Lenis owns document scrolling and would otherwise
                swallow this list's own native scroll. */}
            <div className="flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
              {state.items.length === 0 ? (
                <div className="text-center py-24 px-6 flex flex-col items-center">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-slate mb-6">Empty</span>
                  <p className="t-section mb-8">Nothing here yet.</p>
                  <Link to="/shop" onClick={close} className="btn-k btn-k-sm">
                    Start shopping <ArrowUpRight size={12} />
                  </Link>
                </div>
              ) : (
                <ul>
                  {state.items.map((item, i) => {
                    const url = getCover(item);
                    const safeSrc = url || FALLBACK_SVG;
                    const productUrl = `/product-details?id=${encodeURIComponent(item.productId || item.id)}`;
                    const onSale =
                      typeof item.salePrice === "number" && item.salePrice !== null && item.salePrice < item.price;
                    return (
                      <li key={item.id} className="flex gap-4 px-6 py-5 border-b border-rule">
                        <Link to={productUrl} onClick={close} className="shrink-0 relative">
                          <img
                            src={safeSrc}
                            alt=""
                            className="w-[70px] h-[70px] object-cover bg-paper-deep border border-rule"
                            loading="lazy"
                            onError={handleImgError}
                          />
                          <span className="absolute -top-px -left-px bg-ink text-paper font-mono text-[0.5rem] px-1 py-0.5 tabular-nums">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        </Link>

                        <div className="grow min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to={productUrl}
                              onClick={close}
                              className="t-title !text-[0.95rem] line-clamp-2 hover:text-vermillion transition-colors pr-1"
                            >
                              {item.title}
                            </Link>
                            <button
                              onClick={() => dispatch({ type: "REMOVE_ITEM", payload: item.id })}
                              type="button"
                              aria-label={`Remove ${item.title} from cart`}
                              className="shrink-0 text-slate hover:text-vermillion transition-colors p-0.5"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="font-mono text-[0.8rem] tabular-nums mt-1.5 mb-3">
                            {onSale ? (
                              <>
                                <span className="text-vermillion">{fmtUSD.format(item.salePrice)}</span>
                                <span className="text-slate line-through ml-2 text-[0.7rem]">{fmtUSD.format(item.price)}</span>
                              </>
                            ) : (
                              <span className="text-ink">{fmtUSD.format(item.price)}</span>
                            )}
                          </div>

                          <div className="flex items-center border border-rule-strong w-fit">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              type="button"
                              aria-label={`Decrease quantity of ${item.title}`}
                              className={qtyBtn}
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center font-mono text-[0.72rem] tabular-nums" aria-live="polite">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              type="button"
                              aria-label={`Increase quantity of ${item.title}`}
                              className={qtyBtn}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Foot */}
            {state.items.length > 0 && (
              <div className="border-t border-ink px-6 py-5 shrink-0 bg-paper-dim">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-graphite">Subtotal</span>
                  <span className="font-mono text-[1.25rem] font-medium text-ink tabular-nums">
                    {fmtUSD.format(totalPrice)}
                  </span>
                </div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-slate mb-5">
                  Shipping &amp; discounts at checkout
                </p>
                <div className="flex flex-col gap-2">
                  <Link to="/checkout" onClick={close} className="btn-k w-full">
                    Checkout <ArrowUpRight size={13} />
                  </Link>
                  <Link to="/cart" onClick={close} className="btn-k btn-k-ghost w-full">View cart</Link>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CartDropdown;
