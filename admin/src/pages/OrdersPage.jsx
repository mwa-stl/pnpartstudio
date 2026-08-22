import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Select from "../components/ui/Select.jsx";
import { Receipt, Eye, X, CheckCircle2, RefreshCw, Search, Package } from "lucide-react";
import { toast } from "react-toastify";
import SectionEyebrow from "../components/SectionEyebrow.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const ORDERS_URL = `${API_BASE}/api/orders`;
const PAGE_SIZE = 12;

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const STATUS_OPTIONS = [
  { value: "Placed", display: "Placed" },
  { value: "Confirmed", display: "Confirmed" },
  { value: "Shipped", display: "Shipped" },
  { value: "Out for delivery", display: "Out for delivery" },
  { value: "Delivered", display: "Delivered" },
  { value: "cancelled", display: "Cancelled" },
  { value: "refunded", display: "Refunded" },
  { value: "failed", display: "Failed" },
];

const STATUS_MAP = {
  Placed: "pending",
  Confirmed: "confirmed",
  Shipped: "shipped",
  "Out for delivery": "out_for_delivery",
  Delivered: "delivered",
  cancelled: "cancelled",
  refunded: "refunded",
  failed: "failed",
};

function displayStatusText(status) {
  if (!status || status === "pending" || status === "Placed") return "Placed";
  if (status === "confirmed") return "Confirmed";
  if (status === "shipped") return "Shipped";
  if (status === "out_for_delivery") return "Out for delivery";
  if (status === "delivered") return "Delivered";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const statusPill = (status) => {
  switch (displayStatusText(status)) {
    case "Delivered": return "tag tag-green";
    case "Cancelled":
    case "Failed": return "tag tag-red";
    case "Refunded": return "tag tag-neutral";
    default: return "tag tag-red";
  }
};

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}
function isThisWeek(date) {
  const now = new Date();
  const target = new Date(date);
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return target >= weekStart && target < weekEnd;
}
function inRange(date, from, to) {
  const d = new Date(date);
  return (!from || d >= from) && (!to || d <= to);
}

const DATE_FILTERS = [["today", "Today"], ["week", "This week"], ["all", "All"], ["custom", "Custom"]];

const OrdersPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const openOrder = useMemo(() => items.find(i => (i._id || "") === openId), [items, openId]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(ORDERS_URL, { withCredentials: true });
      const arr = Array.isArray(res.data?.items)
        ? [...res.data.items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [];
      setItems(arr);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [dateFilter, customFrom, customTo, query]);

  useEffect(() => {
    if (!openId) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpenId(""); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId]);

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (dateFilter === "today") {
      filtered = filtered.filter(o => o.createdAt && isSameDay(new Date(o.createdAt), new Date()));
    } else if (dateFilter === "week") {
      filtered = filtered.filter(o => o.createdAt && isThisWeek(new Date(o.createdAt)));
    } else if (dateFilter === "custom") {
      const from = customFrom ? new Date(customFrom) : null;
      const to = customTo ? new Date(customTo) : null;
      filtered = filtered.filter(o => o.createdAt && inRange(new Date(o.createdAt), from, to));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter(o =>
        [o.orderNo, o.referenceId, o._id, o.customer?.name, o.customerName, o.customer?.email]
          .some(v => v && String(v).toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [items, dateFilter, customFrom, customTo, query]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredItems, page]
  );

  const updateStatus = async (id, status) => {
    const backendStatus = STATUS_MAP[status] || status;
    try {
      const { data } = await axios.patch(
        `${ORDERS_URL}/${id}`,
        { status: backendStatus },
        { withCredentials: true }
      );
      setItems(prev =>
        prev.map(o => o._id === id
          ? { ...o, status: data?.status ? displayStatusText(data.status) : status }
          : o)
      );
      toast.success(`Status updated to ${status}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status");
    }
  };

  const markDelivered = id => updateStatus(id, "Delivered");

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Orders</h2>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="panel panel-pad mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1.5 flex-wrap">
          {DATE_FILTERS.map(([value, label]) => (
            <button
              key={value}
              className={`btn btn-sm ${dateFilter === value ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setDateFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {dateFilter === "custom" && (
          <div className="flex items-center gap-2">
            <label htmlFor="ord-from" className="sr-only">From date</label>
            <input id="ord-from" type="date" className="field !w-auto !py-1.5" value={customFrom}
              onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-slate text-sm">to</span>
            <label htmlFor="ord-to" className="sr-only">To date</label>
            <input id="ord-to" type="date" className="field !w-auto !py-1.5" value={customTo}
              onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}

        <div className="flex items-center flex-1 min-w-[200px] max-w-xs bg-surface border border-rule focus-within:border-vermillion transition-colors ml-auto">
          <Search size={15} className="text-slate ml-2.5 shrink-0" aria-hidden="true" />
          <label htmlFor="ord-search" className="sr-only">Search orders</label>
          <input
            id="ord-search"
            className="flex-1 py-2 px-2 bg-transparent outline-none text-[0.85rem] text-ink placeholder:text-slate min-w-0"
            placeholder="Order ref, name, email…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="mr-2 text-slate hover:text-vermillion">
              <X size={14} />
            </button>
          )}
        </div>

        <span className="text-[0.8rem] text-slate whitespace-nowrap" aria-live="polite">
          {loading ? "Loading…" : `${filteredItems.length} order${filteredItems.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Orders */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel h-44 animate-pulse bg-paper-dim" />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <div className="panel py-20 text-center">
          <Package size={26} className="mx-auto text-slate mb-4" />
          <p className="text-graphite">No orders found for this period.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {pageItems.map(o => {
            const id = o._id;
            const short = (o.referenceId || o.orderNo || id || "").toString().slice(-8);
            const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString() : "—";
            const displayStatus = displayStatusText(o.status);
            return (
              <article key={id} className="panel flex flex-col">
                <div className="flex items-start justify-between gap-2 px-5 py-3.5 border-b border-rule">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-mono text-[0.78rem] font-semibold text-ink">{short}</span>
                    <span className={statusPill(displayStatus)}>{displayStatus}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="btn btn-ghost btn-sm !px-2" title="View details"
                      aria-label={`View order ${short}`} onClick={() => setOpenId(id)}>
                      <Eye size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm !px-2" title="Mark delivered"
                      aria-label={`Mark order ${short} delivered`} onClick={() => markDelivered(id)}>
                      <CheckCircle2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="px-5 py-4 flex flex-col gap-2 flex-1">
                  <div>
                    <p className="text-[1rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                      {o.customer?.name || o.customerName || [o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(" ") || "—"}
                    </p>
                    <p className="text-[0.72rem] text-slate mt-0.5">{dateStr}</p>
                  </div>

                  {Array.isArray(o.items) && o.items.length > 0 && (
                    <p className="text-[0.78rem] text-graphite line-clamp-1">
                      {o.items.map(i => i.title || i.name).filter(Boolean).join(", ")}
                    </p>
                  )}

                  <div className="mt-auto pt-3.5 border-t border-rule flex items-center justify-between gap-2">
                    <label htmlFor={`ord-status-${id}`} className="sr-only">Order status</label>
                    <Select
                      id={`ord-status-${id}`}
                      size="sm"
                      className="w-[160px]"
                      value={displayStatus}
                      onChange={(v) => updateStatus(id, v)}
                      options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.display }))}
                    />
                    <span className="text-[1.15rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                      {fmtUSD.format(Number(o.total ?? o.totals?.grandTotal ?? 0))}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <nav className="flex gap-1.5 justify-center items-center mt-8" aria-label="Pagination">
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
          <span className="text-[0.8rem] text-graphite px-3">Page {page} of {pageCount}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Next</button>
        </nav>
      )}

      {/* Detail drawer */}
      {openOrder && (
        <>
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40" onClick={() => setOpenId("")} aria-hidden="true" />
          <div
            className="fixed top-0 right-0 bg-paper border-l border-rule shadow-2xl z-50 w-full max-w-[560px] h-full overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Order details"
          >
            <div className="flex items-center justify-between border-b border-rule px-6 py-4 sticky top-0 bg-paper">
              <div>
                <div className="label-mono mb-1">Order</div>
                <h2 className="page-title !text-[1.25rem] font-mono">
                  {openOrder.referenceId || openOrder.orderNo || (openOrder._id || "").toString().slice(-8)}
                </h2>
              </div>
              <button className="btn btn-ghost btn-sm !px-2" onClick={() => setOpenId("")} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-6">
              {/* Customer */}
              <section>
                <h3 className="label-mono mb-2.5">Customer</h3>
                <div className="panel panel-pad">
                  <p className="font-semibold text-ink">
                    {openOrder.customer?.name || openOrder.customerName || [openOrder.customer?.firstName, openOrder.customer?.lastName].filter(Boolean).join(" ") || "—"}
                  </p>
                  <p className="text-graphite text-[0.82rem] mt-1">{openOrder.customer?.email || "—"}</p>
                  <p className="text-graphite text-[0.82rem]">{openOrder.customer?.phone || openOrder.shippingAddress?.phone || "—"}</p>
                </div>
              </section>

              {/* Status */}
              <section>
                <h3 className="label-mono mb-2.5">Status</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <label htmlFor="drawer-status" className="sr-only">Order status</label>
                  <Select
                    id="drawer-status"
                    className="w-[180px]"
                    value={displayStatusText(openOrder.status)}
                    onChange={(v) => updateStatus(openOrder._id, v)}
                    options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.display }))}
                  />
                  <button className="btn btn-ghost btn-sm" onClick={() => markDelivered(openOrder._id)}>
                    <CheckCircle2 size={14} /> Delivered
                  </button>
                </div>
              </section>

              {/* Items */}
              <section>
                <h3 className="label-mono mb-2.5">Items</h3>
                <div className="panel overflow-x-auto">
                  <table className="table-k">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Price</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(openOrder.items || []).map((it, idx) => {
                        const qty = Number(it.qty ?? it.quantity ?? 0);
                        const price = Number(it.price ?? 0);
                        return (
                          <tr key={idx}>
                            <td>{it.title || it.name}</td>
                            <td className="text-right">{qty}</td>
                            <td className="text-right font-mono text-[0.8rem]">{fmtUSD.format(price)}</td>
                            <td className="text-right font-mono text-[0.8rem]">{fmtUSD.format(qty * price)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Totals */}
              <section>
                <h3 className="label-mono mb-2.5">Totals</h3>
                <dl className="panel panel-pad flex flex-col gap-2 text-[0.85rem]">
                  <div className="flex justify-between text-graphite">
                    <dt>Subtotal</dt>
                    <dd className="text-ink font-mono">{fmtUSD.format(Number(openOrder.subTotal ?? openOrder.totals?.subtotal ?? 0))}</dd>
                  </div>
                  <div className="flex justify-between text-graphite">
                    <dt>Discounts</dt>
                    <dd className="text-ink font-mono">
                      −{fmtUSD.format(
                        Array.isArray(openOrder.discounts)
                          ? openOrder.discounts.reduce((s, d) => s + Number(d?.amount || 0), 0)
                          : Number(openOrder.totals?.discount || 0)
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between text-graphite">
                    <dt>Shipping</dt>
                    <dd className="text-ink font-mono">{fmtUSD.format(Number(openOrder.shipping?.amount ?? openOrder.totals?.shipping ?? 0))}</dd>
                  </div>
                  <div className="flex justify-between text-graphite">
                    <dt>Tax</dt>
                    <dd className="text-ink font-mono">{fmtUSD.format(Number(openOrder.tax || 0))}</dd>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t border-rule text-ink">
                    <dt>Total</dt>
                    <dd className="font-mono">{fmtUSD.format(Number(openOrder.total ?? openOrder.totals?.grandTotal ?? 0))}</dd>
                  </div>
                </dl>
              </section>

              {/* Shipping address */}
              {openOrder.shippingAddress && (
                <section>
                  <h3 className="label-mono mb-2.5">Shipping address</h3>
                  <address className="panel panel-pad not-italic text-[0.85rem] text-graphite leading-relaxed">
                    {openOrder.shippingAddress.fullName
                      || [openOrder.shippingAddress.firstName, openOrder.shippingAddress.lastName].filter(Boolean).join(" ")}<br />
                    {openOrder.shippingAddress.line1 || openOrder.shippingAddress.address1}<br />
                    {openOrder.shippingAddress.line2 && <>{openOrder.shippingAddress.line2}<br /></>}
                    {[openOrder.shippingAddress.city, openOrder.shippingAddress.state, openOrder.shippingAddress.postalCode].filter(Boolean).join(", ")}<br />
                    {openOrder.shippingAddress.countryCode || openOrder.shippingAddress.country}
                  </address>
                </section>
              )}

              {openOrder.notes && (
                <section>
                  <h3 className="label-mono mb-2.5">Notes</h3>
                  <p className="panel panel-pad text-[0.85rem] text-graphite">{openOrder.notes}</p>
                </section>
              )}

              <button
                className="btn btn-ghost w-full"
                onClick={() => toast.info("Invoice export is not available yet.")}
              >
                <Receipt size={15} /> Export invoice
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OrdersPage;
