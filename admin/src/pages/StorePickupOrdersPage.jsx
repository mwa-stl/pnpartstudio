import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import Select from "../components/ui/Select.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import useConfirm from "../hooks/useConfirm.js";
import { Trash2, RefreshCw, Store, Phone, Mail } from "lucide-react";
import { toast } from "react-toastify";
import SectionEyebrow from "../components/SectionEyebrow.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const PICKUP_URL = `${API_BASE}/api/store-pickup-orders`;

const STATUS_OPTIONS = ["Pending", "Fulfilled", "Cancelled"];
const PAGE_SIZE = 10;

const STATUS_PILL = {
  Fulfilled: "tag tag-green",
  Cancelled: "tag tag-neutral",
  Pending: "tag tag-red",
};

const fmtUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function isSameDay(a, b) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}
function isThisWeek(d) {
  const now = new Date();
  const dt = new Date(d);
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return dt >= weekStart && dt < weekEnd;
}
function inRange(d, from, to) {
  const x = new Date(d);
  return (!from || x >= from) && (!to || x <= to);
}

const FILTERS = [
  ["today", "Today"],
  ["week", "This week"],
  ["all", "All"],
  ["custom", "Custom range"],
];

const StorePickupOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await axios.get(PICKUP_URL);
      setOrders(
        Array.isArray(data?.items)
          ? [...data.items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          : []
      );
    } catch (err) {
      setLoadError(err?.response?.data?.message || "Could not load pickup orders.");
      toast.error("Could not load pickup orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (filter === "today") {
      filtered = filtered.filter(o => o.createdAt && isSameDay(new Date(o.createdAt), new Date()));
    } else if (filter === "week") {
      filtered = filtered.filter(o => o.createdAt && isThisWeek(new Date(o.createdAt)));
    } else if (filter === "custom") {
      const from = customFrom ? new Date(customFrom) : null;
      const to = customTo ? new Date(customTo) : null;
      filtered = filtered.filter(o => o.createdAt && inRange(new Date(o.createdAt), from, to));
    }
    return filtered;
  }, [orders, filter, customFrom, customTo]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  const pageCount = Math.ceil(filteredOrders.length / PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filter, customFrom, customTo, orders.length]);

  const updateStatus = async (orderId, newStatus) => {
    const prev = orders;
    setOrders(list => list.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
    try {
      await axios.patch(`${PICKUP_URL}/${orderId}`, { status: newStatus });
      toast.success("Status updated");
    } catch {
      setOrders(prev); // roll back the optimistic update
      toast.error("Failed to update status");
    }
  };

  const deleteOrder = (order) => confirm.ask({
    title: "Delete this pickup order?",
    description: "The order record is destroyed — you will lose the customer's details and the item list with it. This cannot be undone.",
    item: {
      label: order.fullName,
      meta: [
        order.email && ["Email", order.email],
        order.phone && ["Phone", order.phone],
        ["Status", order.status],
        ["Total", fmtUSD.format(Number(order.total) || 0)],
      ],
    },
    onConfirm: async () => {
      try {
        await axios.delete(`${PICKUP_URL}/${order._id}`);
        setOrders(list => list.filter(o => o._id !== order._id));
        toast.success("Order deleted");
      } catch {
        toast.error("Failed to delete order");
      }
    },
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Store pickup orders</h2>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="panel panel-pad mb-6 flex flex-wrap gap-2 items-center">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            className={`btn btn-sm ${filter === value ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
        {filter === "custom" && (
          <div className="flex items-center gap-2 ml-1">
            <label htmlFor="from" className="sr-only">From date</label>
            <input id="from" type="date" value={customFrom} className="field !w-auto !py-1.5"
              onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-slate text-sm">to</span>
            <label htmlFor="to" className="sr-only">To date</label>
            <input id="to" type="date" value={customTo} className="field !w-auto !py-1.5"
              onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
        <span className="ml-auto text-[0.8rem] text-slate" aria-live="polite">
          {loading ? "Loading…" : `${filteredOrders.length} order${filteredOrders.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {loadError && (
        <div role="alert" className="panel panel-pad mb-6 border-vermillion-dark/40 bg-vermillion-wash text-vermillion-dark text-[0.88rem]">
          {loadError}
        </div>
      )}

      {/* Orders */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel h-52 animate-pulse bg-paper-dim" />
          ))}
        </div>
      ) : paginatedOrders.length === 0 ? (
        <div className="panel py-20 text-center">
          <Store size={26} className="mx-auto text-slate mb-4" />
          <p className="text-graphite">No pickup orders in this period.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {paginatedOrders.map((o, idx) => (
            <article key={o._id} className="panel flex flex-col">
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-rule">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="font-mono text-[0.72rem] text-slate">
                      #{((page - 1) * PAGE_SIZE) + idx + 1}
                    </span>
                    <span className={STATUS_PILL[o.status] || "tag tag-neutral"}>{o.status}</span>
                  </div>
                  <h3 className="text-[1.05rem] text-ink truncate" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                    {o.fullName}
                  </h3>
                  {o.createdAt && (
                    <p className="text-[0.7rem] text-slate mt-0.5">
                      {new Date(o.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  className="btn btn-danger btn-sm shrink-0"
                  onClick={() => deleteOrder(o)}
                  aria-label={`Delete pickup order for ${o.fullName}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="px-5 py-4 flex flex-col gap-4 flex-1">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[0.82rem] text-graphite">
                  <a href={`tel:${o.phone}`} className="flex items-center gap-1.5 hover:text-vermillion transition-colors">
                    <Phone size={13} className="text-vermillion" /> {o.phone}
                  </a>
                  <a href={`mailto:${o.email}`} className="flex items-center gap-1.5 hover:text-vermillion transition-colors break-all">
                    <Mail size={13} className="text-vermillion" /> {o.email}
                  </a>
                </div>

                <div>
                  <div className="label-mono mb-2">Items</div>
                  <ul className="text-[0.82rem] text-graphite flex flex-col gap-1">
                    {(o.items || []).map((it, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="truncate">
                          {it.name}
                          {it.variant && <span className="text-slate"> · {it.variant}</span>}
                          <span className="text-slate"> × {it.qty}</span>
                        </span>
                        <span className="font-mono shrink-0">{fmtUSD.format(Number(it.price) || 0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-4 border-t border-rule flex items-center justify-between gap-3">
                  <div>
                    <label htmlFor={`status-${o._id}`} className="sr-only">Order status</label>
                    <Select
                      id={`status-${o._id}`}
                      size="sm"
                      className="w-[160px]"
                      value={o.status}
                      onChange={(v) => updateStatus(o._id, v)}
                      options={STATUS_OPTIONS}
                    />
                  </div>
                  <div className="text-[1.25rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                    {fmtUSD.format(Number(o.total) || 0)}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <nav className="flex gap-1.5 justify-center items-center mt-8" aria-label="Pagination">
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Prev
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              aria-current={page === n ? "page" : undefined}
              className={`btn btn-sm ${page === n ? "btn-primary" : "btn-ghost"}`}
              style={{ minWidth: 34 }}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}>
            Next
          </button>
        </nav>
      )}

      <ConfirmDialog {...confirm.props} />
    </div>
  );
};

export default StorePickupOrdersPage;
