import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Search, X } from "lucide-react";
import Reveal, { RevealLines } from "../components/motion/Reveal";
import usePageHero from "../hooks/usePageHero";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const DEFAULT_STEPS = [
  { key: "pending", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" }
];

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const TrackOrderPage = () => {
  const hero = usePageHero("track-order");
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("orderId") || "");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const stepIndex = useMemo(() => {
    if (!order?.status) return -1;
    const normalizedStatus = (order.status || "").toLowerCase();
    const idx = DEFAULT_STEPS.findIndex(s => s.key === normalizedStatus);
    return idx >= 0 ? idx : 0;
  }, [order]);

  const progressPct = useMemo(() => {
    if (stepIndex < 0) return 0;
    return (stepIndex / (DEFAULT_STEPS.length - 1)) * 100;
  }, [stepIndex]);

  const lookup = React.useCallback(async (rawId) => {
    const cleanId = rawId.trim();
    if (!cleanId) {
      toast.error("Please enter an order ID");
      return;
    }
    setLoading(true);
    setOrder(null);
    setNotFound(false);
    try {
      const url = `${API_BASE}/api/orders/ref/${encodeURIComponent(cleanId)}`;
      const { data } = await axios.get(url, { withCredentials: true });
      if (!data?.order) {
        setNotFound(true);
        toast.error("We couldn’t find that order");
        return;
      }
      const found = data.order;
      setOrder({
        ...found,
        subtotal: found.totals?.subtotal ?? 0,
        shipping: found.totals?.shipping ?? 0,
        total: found.totals?.grandTotal ?? 0,
        status: (found.status || "pending").toLowerCase()
      });
      toast.success("Order found");
    } catch (err) {
      setNotFound(true);
      toast.error(err?.response?.data?.message || "Unable to fetch that order");
    } finally {
      setLoading(false);
    }
  }, []);

  // Deep link support: /track-order?orderId=ORD-123456 looks up straight away
  useEffect(() => {
    const preset = searchParams.get("orderId");
    if (preset) lookup(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    lookup(orderId);
  };

  const currentLabel = DEFAULT_STEPS.find(s => s.key === order?.status)?.label || "Processing";

  const detailCards = order ? [
    {
      n: "01",
      title: "Timeline",
      rows: [
        ["Placed", order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"],
        ["Status", currentLabel],
      ],
    },
    {
      n: "02",
      title: "Shipping",
      rows: [
        ["Recipient", [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") || "—"],
        ["Phone", order.shippingAddress?.phone || "—"],
        ["Address", [
          [order.shippingAddress?.line1, order.shippingAddress?.line2].filter(Boolean).join(" "),
          [order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.postalCode].filter(Boolean).join(" ")
        ].filter(Boolean).join(", ") || "—"],
      ],
    },
    {
      n: "03",
      title: "Payment",
      rows: [
        ["Items", String(Array.isArray(order.items) ? order.items.length : 0)],
        ["Subtotal", order.subtotal != null ? fmtUSD.format(Number(order.subtotal)) : "—"],
        ["Shipping", order.shipping != null ? fmtUSD.format(Number(order.shipping)) : "—"],
      ],
    },
  ] : [];

  return (
    <div className="bg-paper min-h-screen">
      {/* Masthead + lookup */}
      <div className="border-b border-ink">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-20 items-end">
            <div>
              <div className="section-index mb-8">{hero.sectionLabel}</div>
              <RevealLines as="h1" className="t-hero" lines={hero.headingLines} />
            </div>

            <div>
              <p className="text-graphite mb-7 leading-relaxed">
                Enter your order reference to see live status and details.
              </p>
              <form className="flex items-end gap-4" onSubmit={onSubmit} noValidate>
                <div className="flex-1">
                  <label htmlFor="orderIdInput" className="label-k">Order reference</label>
                  <input
                    type="text"
                    id="orderIdInput"
                    placeholder="ORD-123456"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="field-k font-mono tracking-[0.16em] uppercase"
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
                <button type="submit" className="btn-k shrink-0" disabled={loading}>
                  <Search size={13} />
                  {loading ? "Checking…" : "Track"}
                </button>
              </form>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-slate mt-4">
                Your order ID is in your confirmation email
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {!order && !loading && !notFound && (
          <p className="text-center text-slate py-20 font-mono text-[0.66rem] uppercase tracking-[0.14em]">
            Enter an order ID above to see its status
          </p>
        )}

        {notFound && !loading && (
          <div className="text-center py-20">
            <p className="t-section mb-4">No order found</p>
            <p className="text-graphite">
              Double-check the reference from your confirmation email, or{" "}
              <Link to="/contact" className="link-k">contact us</Link> and we&apos;ll look it up.
            </p>
          </div>
        )}

        {order && (
          <Reveal>
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-ink mb-12">
              <div>
                <div className="label-mono mb-2">Order reference</div>
                <span className="font-mono text-[1.4rem] text-ink tracking-[0.1em]">#{order.referenceId}</span>
              </div>
              <span className={order.status === "delivered" ? "tag-k tag-k-ink" : "tag-k tag-k-red"}>
                {currentLabel}
              </span>
            </div>

            {/* Progress */}
            <div className="mb-14">
              <div className="relative h-[2px] bg-rule w-full mb-5">
                <div className="h-[2px] bg-vermillion absolute left-0 top-0 transition-all duration-1000" style={{ width: `${progressPct}%` }} />
                <div className="absolute inset-x-0 -top-[4px] flex justify-between">
                  {DEFAULT_STEPS.map((s, i) => (
                    <span
                      key={s.key}
                      className={`w-2.5 h-2.5 transition-colors duration-500 ${
                        i <= stepIndex ? "bg-vermillion" : "bg-rule-strong"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between gap-1">
                {DEFAULT_STEPS.map((s, i) => (
                  <span
                    key={s.key}
                    className={`font-mono text-[0.54rem] uppercase tracking-[0.08em] text-center flex-1 first:text-left last:text-right transition-colors ${
                      i <= stepIndex ? "text-ink" : "text-slate"
                    }`}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-rule mb-12">
              {detailCards.map(({ n, title, rows }) => (
                <div key={title} className="border-r border-b border-rule p-6">
                  <div className="flex items-baseline gap-3 mb-5">
                    <span className="font-mono text-[0.6rem] text-vermillion tabular-nums">{n}</span>
                    <h2 className="label-mono">{title}</h2>
                  </div>
                  <dl className="space-y-3.5">
                    {rows.map(([label, value]) => (
                      <div key={label}>
                        <dt className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-slate mb-1">{label}</dt>
                        <dd className="text-[0.86rem] text-ink break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline pb-6 mb-10 border-b border-ink">
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-graphite">Order total</span>
              <span className="font-mono text-[1.6rem] font-medium text-ink tabular-nums">
                {order.total != null ? fmtUSD.format(Number(order.total)) : "—"}
              </span>
            </div>

            {/* Items */}
            <h2 className="label-mono mb-5">Items</h2>
            <ul className="border-t border-rule">
              {(order?.items || []).map((it, idx) => (
                <li key={idx} className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 py-4 border-b border-rule">
                  <span className="font-mono text-[0.6rem] text-slate tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  {it.image ? (
                    <img
                      src={it.image}
                      alt=""
                      className="w-14 h-14 object-cover border border-rule bg-paper-deep"
                      loading="lazy"
                      onError={e => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : <span className="w-14" />}
                  <div className="min-w-0">
                    <div className="t-title !text-[0.95rem] truncate" title={it.title}>{it.title}</div>
                    <div className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-slate mt-1">
                      Qty {it.qty || it.quantity || it.qtyOrdered || 1}
                    </div>
                  </div>
                  <div className="font-mono text-[0.9rem] text-ink tabular-nums text-right shrink-0">
                    {it.price != null ? fmtUSD.format(Number(it.price)) : ""}
                  </div>
                </li>
              ))}
              {(!order?.items || order.items.length === 0) && (
                <li className="text-slate text-center py-6 font-mono text-[0.62rem] uppercase tracking-[0.12em]">
                  No items recorded on this order
                </li>
              )}
            </ul>
          </Reveal>
        )}
      </div>
    </div>
  );
};

export default TrackOrderPage;
