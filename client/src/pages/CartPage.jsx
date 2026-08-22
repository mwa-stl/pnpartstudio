import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, X, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import Reveal, { RevealLines } from '../components/motion/Reveal';

const FREE_SHIPPING_THRESHOLD = 100;
const FLAT_SHIPPING = 15;

const fmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#E7E6DE"/></svg>`
  );

const getCover = (item) => {
  const single = typeof item?.image === 'string' ? item.image.trim() : '';
  if (single) return single;
  const arr = Array.isArray(item?.images) ? item.images : [];
  const first = arr.find(Boolean);
  if (!first) return '';
  if (typeof first === 'string') return first.trim();
  if (typeof first === 'object' && first !== null) {
    const url = first.secure_url || first.url || first.src || first.path || '';
    return String(url).trim();
  }
  return '';
};

const handleImgError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FALLBACK_IMG;
};

function wordLimitDesc(text, limit = 20) {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(' ') + '…';
}

const benefits = [
  ['Free shipping', `On orders over ${fmtUSD.format(FREE_SHIPPING_THRESHOLD)}`],
  ['Secure packaging', 'Archival, art-safe materials'],
  ['Studio pickup', 'Free, no minimum'],
];

const CartPage = () => {
  const { state, dispatch, totalPrice, totalItems } = useCart();
  const [descExpanded, setDescExpanded] = useState({});

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) dispatch({ type: 'REMOVE_ITEM', payload: id });
    else dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const removeItem = (id) => dispatch({ type: 'REMOVE_ITEM', payload: id });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const shippingCost = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  const finalTotal = totalPrice + shippingCost;
  const remainingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD - totalPrice);
  const progress = Math.min(100, (totalPrice / FREE_SHIPPING_THRESHOLD) * 100);

  const toggleDesc = (id) => setDescExpanded((ex) => ({ ...ex, [id]: !ex[id] }));

  if (state.items.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center bg-paper px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-[1600px] mx-auto w-full">
          <Reveal className="max-w-xl">
            <div className="section-index mb-8">Cart Empty</div>
            <RevealLines as="h1" className="t-display mb-7" lines={['Nothing in the cart', 'just yet.']} />
            <p className="mb-10 text-graphite leading-relaxed">
              Explore the collection and find something that stops you in your tracks.
            </p>
            <Link to="/shop" className="btn-k">Start shopping <ArrowUpRight size={13} /></Link>
          </Reveal>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper min-h-screen">
      {/* Masthead */}
      <div className="border-b border-ink">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="section-index mb-7">Your selection</div>
              <RevealLines as="h1" className="t-display" lines={['Shopping cart']} />
            </div>
            <div className="flex items-center gap-8">
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-slate tabular-nums">
                {String(totalItems).padStart(2, '0')} {totalItems === 1 ? 'item' : 'items'}
              </span>
              <Link to="/shop" className="group inline-flex items-center gap-2 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-ink hover:text-vermillion transition-colors">
                <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-1" />
                Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 lg:gap-16">

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-ink mb-1">
              <span className="label-mono">Items</span>
              <button
                onClick={clearCart}
                className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate hover:text-vermillion transition-colors"
                type="button"
              >
                Clear cart
              </button>
            </div>

            <ul>
              {state.items.map((item, index) => {
                const desc = item.description || '';
                const isLong = desc.trim().split(/\s+/).length > 20;
                const productUrl = `/product-details?id=${encodeURIComponent(item.productId || item.id)}`;
                const onSale =
                  typeof item.salePrice === 'number' && item.salePrice !== null && item.salePrice < item.price;
                const unit = onSale ? item.salePrice : item.price;

                return (
                  <Reveal
                    as="li"
                    key={item.id}
                    delay={Math.min(index, 5) * 0.05}
                    distance={14}
                    className="grid grid-cols-[auto_92px_1fr] sm:grid-cols-[auto_110px_1fr_auto] gap-4 sm:gap-6 py-6 border-b border-rule"
                  >
                    <span className="font-mono text-[0.6rem] text-slate tabular-nums pt-1">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <Link to={productUrl} className="block w-[92px] sm:w-[110px] aspect-square overflow-hidden bg-paper-deep border border-rule">
                      <img
                        src={getCover(item) || FALLBACK_IMG}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={handleImgError}
                      />
                    </Link>

                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <Link to={productUrl} className="t-title hover:text-vermillion transition-colors pr-2">
                          {item.title}
                        </Link>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="shrink-0 text-slate hover:text-vermillion transition-colors p-0.5 sm:hidden"
                          type="button"
                          aria-label={`Remove ${item.title} from cart`}
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {item.category && (
                        <div className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-slate mb-3">
                          {item.category}
                        </div>
                      )}

                      {desc && (
                        <p className="text-graphite text-[0.84rem] leading-relaxed mb-4 max-w-md">
                          {descExpanded[item.id] ? desc : wordLimitDesc(desc, 20)}
                          {isLong && (
                            <button
                              className="ml-2 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-vermillion hover:text-ink transition-colors"
                              onClick={() => toggleDesc(item.id)}
                              type="button"
                            >
                              {descExpanded[item.id] ? 'less' : 'more'}
                            </button>
                          )}
                        </p>
                      )}

                      <div className="flex items-center gap-5 flex-wrap">
                        <div className="flex items-center border border-rule-strong">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-ink hover:bg-ink hover:text-paper transition-colors"
                            aria-label={`Decrease quantity of ${item.title}`}
                            type="button"
                          ><Minus size={12} /></button>
                          <span className="w-9 text-center font-mono text-[0.76rem] tabular-nums" aria-live="polite">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-ink hover:bg-ink hover:text-paper transition-colors"
                            aria-label={`Increase quantity of ${item.title}`}
                            type="button"
                          ><Plus size={12} /></button>
                        </div>

                        <div className="font-mono text-[0.95rem] tabular-nums sm:hidden">
                          {onSale && <span className="text-slate line-through mr-2 text-[0.72rem]">{fmtUSD.format(item.price * item.quantity)}</span>}
                          <span className={onSale ? 'text-vermillion' : 'text-ink'}>{fmtUSD.format(unit * item.quantity)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop price + remove */}
                    <div className="hidden sm:flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate hover:text-vermillion transition-colors p-0.5"
                        type="button"
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        <X size={15} />
                      </button>
                      <div className="font-mono text-[1rem] tabular-nums text-right whitespace-nowrap">
                        {onSale && (
                          <div className="text-slate line-through text-[0.72rem] mb-1">
                            {fmtUSD.format(item.price * item.quantity)}
                          </div>
                        )}
                        <span className={onSale ? 'text-vermillion' : 'text-ink'}>
                          {fmtUSD.format(unit * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </ul>

            {/* Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-l border-rule mt-12">
              {benefits.map(([title, body]) => (
                <div key={title} className="border-r border-b border-rule p-5">
                  <div className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-vermillion mb-2">{title}</div>
                  <div className="text-[0.84rem] text-graphite">{body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="border border-ink bg-paper sticky top-28">
              <div className="px-6 py-5 border-b border-ink bg-ink text-paper">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em]">Order summary</span>
              </div>

              <div className="px-6 py-6">
                <dl className="flex flex-col gap-3 font-mono text-[0.8rem]">
                  <div className="flex justify-between text-graphite">
                    <dt className="uppercase tracking-[0.08em] text-[0.68rem]">Subtotal</dt>
                    <dd className="text-ink tabular-nums">{fmtUSD.format(totalPrice)}</dd>
                  </div>
                  <div className="flex justify-between text-graphite">
                    <dt className="uppercase tracking-[0.08em] text-[0.68rem]">Shipping</dt>
                    <dd className={shippingCost === 0 ? "text-vermillion tabular-nums" : "text-ink tabular-nums"}>
                      {shippingCost === 0 ? 'Free' : fmtUSD.format(shippingCost)}
                    </dd>
                  </div>
                </dl>

                {remainingForFree > 0 && (
                  <div className="mt-6 pt-5 border-t border-rule">
                    <p className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-graphite mb-3 leading-relaxed">
                      Add <span className="text-vermillion">{fmtUSD.format(remainingForFree)}</span> for free shipping
                    </p>
                    <div className="h-[2px] bg-rule overflow-hidden">
                      <div className="h-full bg-vermillion transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-baseline mt-7 pt-6 border-t border-ink">
                  <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-graphite">Total</span>
                  <span className="font-mono text-[1.5rem] font-medium text-ink tabular-nums">
                    {fmtUSD.format(finalTotal)}
                  </span>
                </div>

                <Link to="/checkout" className="btn-k w-full mt-7">
                  Proceed to checkout <ArrowUpRight size={13} />
                </Link>

                <div className="mt-7 pt-5 border-t border-rule">
                  <div className="label-mono mb-3">We accept</div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Visa', 'Mastercard', 'Amex', 'PayPal'].map(p => (
                      <span key={p} className="tag-k">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
