import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import useConfirm from "../hooks/useConfirm.js";
import { TicketPercent, RefreshCw, Pencil, Trash2, Power, PowerOff, X, Plus } from "lucide-react";
import SectionEyebrow from "../components/SectionEyebrow.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const LIST_URL = `${API_BASE}/api/coupons`;

axios.defaults.withCredentials = true;

const emptyEdit = { code: "", percent: 10, maxUses: 0, expiresAt: "", active: true };

export default function CouponsPage() {
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(10);
  const [maxUses, setMaxUses] = useState(0);
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState([]);

  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState(emptyEdit);

  const disabled = !code.trim() || percent <= 0 || percent > 100;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(LIST_URL, { withCredentials: true });
      setList(Array.isArray(data?.items) ? data.items : []);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!editing) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setEditing(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (disabled) return;
    try {
      setSaving(true);
      const payload = {
        code: code.trim().toUpperCase(),
        percent,
        maxUses: Number(maxUses) || 0,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
      };
      const { data } = await axios.post(LIST_URL, payload, { withCredentials: true });
      toast.success(`Coupon ${data?.code} created`);
      setCode(""); setPercent(10); setMaxUses(0); setExpiresAt("");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create coupon");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id, next) => {
    try {
      await axios.patch(`${LIST_URL}/${id}/status`, { active: next }, { withCredentials: true });
      toast.success(`Coupon ${next ? "activated" : "deactivated"}`);
      load();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const del = (coupon) => confirm.ask({
    title: "Delete this coupon?",
    description: "Anyone already holding the code will no longer be able to redeem it at checkout. This cannot be undone.",
    item: {
      label: coupon.code,
      meta: [
        ["Discount", coupon.discountType === "percent" ? `${coupon.discountValue}%` : `$${coupon.discountValue}`],
        coupon.expiresAt && ["Expires", String(coupon.expiresAt).slice(0, 10)],
      ],
    },
    onConfirm: async () => {
      try {
        await axios.delete(`${LIST_URL}/${coupon._id}`, { withCredentials: true });
        toast.success("Coupon deleted");
        load();
      } catch {
        toast.error("Failed to delete");
      }
    },
  });

  const openEdit = (c) => {
    setEditing(c);
    setEditData({
      code: c.code || "",
      percent: c.percent || 10,
      maxUses: c.maxUses || 0,
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 16) : "",
      active: !!c.active
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${LIST_URL}/${editing._id}`, {
        code: editData.code.trim().toUpperCase(),
        percent: Number(editData.percent),
        maxUses: Number(editData.maxUses) || 0,
        expiresAt: editData.expiresAt ? new Date(editData.expiresAt).toISOString() : null,
        active: !!editData.active
      }, { withCredentials: true });
      toast.success("Coupon updated");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update");
    }
  };

  const rowActions = (c) => (
    <div className="flex gap-1.5 justify-end">
      <button className="btn btn-ghost btn-sm !px-2" title="Edit" aria-label={`Edit ${c.code}`} onClick={() => openEdit(c)}>
        <Pencil size={13} />
      </button>
      <button
        className="btn btn-ghost btn-sm !px-2"
        title={c.active ? "Deactivate" : "Activate"}
        aria-label={`${c.active ? "Deactivate" : "Activate"} ${c.code}`}
        onClick={() => toggleActive(c._id, !c.active)}
      >
        {c.active ? <PowerOff size={13} /> : <Power size={13} />}
      </button>
      <button className="btn btn-danger btn-sm !px-2" title="Delete" aria-label={`Delete ${c.code}`} onClick={() => del(c)}>
        <Trash2 size={13} />
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Coupons</h2>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading} type="button">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">
        {/* Create */}
        <section className="panel">
          <div className="px-5 py-4 border-b border-rule">
            <h3 className="text-[1.05rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
              Create coupon
            </h3>
          </div>
          <form onSubmit={onCreate} className="px-5 py-5 flex flex-col gap-4">
            <div>
              <label htmlFor="cp-code" className="label">Code</label>
              <input
                id="cp-code"
                className="field font-mono tracking-wider"
                placeholder="ART10"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cp-percent" className="label">Percent off</label>
                <input id="cp-percent" type="number" min={1} max={100} className="field"
                  value={percent} onChange={(e) => setPercent(Number(e.target.value))} required />
              </div>
              <div>
                <label htmlFor="cp-max" className="label">Max uses</label>
                <input id="cp-max" type="number" min={0} className="field"
                  value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
                <p className="text-[0.68rem] text-slate mt-1">0 = unlimited</p>
              </div>
            </div>
            <div>
              <label htmlFor="cp-expires" className="label">Expires at (optional)</label>
              <input id="cp-expires" type="datetime-local" className="field"
                value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <button className="btn btn-primary w-full" disabled={disabled || saving} type="submit">
              <Plus size={15} /> {saving ? "Saving…" : "Create coupon"}
            </button>
          </form>
        </section>

        {/* List */}
        <section className="panel min-w-0">
          <div className="px-5 py-4 border-b border-rule flex items-center justify-between gap-3">
            <h3 className="text-[1.05rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
              All coupons
            </h3>
            <span className="text-[0.78rem] text-slate" aria-live="polite">
              {loading ? "Loading…" : `${list.length} total`}
            </span>
          </div>

          {loading ? (
            <div className="p-5 flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 bg-paper-dim animate-pulse" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="py-16 text-center">
              <TicketPercent size={24} className="mx-auto text-slate mb-3" />
              <p className="text-graphite text-[0.9rem]">No coupons yet.</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="flex flex-col md:hidden divide-y divide-line">
                {list.map((c) => (
                  <div key={c._id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono font-bold text-ink uppercase break-all">{c.code}</span>
                          <span className={c.active ? "tag tag-green" : "tag tag-neutral"}>
                            {c.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-[0.8rem] text-graphite">
                          {c.percent}% off · {c.uses || 0}{c.maxUses === 0 ? " / ∞" : ` / ${c.maxUses}`} used
                        </p>
                        <p className="text-[0.72rem] text-slate mt-0.5">
                          {c.expiresAt ? `Expires ${new Date(c.expiresAt).toLocaleString()}` : "No expiry"}
                        </p>
                      </div>
                    </div>
                    {rowActions(c)}
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="table-k">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Percent</th>
                      <th>Uses</th>
                      <th>Status</th>
                      <th>Expires</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((c) => (
                      <tr key={c._id}>
                        <td className="font-mono font-semibold uppercase">{c.code}</td>
                        <td>{c.percent}%</td>
                        <td className="text-graphite">
                          {c.uses || 0}{c.maxUses === 0 ? " / ∞" : ` / ${c.maxUses}`}
                        </td>
                        <td>
                          <span className={c.active ? "tag tag-green" : "tag tag-neutral"}>
                            {c.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="text-graphite text-[0.8rem]">
                          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}
                        </td>
                        <td>{rowActions(c)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal-card max-w-md" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-coupon-title">
            <div className="modal-head flex items-center justify-between px-6 py-4">
              <h3 id="edit-coupon-title" className="page-title !text-[1.2rem]">Edit coupon</h3>
              <button className="btn btn-ghost btn-sm !px-2" onClick={() => setEditing(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={saveEdit} className="modal-form">
              <div className="modal-body px-6 py-5 flex flex-col gap-4">
              <div>
                <label htmlFor="ed-code" className="label">Code</label>
                <input id="ed-code" className="field font-mono tracking-wider"
                  value={editData.code}
                  onChange={(e) => setEditData({ ...editData, code: e.target.value.toUpperCase() })}
                  required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ed-percent" className="label">Percent</label>
                  <input id="ed-percent" type="number" min={1} max={100} className="field"
                    value={editData.percent}
                    onChange={(e) => setEditData({ ...editData, percent: Number(e.target.value) })}
                    required />
                </div>
                <div>
                  <label htmlFor="ed-max" className="label">Max uses</label>
                  <input id="ed-max" type="number" min={0} className="field"
                    value={editData.maxUses}
                    onChange={(e) => setEditData({ ...editData, maxUses: e.target.value })} />
                </div>
              </div>
              <div>
                <label htmlFor="ed-expires" className="label">Expires at</label>
                <input id="ed-expires" type="datetime-local" className="field"
                  value={editData.expiresAt}
                  onChange={(e) => setEditData({ ...editData, expiresAt: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="editActive" type="checkbox"
                  className="h-4 w-4 accent-[var(--color-vermillion)] cursor-pointer"
                  checked={editData.active}
                  onChange={(e) => setEditData({ ...editData, active: e.target.checked })}
                />
                <label htmlFor="editActive" className="text-[0.88rem] text-graphite cursor-pointer">Active</label>
              </div>
              </div>
              <div className="modal-foot px-6 py-4 flex gap-2">
                <button type="submit" className="btn btn-primary flex-1">Save changes</button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirm.props} />
    </div>
  );
}
