import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Select from "../components/ui/Select.jsx";
import { Receipt, FileText, Eye, X, CheckCircle2, RefreshCw, Search, Package, TrendingUp, Clock, Truck, User, MapPin, CreditCard, Ban } from "lucide-react";
import { toast } from "react-toastify";
import SectionEyebrow from "../components/SectionEyebrow.jsx";
import StatTile from "../components/StatTile.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const ORDERS_URL = `${API_BASE}/api/orders`;
const PAGE_SIZE = 15;

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/**
 * One canonical list of backend status codes, each with its display label.
 * Everything else (the filter dropdown, the per-row Select, the dot colour)
 * derives from this — previously the display label ("Cancelled") and the
 * Select's option value ("cancelled") disagreed in case for exactly these
 * three statuses, which made the Select's exact-match lookup fail and show
 * a blank "Select…" placeholder instead of the real status.
 */
const STATUS_DEFS = [
  { code: "pending", label: "Placed" },
  { code: "confirmed", label: "Confirmed" },
  { code: "shipped", label: "Shipped" },
  { code: "out_for_delivery", label: "Out for delivery" },
  { code: "delivered", label: "Delivered" },
  { code: "cancelled", label: "Cancelled" },
  { code: "refunded", label: "Refunded" },
  { code: "failed", label: "Failed" },
];
const STATUS_LABEL = Object.fromEntries(STATUS_DEFS.map((s) => [s.code, s.label]));
const STATUS_SELECT_OPTIONS = STATUS_DEFS.map((s) => ({ value: s.code, label: s.label }));

function normalizeStatusCode(raw) {
  if (!raw) return "pending";
  const byCode = STATUS_DEFS.find((s) => s.code === raw);
  if (byCode) return byCode.code;
  const byLabel = STATUS_DEFS.find((s) => s.label === raw);
  return byLabel ? byLabel.code : "pending";
}

/** A quick-scan colour dot beside the status Select. */
const statusDotColor = (code) => {
  if (code === "delivered") return "var(--color-forest)";
  if (code === "cancelled" || code === "failed") return "var(--color-vermillion)";
  return "var(--color-slate)";
};

/**
 * The happy path an order walks. cancelled/refunded/failed are deliberately
 * absent — they end the order rather than advance it, so the drawer shows a
 * halted state instead of a progress bar for those.
 */
const FULFILMENT_PATH = ["pending", "confirmed", "shipped", "out_for_delivery", "delivered"];
const HALTED = new Set(["cancelled", "refunded", "failed"]);

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
function orderTotal(o) {
  return Number(o.total ?? o.totals?.grandTotal ?? 0);
}

const DATE_FILTERS = [["today", "Today"], ["week", "This week"], ["all", "All"], ["custom", "Custom"]];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  ...STATUS_SELECT_OPTIONS,
];

const PAYMENT_FILTER_OPTIONS = [
  { value: "", label: "Any payment" },
  { value: "cod", label: "Cash on delivery" },
  { value: "paypal", label: "PayPal" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "total_desc", label: "Total: high to low" },
  { value: "total_asc", label: "Total: low to high" },
];

const OrdersPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
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
  useEffect(() => { setPage(1); }, [dateFilter, customFrom, customTo, statusFilter, paymentFilter, query]);

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
    if (statusFilter) {
      filtered = filtered.filter(o => normalizeStatusCode(o.status) === statusFilter);
    }
    if (paymentFilter) {
      filtered = filtered.filter(o => (o.paymentMethod || "").toLowerCase() === paymentFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter(o =>
        [o.orderNo, o.referenceId, o._id, o.customer?.name, o.customerName, o.customer?.email]
          .some(v => v && String(v).toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [items, dateFilter, customFrom, customTo, statusFilter, paymentFilter, query]);

  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];
    switch (sortBy) {
      case "oldest": return arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case "total_desc": return arr.sort((a, b) => orderTotal(b) - orderTotal(a));
      case "total_asc": return arr.sort((a, b) => orderTotal(a) - orderTotal(b));
      default: return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }, [filteredItems, sortBy]);

  const stats = useMemo(() => {
    const revenue = filteredItems.reduce((s, o) => s + orderTotal(o), 0);
    const pending = filteredItems.filter(o => normalizeStatusCode(o.status) === "pending").length;
    const inTransit = filteredItems.filter(o => ["confirmed", "shipped", "out_for_delivery"].includes(normalizeStatusCode(o.status))).length;
    return { count: filteredItems.length, revenue, pending, inTransit };
  }, [filteredItems]);

  const pageCount = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => sortedItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedItems, page]
  );

  const updateStatus = async (id, code) => {
    try {
      const { data } = await axios.patch(
        `${ORDERS_URL}/${id}`,
        { status: code },
        { withCredentials: true }
      );
      const finalCode = data?.status ? normalizeStatusCode(data.status) : code;
      setItems(prev => prev.map(o => (o._id === id ? { ...o, status: finalCode } : o)));
      toast.success(`Status updated to ${STATUS_LABEL[finalCode] || finalCode}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status");
    }
  };

  const markDelivered = id => updateStatus(id, "delivered");

  const downloadInvoice = async (order, format) => {
    try {
      const res = await axios.get(`${ORDERS_URL}/${order._id}/invoice.${format}`, {
        withCredentials: true,
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${order.referenceId || order.orderNo || order._id}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Could not download the invoice");
    }
  };

  const clearFilters = () => {
    setDateFilter("all"); setCustomFrom(""); setCustomTo("");
    setStatusFilter(""); setPaymentFilter(""); setQuery("");
  };
  const filtersActive = dateFilter !== "all" || statusFilter || paymentFilter || query.trim();

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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <StatTile icon={Package} label="Orders" value={stats.count} />
        <StatTile icon={TrendingUp} label="Revenue" value={fmtUSD.format(stats.revenue)} accent />
        <StatTile icon={Clock} label="Awaiting confirmation" value={stats.pending} />
        <StatTile icon={Truck} label="In transit" value={stats.inTransit} />
      </div>

      {/* Filters */}
      <div className="panel panel-pad mb-6 flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-3.5 items-center">
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

          <div className="flex items-center flex-1 min-w-[180px] max-w-xs bg-surface border border-rule focus-within:border-vermillion transition-colors ml-auto">
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
        </div>

        <div className="flex flex-wrap gap-3 items-center pt-3 border-t border-rule">
          <div className="w-[168px]">
            <label htmlFor="ord-status-filter" className="sr-only">Filter by status</label>
            <Select id="ord-status-filter" size="sm" value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} placeholder="All statuses" />
          </div>
          <div className="w-[168px]">
            <label htmlFor="ord-payment-filter" className="sr-only">Filter by payment method</label>
            <Select id="ord-payment-filter" size="sm" value={paymentFilter} onChange={setPaymentFilter} options={PAYMENT_FILTER_OPTIONS} placeholder="Any payment" />
          </div>
          <div className="w-[168px]">
            <label htmlFor="ord-sort" className="sr-only">Sort</label>
            <Select id="ord-sort" size="sm" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} placeholder="Sort" />
          </div>

          {filtersActive && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={13} /> Clear filters
            </button>
          )}

          <span className="text-[0.8rem] text-slate whitespace-nowrap ml-auto" aria-live="polite">
            {loading ? "Loading…" : `${filteredItems.length} order${filteredItems.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Orders table */}
      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-5 flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-paper-dim animate-pulse" />
            ))}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-20 text-center">
            <Package size={26} className="mx-auto text-slate mb-4" />
            <p className="text-graphite">No orders match these filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-k">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(o => {
                  const id = o._id;
                  const short = (o.referenceId || o.orderNo || id || "").toString().slice(-8);
                  const dateStr = o.createdAt
                    ? new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—";
                  const statusCode = normalizeStatusCode(o.status);
                  const customerName = o.customer?.name || o.customerName
                    || [o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(" ") || "—";
                  const itemCount = Array.isArray(o.items) ? o.items.length : 0;
                  const itemsLabel = Array.isArray(o.items) ? o.items.map(i => i.title || i.name).filter(Boolean).join(", ") : "";

                  return (
                    <tr key={id}>
                      <td className="whitespace-nowrap">
                        <div className="font-mono text-[0.78rem] font-semibold text-ink">{short}</div>
                        <div className="text-[0.72rem] text-slate">{dateStr}</div>
                      </td>
                      <td className="min-w-[160px]">
                        <div className="font-semibold text-ink leading-tight">{customerName}</div>
                        <div className="text-[0.72rem] text-slate mt-0.5">{o.customer?.email || "—"}</div>
                      </td>
                      <td className="max-w-[220px]">
                        <div className="text-[0.8rem] text-graphite line-clamp-1">{itemsLabel || "—"}</div>
                        <div className="text-[0.7rem] text-slate">{itemCount} item{itemCount !== 1 ? "s" : ""}</div>
                      </td>
                      <td>
                        <span className="tag tag-neutral whitespace-nowrap">
                          {(o.paymentMethod || "—").toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: statusDotColor(statusCode) }}
                            title={STATUS_LABEL[statusCode]}
                            aria-hidden="true"
                          />
                          <label htmlFor={`ord-status-${id}`} className="sr-only">Order status</label>
                          <Select
                            id={`ord-status-${id}`}
                            size="sm"
                            className="w-[140px]"
                            value={statusCode}
                            onChange={(v) => updateStatus(id, v)}
                            options={STATUS_SELECT_OPTIONS}
                          />
                        </div>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-[0.95rem]" style={{ color: "var(--color-vermillion)" }}>
                          {fmtUSD.format(orderTotal(o))}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1 justify-end">
                          <button className="btn btn-ghost btn-sm !px-2" title="View details"
                            aria-label={`View order ${short}`} onClick={() => setOpenId(id)}>
                            <Eye size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm !px-2" title="Mark delivered"
                            aria-label={`Mark order ${short} delivered`} onClick={() => markDelivered(id)}>
                            <CheckCircle2 size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm !px-2" title="Download invoice (PDF)"
                            aria-label={`Download PDF invoice for order ${short}`} onClick={() => downloadInvoice(o, "pdf")}>
                            <Receipt size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm !px-2" title="Download invoice (Word)"
                            aria-label={`Download Word invoice for order ${short}`} onClick={() => downloadInvoice(o, "docx")}>
                            <FileText size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
            className="fixed top-0 right-0 bg-paper border-l border-ink shadow-2xl z-50 w-full max-w-[620px] h-full flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Order details"
          >
            {(() => {
              const code = normalizeStatusCode(openOrder.status);
              const halted = HALTED.has(code);
              const stepIndex = FULFILMENT_PATH.indexOf(code);
              const addr = openOrder.shippingAddress || {};
              const customerName = openOrder.customer?.name || openOrder.customerName
                || [openOrder.customer?.firstName, openOrder.customer?.lastName].filter(Boolean).join(" ") || "—";
              const discount = Array.isArray(openOrder.discounts)
                ? openOrder.discounts.reduce((s, d) => s + Number(d?.amount || 0), 0)
                : Number(openOrder.totals?.discount || 0);
              const shipping = Number(openOrder.shipping?.amount ?? openOrder.totals?.shipping ?? 0);
              const tax = Number(openOrder.tax ?? openOrder.totals?.tax ?? 0);

              return (
                <>
                  {/* ── Masthead ─────────────────────────────────────────── */}
                  <div className="shrink-0 bg-ink text-paper px-6 pt-5 pb-6">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="min-w-0">
                        <div className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-paper/45 mb-1.5">
                          Order
                        </div>
                        <h2 className="font-mono text-[1.15rem] text-paper tracking-[0.04em] truncate">
                          {openOrder.referenceId || openOrder.orderNo || (openOrder._id || "").toString().slice(-8)}
                        </h2>
                        <div className="font-mono text-[0.62rem] text-paper/50 mt-1.5">
                          {openOrder.createdAt
                            ? new Date(openOrder.createdAt).toLocaleString("en-US", {
                                month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                              })
                            : "—"}
                        </div>
                      </div>

                      <div className="flex items-start gap-2 shrink-0">
                        <div className="text-right">
                          <div className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-paper/45 mb-1">
                            Total
                          </div>
                          <div
                            className="text-[1.55rem] leading-none text-paper"
                            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                          >
                            {fmtUSD.format(orderTotal(openOrder))}
                          </div>
                        </div>
                        <button
                          className="w-8 h-8 border border-paper/30 text-paper/70 hover:bg-paper hover:text-ink hover:border-paper flex items-center justify-center transition-colors shrink-0"
                          onClick={() => setOpenId("")}
                          aria-label="Close"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Fulfilment tracker — or a halted banner for a dead order. */}
                    {halted ? (
                      <div className="flex items-center gap-2.5 border border-vermillion/50 bg-vermillion/10 px-3.5 py-2.5">
                        <Ban size={15} className="text-vermillion shrink-0" />
                        <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-paper">
                          {STATUS_LABEL[code]} — this order is no longer in progress
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-1 mb-2.5">
                          {FULFILMENT_PATH.map((s, i) => (
                            <span
                              key={s}
                              className="h-[3px] flex-1 transition-colors duration-500"
                              style={{ backgroundColor: i <= stepIndex ? "var(--color-vermillion)" : "rgba(251,251,248,0.18)" }}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between gap-1">
                          {FULFILMENT_PATH.map((s, i) => (
                            <span
                              key={s}
                              className={`font-mono text-[0.5rem] uppercase tracking-[0.08em] flex-1 text-center first:text-left last:text-right ${
                                i <= stepIndex ? "text-paper" : "text-paper/35"
                              }`}
                            >
                              {STATUS_LABEL[s]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Scrolling body ───────────────────────────────────── */}
                  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 flex flex-col gap-7">
                    {/* Status control */}
                    <section>
                      <h3 className="label-mono mb-2.5">Update status</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <label htmlFor="drawer-status" className="sr-only">Order status</label>
                        <Select
                          id="drawer-status"
                          className="w-[190px]"
                          value={code}
                          onChange={(v) => updateStatus(openOrder._id, v)}
                          options={STATUS_SELECT_OPTIONS}
                        />
                        {code !== "delivered" && !halted && (
                          <button className="btn btn-ghost btn-sm" onClick={() => markDelivered(openOrder._id)}>
                            <CheckCircle2 size={14} /> Mark delivered
                          </button>
                        )}
                      </div>
                    </section>

                    {/* Customer / payment / address */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="panel panel-pad">
                        <div className="flex items-center gap-2 mb-2.5">
                          <User size={13} className="text-vermillion shrink-0" />
                          <h3 className="label-mono !mb-0">Customer</h3>
                        </div>
                        <p className="font-semibold text-ink text-[0.9rem] leading-snug">{customerName}</p>
                        <p className="text-graphite text-[0.78rem] mt-1.5 break-all">{openOrder.customer?.email || "—"}</p>
                        <p className="text-graphite text-[0.78rem]">{openOrder.customer?.phone || addr.phone || "—"}</p>
                      </div>

                      <div className="panel panel-pad">
                        <div className="flex items-center gap-2 mb-2.5">
                          <CreditCard size={13} className="text-vermillion shrink-0" />
                          <h3 className="label-mono !mb-0">Payment</h3>
                        </div>
                        <span className="tag tag-neutral">{(openOrder.paymentMethod || "—").toUpperCase()}</span>
                        <p className="text-graphite text-[0.78rem] mt-2.5">
                          {(openOrder.items || []).length} item{(openOrder.items || []).length !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {(addr.line1 || addr.city) && (
                        <div className="panel panel-pad sm:col-span-2">
                          <div className="flex items-center gap-2 mb-2.5">
                            <MapPin size={13} className="text-vermillion shrink-0" />
                            <h3 className="label-mono !mb-0">Ship to</h3>
                          </div>
                          <address className="not-italic text-[0.82rem] text-graphite leading-relaxed">
                            {addr.fullName || [addr.firstName, addr.lastName].filter(Boolean).join(" ")}<br />
                            {addr.line1 || addr.address1}<br />
                            {addr.line2 && <>{addr.line2}<br /></>}
                            {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")}<br />
                            {addr.countryCode || addr.country}
                          </address>
                        </div>
                      )}
                    </section>

                    {/* Items — cards with thumbnails, not a cramped table. */}
                    <section>
                      <h3 className="label-mono mb-2.5">Items</h3>
                      <ul className="border-t border-rule">
                        {(openOrder.items || []).map((it, idx) => {
                          const qty = Number(it.qty ?? it.quantity ?? 0);
                          const price = Number(it.price ?? 0);
                          return (
                            <li key={idx} className="flex items-center gap-3.5 py-3 border-b border-rule">
                              <span className="font-mono text-[0.58rem] text-slate tabular-nums shrink-0 w-4">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              {it.image ? (
                                <img
                                  src={it.image}
                                  alt=""
                                  className="w-12 h-12 object-cover border border-rule shrink-0 bg-paper-dim"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-12 h-12 border border-rule bg-paper-dim shrink-0 flex items-center justify-center">
                                  <Package size={14} className="text-slate" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-ink text-[0.88rem] leading-snug line-clamp-2">
                                  {it.title || it.name}
                                </div>
                                <div className="font-mono text-[0.62rem] text-slate mt-1">
                                  {fmtUSD.format(price)} &times; {qty}
                                </div>
                              </div>
                              <div className="font-mono text-[0.88rem] text-ink font-semibold tabular-nums shrink-0">
                                {fmtUSD.format(qty * price)}
                              </div>
                            </li>
                          );
                        })}
                        {(openOrder.items || []).length === 0 && (
                          <li className="py-6 text-center text-slate font-mono text-[0.62rem] uppercase tracking-[0.12em]">
                            No items recorded
                          </li>
                        )}
                      </ul>
                    </section>

                    {/* Totals */}
                    <section>
                      <dl className="flex flex-col gap-2 text-[0.85rem] max-w-xs ml-auto w-full">
                        <div className="flex justify-between text-graphite">
                          <dt>Subtotal</dt>
                          <dd className="text-ink font-mono tabular-nums">
                            {fmtUSD.format(Number(openOrder.subTotal ?? openOrder.totals?.subtotal ?? 0))}
                          </dd>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-graphite">
                            <dt>Discount</dt>
                            <dd className="font-mono tabular-nums" style={{ color: "var(--color-forest)" }}>
                              &minus;{fmtUSD.format(discount)}
                            </dd>
                          </div>
                        )}
                        <div className="flex justify-between text-graphite">
                          <dt>Shipping</dt>
                          <dd className="text-ink font-mono tabular-nums">
                            {shipping > 0 ? fmtUSD.format(shipping) : "Free"}
                          </dd>
                        </div>
                        {tax > 0 && (
                          <div className="flex justify-between text-graphite">
                            <dt>Tax</dt>
                            <dd className="text-ink font-mono tabular-nums">{fmtUSD.format(tax)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline font-bold pt-2.5 border-t border-ink">
                          <dt className="text-ink">Total</dt>
                          <dd
                            className="font-mono tabular-nums text-[1.1rem]"
                            style={{ color: "var(--color-vermillion)" }}
                          >
                            {fmtUSD.format(orderTotal(openOrder))}
                          </dd>
                        </div>
                      </dl>
                    </section>
                  </div>

                  {/* ── Sticky actions ───────────────────────────────────── */}
                  <div className="shrink-0 border-t border-ink bg-paper-dim px-6 py-4 flex gap-2">
                    <button className="btn btn-ghost flex-1" onClick={() => downloadInvoice(openOrder, "pdf")}>
                      <Receipt size={15} /> PDF invoice
                    </button>
                    <button className="btn btn-ghost flex-1" onClick={() => downloadInvoice(openOrder, "docx")}>
                      <FileText size={15} /> Word invoice
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
};

export default OrdersPage;
