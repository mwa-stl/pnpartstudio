import React, { useMemo, useState, useCallback, useRef } from 'react';
import { ArrowLeft, ArrowUpRight, Lock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { useCart } from '../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import StorePickupModal from '../components/StorePickupModal';
import { RevealLines } from '../components/motion/Reveal';
import Select from '../components/ui/Select';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const api = (path) => `${API_ORIGIN}/api${path}`;
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;
const hasPayPalClient = typeof PAYPAL_CLIENT_ID === 'string' && PAYPAL_CLIENT_ID.trim().length > 0;
const fmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="100%" height="100%" fill="#E7E6DE"/></svg>`
  );

const toUrl = (entry) => {
  if (!entry) return '';
  if (typeof entry === 'string') return entry.trim();
  if (typeof entry === 'object') {
    const u = entry.secure_url || entry.url || entry.src || entry.path || '';
    return String(u).trim();
  }
  return '';
};
const getCover = (item) => {
  const single = toUrl(item?.image);
  if (single) return single;
  const arr = Array.isArray(item?.images) ? item.images : [];
  return toUrl(arr.find(Boolean));
};
const handleImgError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FALLBACK_IMG;
};
const getUnitPrice = (it) =>
  typeof it.salePrice === "number" && it.salePrice !== null && it.salePrice < it.price
    ? it.salePrice
    : it.price;

const SHIPPING_THRESHOLD = 100;
const SHIPPING_FEE = 15;

const COUNTRIES = [
  ['US', 'United States'], ['IN', 'India'], ['GB', 'United Kingdom'], ['AE', 'UAE'], ['CA', 'Canada'], ['AU', 'Australia'],
];

const REQUIRED_FIELDS = ['firstName', 'lastName', 'email', 'address1', 'city', 'state', 'zip'];

/* ---------------- Field renderer ----------------
   Module scope, not inside CheckoutPage. Declared inside, it was a new
   component type on every render, so React remounted the input after each
   keystroke and the field lost focus — mid-address, on the checkout. */
const Field = ({ name, label, type = 'text', required, span, value, onChange, onBlurFn, errs, touchedMap, placeholder, autoComplete }) => (
  <div className={span ? 'md:col-span-2' : ''}>
    <label htmlFor={`co-${name}`} className="label-k">
      {label}{required && <span className="text-vermillion"> *</span>}
    </label>
    <input
      id={`co-${name}`}
      name={name}
      type={type}
      autoComplete={autoComplete}
      placeholder={placeholder}
      className="field-k"
      value={value}
      onChange={onChange}
      onBlur={onBlurFn}
      aria-invalid={!!(touchedMap[name] && errs[name])}
    />
    {touchedMap[name] && errs[name] && (
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-vermillion mt-2">{errs[name]}</p>
    )}
  </div>
);

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { state, clearCart } = useCart();
  // Memoised so the derived useMemos below don't re-run on every render
  const items = useMemo(() => state.items || [], [state.items]);

  const [coupon, setCoupon] = useState({ code: '', percent: 0, status: '' });
  const [promoMsg, setPromoMsg] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', address1: '', address2: '',
    city: '', state: '', zip: '', country: 'US', sameAsShipping: true, promo: ''
  });
  const [billing, setBilling] = useState({
    firstName: '', lastName: '', email: '', phone: '', address1: '', address2: '',
    city: '', state: '', zip: '', country: 'US'
  });
  const [touched, setTouched] = useState({});
  const [touchedBilling, setTouchedBilling] = useState({});
  const [showPickup, setShowPickup] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + getUnitPrice(it) * Number(it.qty ?? it.quantity ?? 1), 0),
    [items]
  );
  const shipping = subtotal > 0 && subtotal < SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
  const discount = useMemo(
    () => Math.round(subtotal * (coupon.percent / 100) * 100) / 100,
    [subtotal, coupon.percent]
  );
  const total = Math.max(0, Math.round((subtotal + shipping - discount) * 100) / 100);

  const itemsPayload = useMemo(() => items.map(it => ({
    productId: it.id,
    name: it.name || it.title || '',
    qty: Number(it.qty ?? it.quantity ?? 1),
    price: Number(getUnitPrice(it)),
    total: Number(getUnitPrice(it)) * Number(it.qty ?? it.quantity ?? 1),
    variant: it.variant || '',
    description: it.description || '',
    image: getCover(it) || '',
    category: it.category || '',
    sku: it.sku || '',
    brand: it.brand || '',
    meta: it.meta || {}
  })), [items]);

  const setField = useCallback((name, value) => setForm((f) => ({ ...f, [name]: value })), []);
  const setBillingField = useCallback((name, value) => setBilling((b) => ({ ...b, [name]: value })), []);

  const applyPromo = useCallback(async (e) => {
    e.preventDefault();
    const raw = form.promo.trim();
    if (!raw) { setPromoMsg('Enter a code'); return; }
    setApplyingPromo(true);
    try {
      const { data } = await axios.get(api(`/coupons/validate/${encodeURIComponent(raw)}`));
      if (data?.valid) {
        setCoupon({ code: data.code, percent: Number(data.percent || 0), status: 'applied' });
        setPromoMsg(`Promo applied ${data.percent}% off`);
      } else {
        setCoupon({ code: '', percent: 0, status: 'invalid' });
        setPromoMsg(data?.message || 'That code isn’t valid.');
      }
    } catch {
      setCoupon({ code: '', percent: 0, status: 'error' });
      setPromoMsg('Unable to validate that code. Please try again.');
    } finally {
      setApplyingPromo(false);
    }
  }, [form.promo]);

  const handleStorePickup = async (fields) => {
    try {
      await axios.post(api("/store-pickup-orders"), {
        fullName: fields.fullName,
        phone: fields.phone,
        email: fields.email,
        // Only which products and how many; the server prices the order.
        items: itemsPayload.map(({ productId, qty }) => ({ productId, qty })),
        couponCode: coupon.code
      });
      clearCart();
      navigate("/store-pickup-success", { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      toast.error(`Failed to place pickup order: ${msg}`);
      throw new Error(msg);
    }
  };

  const errors = useMemo(() => {
    const e = {};
    for (const k of REQUIRED_FIELDS) {
      if (!(form[k] || '').trim()) e[k] = 'Required';
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.phone && form.phone.trim() && !/^\+?[0-9 ()-]{10}$/.test(form.phone)) e.phone = 'Enter a valid phone';
    return e;
  }, [form]);

  const errorsBilling = useMemo(() => {
    if (form.sameAsShipping) return {};
    const e = {};
    for (const k of REQUIRED_FIELDS) {
      if (!(billing[k] || '').trim()) e[k] = 'Required';
    }
    if (billing.email && !/^\S+@\S+\.\S+$/.test(billing.email)) e.email = 'Enter a valid email';
    if (billing.phone && billing.phone.trim() && !/^\+?[0-9 ()-]{7,}$/.test(billing.phone)) e.phone = 'Enter a valid phone';
    return e;
  }, [billing, form.sameAsShipping]);

  const onBlur = useCallback((e) => setTouched((t) => ({ ...t, [e.target.name]: true })), []);
  const onBillingBlur = useCallback((e) => setTouchedBilling((t) => ({ ...t, [e.target.name]: true })), []);

  const shippingAddress = useMemo(() => ({
    fullName: `${form.firstName} ${form.lastName}`.trim(),
    line1: form.address1, line2: form.address2, city: form.city,
    state: form.state, postalCode: form.zip, countryCode: form.country,
    phone: form.phone, email: form.email
  }), [form]);

  const billingAddress = useMemo(() => {
    if (form.sameAsShipping) return { ...shippingAddress };
    return {
      fullName: `${billing.firstName} ${billing.lastName}`.trim(),
      line1: billing.address1, line2: billing.address2, city: billing.city,
      state: billing.state, postalCode: billing.zip, countryCode: billing.country,
      phone: billing.phone, email: billing.email
    };
  }, [form.sameAsShipping, billing, shippingAddress]);

  /* ---------------- PayPal ---------------- */
  const approvalLinkRef = useRef(null);

  const createPaypalOrder = useCallback(async () => {
    if (Object.keys(errors).length > 0 || Object.keys(errorsBilling).length > 0) return undefined;
    try {
      const { data } = await axios.post(api("/paypal/create-order"), {
        // The server re-prices every line from the catalogue and applies the
        // coupon itself, so only product ids, quantities and the code go up.
        items: itemsPayload.map(({ productId, qty }) => ({ productId, qty })),
        couponCode: coupon.code,
        customer: { firstName: form.firstName, lastName: form.lastName, email: form.email },
        shippingAddress, billingAddress,
        returnUrl: `${window.location.origin}/order/success`,
        cancelUrl: `${window.location.origin}/order/cancel`
      }, { headers: { "Content-Type": "application/json" } });
      approvalLinkRef.current = data?.approvalLink || null;
      return data?.id;
    } catch (err) {
      console.error('Create order failed:', err?.message || err);
      // The server rejects carts it cannot price (out of stock, bad coupon…) with a readable reason.
      const reason = err?.response?.data?.error;
      if (reason) toast.error(reason, { duration: 6000 });
      throw err;
    }
  }, [errors, errorsBilling, itemsPayload, coupon.code, form, shippingAddress, billingAddress]);

  const onApprovePaypal = useCallback(async (data) => {
    try {
      const captureRes = await axios.post(api('/paypal/capture-order'), { orderId: data.orderID }, {
        headers: { "Content-Type": "application/json" }
      });
      const referenceId = captureRes.data?.referenceId || "ODR-UNKNOWN";
      sessionStorage.setItem("lastOrderId", referenceId);
      clearCart();
      navigate(`/order/success?orderId=${encodeURIComponent(referenceId)}`, { replace: true });
    } catch (err) {
      console.error('Order capture failed:', err);
      toast.error(
        err?.response?.data?.error || 'We could not confirm your payment. If you were charged, please contact support with your PayPal receipt.',
        { duration: 10000 }
      );
    }
  }, [navigate, clearCart]);

  const onErrorPaypal = useCallback((err) => {
    console.error('PayPal error:', err);
    const msg = String(err?.message || err || '').toLowerCase();
    if (msg.includes('global_session_not_found') && approvalLinkRef.current) {
      window.location.href = approvalLinkRef.current;
      return;
    }
    toast.error('PayPal could not complete that request. Please try again.');
  }, []);

  const onCancelPaypal = useCallback(() => {
    toast('Payment cancelled your cart is still here.');
  }, []);

  const paypalKey = `pp-${total}-USD`;
  const formIsValid = Object.keys(errors).length === 0 && Object.keys(errorsBilling).length === 0;

  if (items.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center bg-paper px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="max-w-xl">
            <div className="section-index mb-8">Checkout</div>
            <h1 className="t-display mb-7">Your cart is empty.</h1>
            <p className="mb-10 text-graphite">Add something you love before checking out.</p>
            <Link to="/shop" className="btn-k">Browse artworks <ArrowUpRight size={13} /></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper min-h-screen">
      <StorePickupModal
        show={showPickup}
        onClose={() => setShowPickup(false)}
        onSubmit={handleStorePickup}
      />

      {/* Masthead */}
      <div className="border-b border-ink">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link to="/cart" className="group inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate hover:text-vermillion transition-colors mb-8">
            <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-1" />
            Back to cart
          </Link>
          <div className="section-index mb-7">Secure checkout</div>
          <RevealLines as="h1" className="t-display" lines={['Complete your order']} />
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 lg:gap-16">

          {/* Left column */}
          <div className="flex flex-col gap-14">

            {/* 01 Shipping */}
            <section>
              <div className="flex items-baseline gap-4 pb-4 border-b border-ink mb-8">
                <span className="font-mono text-[0.66rem] text-vermillion tabular-nums">01</span>
                <h2 className="t-section">Shipping address</h2>
              </div>

              <form noValidate className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
                <Field name="firstName" label="First name" required value={form.firstName} autoComplete="given-name"
                  onChange={e => setField('firstName', e.target.value)} onBlurFn={onBlur} errs={errors} touchedMap={touched} />
                <Field name="lastName" label="Last name" required value={form.lastName} autoComplete="family-name"
                  onChange={e => setField('lastName', e.target.value)} onBlurFn={onBlur} errs={errors} touchedMap={touched} />
                <Field name="email" label="Email" type="email" required span value={form.email} autoComplete="email"
                  onChange={e => setField('email', e.target.value)} onBlurFn={onBlur} errs={errors} touchedMap={touched} />
                <Field name="phone" label="Phone" type="tel" span value={form.phone} autoComplete="tel" placeholder="+1 555 555 5555"
                  onChange={e => setField('phone', e.target.value)} onBlurFn={onBlur} errs={errors} touchedMap={touched} />
                <Field name="address1" label="Address line 1" required span value={form.address1} autoComplete="address-line1"
                  onChange={e => setField('address1', e.target.value)} onBlurFn={onBlur} errs={errors} touchedMap={touched} />
                <Field name="address2" label="Address line 2" span value={form.address2} autoComplete="address-line2"
                  onChange={e => setField('address2', e.target.value)} onBlurFn={onBlur} errs={errors} touchedMap={touched} />

                <div>
                  <label htmlFor="co-country" className="label-k">Country <span className="text-vermillion">*</span></label>
                  <Select
                    id="co-country"
                    required
                    value={form.country}
                    onChange={(v) => setField('country', v)}
                    options={COUNTRIES.map(([v, l]) => ({ value: v, label: l }))}
                  />
                </div>
                <Field name="state" label="State / Region" required value={form.state} autoComplete="address-level1"
                  onChange={e => setField('state', e.target.value)} onBlurFn={onBlur} errs={errors} touchedMap={touched} />
                <Field name="city" label="City" required value={form.city} autoComplete="address-level2"
                  onChange={e => setField('city', e.target.value)} onBlurFn={onBlur} errs={errors} touchedMap={touched} />
                <Field name="zip" label="Postal code" required value={form.zip} autoComplete="postal-code"
                  onChange={e => setField('zip', e.target.value)} onBlurFn={onBlur} errs={errors} touchedMap={touched} />

                <div className="md:col-span-2 flex items-center gap-3 pt-2">
                  <input
                    id="sameAsShipping" name="sameAsShipping" type="checkbox"
                    className="h-4 w-4 accent-[var(--color-vermillion)] cursor-pointer"
                    checked={form.sameAsShipping}
                    onChange={e => setField('sameAsShipping', e.target.checked)}
                  />
                  <label htmlFor="sameAsShipping" className="font-mono text-[0.66rem] uppercase tracking-[0.1em] text-graphite cursor-pointer">
                    Billing address same as shipping
                  </label>
                </div>

                {!form.sameAsShipping && (
                  <div className="md:col-span-2 border-t border-rule pt-8 mt-3">
                    <div className="flex items-baseline gap-4 mb-7">
                      <span className="font-mono text-[0.66rem] text-vermillion tabular-nums">01b</span>
                      <h3 className="t-section !text-[1.35rem]">Billing address</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
                      {[
                        { name: 'firstName', label: 'First name', required: true, autoComplete: 'billing given-name' },
                        { name: 'lastName', label: 'Last name', required: true, autoComplete: 'billing family-name' },
                        { name: 'email', label: 'Email', type: 'email', required: true, span: true, autoComplete: 'billing email' },
                        { name: 'phone', label: 'Phone', type: 'tel', span: true, autoComplete: 'billing tel' },
                        { name: 'address1', label: 'Address line 1', required: true, span: true, autoComplete: 'billing address-line1' },
                        { name: 'address2', label: 'Address line 2', span: true, autoComplete: 'billing address-line2' },
                      ].map(f => (
                        <Field
                          key={f.name} {...f}
                          value={billing[f.name]}
                          onChange={e => setBillingField(f.name, e.target.value)}
                          onBlurFn={onBillingBlur}
                          errs={errorsBilling}
                          touchedMap={touchedBilling}
                        />
                      ))}
                      <div>
                        <label htmlFor="bill-country" className="label-k">Country <span className="text-vermillion">*</span></label>
                        <Select
                          id="bill-country"
                          value={billing.country}
                          onChange={(v) => setBillingField('country', v)}
                          options={COUNTRIES.map(([v, l]) => ({ value: v, label: l }))}
                        />
                      </div>
                      {[
                        { name: 'state', label: 'State / Region', required: true, autoComplete: 'billing address-level1' },
                        { name: 'city', label: 'City', required: true, autoComplete: 'billing address-level2' },
                        { name: 'zip', label: 'Postal code', required: true, autoComplete: 'billing postal-code' },
                      ].map(f => (
                        <Field
                          key={f.name} {...f}
                          value={billing[f.name]}
                          onChange={e => setBillingField(f.name, e.target.value)}
                          onBlurFn={onBillingBlur}
                          errs={errorsBilling}
                          touchedMap={touchedBilling}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </section>

            {/* 02 Payment */}
            <section>
              <div className="flex items-baseline gap-4 pb-4 border-b border-ink mb-8">
                <span className="font-mono text-[0.66rem] text-vermillion tabular-nums">02</span>
                <h2 className="t-section">Payment</h2>
              </div>

              {!formIsValid && (
                <p className="font-mono text-[0.66rem] uppercase tracking-[0.1em] text-graphite mb-7 border-l-2 border-vermillion pl-4 py-2 leading-relaxed">
                  Complete the required address fields above to enable payment.
                </p>
              )}

              {hasPayPalClient ? (
                <>
                  <div className={formIsValid ? '' : 'opacity-40 pointer-events-none'}>
                    <PayPalButtons
                      key={paypalKey}
                      style={{ layout: 'vertical' }}
                      createOrder={createPaypalOrder}
                      onApprove={onApprovePaypal}
                      onError={onErrorPaypal}
                      onCancel={onCancelPaypal}
                      disabled={items.length === 0 || !formIsValid}
                    />
                  </div>
                  <div className="flex items-start gap-3 mt-7 pt-6 border-t border-rule">
                    <Lock size={15} className="text-vermillion shrink-0 mt-0.5" strokeWidth={1.8} />
                    <p className="text-[0.85rem] text-graphite leading-relaxed">
                      Payment is handled entirely by PayPal we never see or store your card details.
                      Your order is captured immediately after approval.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-[0.9rem] text-graphite leading-relaxed">
                  Online payment is temporarily unavailable. Please use studio pickup, or{' '}
                  <Link to="/contact" className="link-k">contact us</Link> to arrange payment.
                </p>
              )}
            </section>
          </div>

          {/* Right column.
              Sticky belongs on the wrapper, not on the summary alone: a sticky
              first child stays put while its siblings keep scrolling up into
              the space it vacated, so the promo and pickup panels rendered
              straight over the totals. */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">

            {/* Summary */}
            <section className="border border-ink bg-paper">
              <div className="px-6 py-5 border-b border-ink bg-ink text-paper">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em]">Order summary</span>
              </div>

              <ul className="max-h-[280px] overflow-y-auto">
                {items.map(it => {
                  const qty = Number(it.qty ?? it.quantity ?? 1);
                  const onSale = typeof it.salePrice === "number" && it.salePrice !== null && it.salePrice < it.price;
                  return (
                    <li key={it.id} className="flex items-center gap-3.5 px-6 py-4 border-b border-rule">
                      <img
                        src={getCover(it) || FALLBACK_IMG}
                        alt=""
                        className="h-14 w-14 object-cover bg-paper-deep border border-rule shrink-0"
                        onError={handleImgError}
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.85rem] text-ink line-clamp-2 leading-snug">{it.name || it.title}</p>
                        <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-slate mt-1">Qty {qty}</p>
                      </div>
                      <span className={`font-mono text-[0.85rem] tabular-nums shrink-0 ${onSale ? 'text-vermillion' : 'text-ink'}`}>
                        {fmtUSD.format(getUnitPrice(it) * qty)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="px-6 py-5">
                <dl className="flex flex-col gap-3 font-mono text-[0.8rem]">
                  <div className="flex justify-between text-graphite">
                    <dt className="uppercase tracking-[0.08em] text-[0.66rem]">Subtotal</dt>
                    <dd className="text-ink tabular-nums">{fmtUSD.format(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-graphite">
                    <dt className="uppercase tracking-[0.08em] text-[0.66rem]">Shipping</dt>
                    <dd className={shipping > 0 ? "text-ink tabular-nums" : "text-vermillion tabular-nums"}>
                      {shipping > 0 ? fmtUSD.format(shipping) : 'Free'}
                    </dd>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-graphite">
                      <dt className="uppercase tracking-[0.08em] text-[0.66rem]">
                        Discount {coupon.code ? `(${coupon.code})` : ''}
                      </dt>
                      <dd className="text-vermillion tabular-nums">−{fmtUSD.format(discount)}</dd>
                    </div>
                  )}
                </dl>

                <div className="flex justify-between items-baseline mt-6 pt-5 border-t border-ink">
                  <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-graphite">Total</span>
                  <span className="font-mono text-[1.5rem] font-medium text-ink tabular-nums">{fmtUSD.format(total)}</span>
                </div>
              </div>
            </section>

            {/* Promo */}
            <section className="border border-rule bg-paper">
              <div className="px-5 py-3.5 border-b border-rule">
                <span className="label-mono">Promo code</span>
              </div>
              <div className="px-5 py-5">
                <form onSubmit={applyPromo} className="flex items-end gap-3">
                  <div className="flex-1">
                    <label htmlFor="promo" className="sr-only">Promo code</label>
                    <input
                      type="text" id="promo" name="promo" autoComplete="off"
                      className="field-k font-mono tracking-[0.16em] uppercase"
                      placeholder="CODE"
                      value={form.promo}
                      onChange={(e) => setField('promo', e.target.value.toUpperCase())}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={applyingPromo}
                    className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ink hover:text-vermillion transition-colors disabled:opacity-40 pb-3 border-b border-ink hover:border-vermillion"
                  >
                    {applyingPromo ? '…' : 'Apply'}
                  </button>
                </form>
                {promoMsg && (
                  <p role="status" className={`font-mono text-[0.6rem] uppercase tracking-[0.1em] mt-3 ${coupon.status === 'applied' ? 'text-vermillion' : 'text-graphite'}`}>
                    {promoMsg}
                  </p>
                )}
              </div>
            </section>

            {/* Pickup */}
            <section className="border border-rule bg-paper-dim">
              <div className="px-5 py-3.5 border-b border-rule">
                <span className="label-mono">Prefer to collect?</span>
              </div>
              <div className="px-5 py-5">
                <p className="text-[0.85rem] text-graphite mb-5 leading-relaxed">
                  Skip shipping and pick up from the studio in Ballwin, MO no minimum purchase.
                </p>
                <button
                  type="button"
                  className="btn-k btn-k-ghost btn-k-sm w-full"
                  onClick={() => setShowPickup(true)}
                  disabled={items.length === 0}
                >
                  Place pickup order
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
