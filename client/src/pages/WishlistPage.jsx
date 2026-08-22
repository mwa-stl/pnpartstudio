import React, { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowUpRight, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import Reveal, { RevealLines } from "../components/motion/Reveal";

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#E7E6DE"/></svg>`
  );

const unitPrice = (it) =>
  typeof it.salePrice === "number" && it.salePrice !== null && it.salePrice < it.price
    ? it.salePrice
    : (it.price || 0);

const WishlistPage = () => {
  const { state, dispatch } = useCart();
  const navigate = useNavigate();

  const wishlist = useMemo(() => state?.wishlist || [], [state?.wishlist]);
  const hasItems = wishlist.length > 0;

  const total = useMemo(
    () => wishlist.reduce((sum, it) => sum + unitPrice(it), 0),
    [wishlist]
  );

  const removeFromWishlist = (id) => {
    dispatch?.({ type: "WISHLIST_REMOVE", payload: { id } });
  };

  // Carry sale pricing across so a discounted piece stays discounted in the cart
  const cartPayload = (item) => ({
    id: item.id,
    title: item.title,
    price: item.price,
    salePrice: item.salePrice,
    image: item.image,
    category: item.category,
    subcategory: item.subcategory,
    subsubcategory: item.subsubcategory,
    color: item.color,
  });

  const moveToCart = (item) => {
    dispatch?.({ type: "ADD_ITEM", payload: cartPayload(item) });
    dispatch?.({ type: "WISHLIST_REMOVE", payload: { id: item.id } });
  };

  const addAllToCartAndGo = () => {
    if (!wishlist.length) return;
    wishlist.forEach(item => {
      dispatch?.({ type: "ADD_ITEM", payload: cartPayload(item) });
      dispatch?.({ type: "WISHLIST_REMOVE", payload: { id: item.id } });
    });
    navigate("/cart");
  };

  const handleImgError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; };

  if (!hasItems) {
    return (
      <div className="min-h-[80vh] flex items-center bg-paper px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-[1600px] mx-auto w-full">
          <Reveal className="max-w-xl">
            <div className="section-index mb-8">Wishlist Empty</div>
            <RevealLines as="h1" className="t-display mb-7" lines={['No favourites', 'saved yet.']} />
            <p className="mb-10 text-graphite leading-relaxed">
              Save pieces you love and come back any time your wishlist stays on this device.
            </p>
            <Link to="/shop" className="btn-k">Browse artworks <ArrowUpRight size={13} /></Link>
          </Reveal>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper min-h-screen">
      <div className="border-b border-ink">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="section-index mb-7">Saved for later</div>
              <RevealLines as="h1" className="t-display" lines={['Wishlist']} />
            </div>
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-slate tabular-nums pb-2">
              {String(wishlist.length).padStart(2, "0")} {wishlist.length === 1 ? "piece" : "pieces"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 lg:gap-16">

          <ul className="border-t border-ink">
            {wishlist.map((item, idx) => {
              const href = `/product-details?id=${encodeURIComponent(item.id)}`;
              const onSale =
                typeof item.salePrice === "number" && item.salePrice !== null && item.salePrice < item.price;
              return (
                <Reveal
                  as="li"
                  key={item.id}
                  delay={Math.min(idx, 6) * 0.04}
                  distance={14}
                  className="grid grid-cols-[auto_84px_1fr_auto] gap-4 sm:gap-6 items-center py-5 border-b border-rule group"
                >
                  <span className="font-mono text-[0.6rem] text-slate tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>

                  <Link to={href} className="block w-[84px] aspect-square overflow-hidden bg-paper-deep border border-rule">
                    <img
                      src={item.image || FALLBACK_IMG}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.05]"
                      loading="lazy"
                      onError={handleImgError}
                    />
                  </Link>

                  <div className="min-w-0">
                    <Link to={href} className="t-title block truncate hover:text-vermillion transition-colors">
                      {item.title}
                    </Link>
                    {item.category && (
                      <div className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-slate mt-1.5 truncate">
                        {item.category}
                      </div>
                    )}
                    <div className="font-mono text-[0.88rem] tabular-nums mt-2">
                      {onSale ? (
                        <>
                          <span className="text-vermillion">{fmtUSD.format(item.salePrice)}</span>
                          <span className="text-slate line-through ml-2 text-[0.72rem]">{fmtUSD.format(Number(item.price || 0))}</span>
                        </>
                      ) : (
                        <span className="text-ink">{fmtUSD.format(Number(item.price || 0))}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="btn-k btn-k-sm hidden sm:inline-flex"
                      onClick={() => moveToCart(item)}
                      type="button"
                    >
                      Add to cart
                    </button>
                    <button
                      className="btn-k btn-k-sm sm:hidden !px-3"
                      onClick={() => moveToCart(item)}
                      type="button"
                      aria-label={`Add ${item.title} to cart`}
                    >
                      Add
                    </button>
                    <button
                      className="w-9 h-9 border border-rule-strong text-slate hover:bg-vermillion hover:text-white hover:border-vermillion flex items-center justify-center transition-colors shrink-0"
                      onClick={() => removeFromWishlist(item.id)}
                      aria-label={`Remove ${item.title} from wishlist`}
                      type="button"
                    >
                      <X size={14} strokeWidth={1.8} />
                    </button>
                  </div>
                </Reveal>
              );
            })}
          </ul>

          {/* Summary */}
          <div>
            <div className="border border-ink bg-paper sticky top-28">
              <div className="px-6 py-5 border-b border-ink bg-ink text-paper">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em]">Summary</span>
              </div>
              <div className="px-6 py-6">
                <dl className="flex flex-col gap-3 font-mono text-[0.8rem] mb-6">
                  <div className="flex justify-between text-graphite">
                    <dt className="uppercase tracking-[0.08em] text-[0.68rem]">Saved items</dt>
                    <dd className="text-ink tabular-nums">{wishlist.length}</dd>
                  </div>
                  <div className="flex justify-between items-baseline pt-4 border-t border-rule">
                    <dt className="uppercase tracking-[0.08em] text-[0.68rem] text-graphite">Estimated total</dt>
                    <dd className="text-ink tabular-nums text-[1.15rem]">{fmtUSD.format(total)}</dd>
                  </div>
                </dl>

                <div className="flex flex-col gap-2.5">
                  <button onClick={addAllToCartAndGo} className="btn-k w-full" type="button">
                    Move all to cart <ArrowUpRight size={13} />
                  </button>
                  <Link to="/shop" className="btn-k btn-k-ghost w-full">Continue shopping</Link>
                </div>

                <p className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-slate mt-6 leading-relaxed">
                  Stored on this device. Moving items to the cart doesn&apos;t reserve them —
                  pieces are one of a kind.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;
