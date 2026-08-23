import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Select from "../components/ui/Select.jsx";
import { toast } from "react-toastify";
import {
  Send, RefreshCw, Users, CalendarClock, Mail, Download, Edit2,
  ChevronLeft, ChevronRight, AlertTriangle, Loader2, X
} from "lucide-react";
import SectionEyebrow from "../components/SectionEyebrow.jsx";
import ImageDropzone from "../components/ui/ImageDropzone.jsx";
import { uploadImage } from "../api/media.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const SUBS_URL = `${API_BASE}/api/newsletters/subscribers`;
const CAMP_URL = `${API_BASE}/api/newsletters/campaigns`;

axios.defaults.withCredentials = true;

const PAGE_SIZE = 10;

const DOW = [
  ["0", "Sunday"], ["1", "Monday"], ["2", "Tuesday"], ["3", "Wednesday"],
  ["4", "Thursday"], ["5", "Friday"], ["6", "Saturday"],
];

const NewslettersPage = () => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [confirmSend, setConfirmSend] = useState(false);

  // Composer
  const [subject, setSubject] = useState("");
  const [headerHtml, setHeaderHtml] = useState("<h1>Our latest work</h1>");
  const [bodyHtml, setBodyHtml] = useState("<p>Hi there here's what's new in the studio.</p>");
  const [footerHtml, setFooterHtml] = useState("<p>Thanks for subscribing.</p>");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Schedule
  const [mode, setMode] = useState("now");
  const [onceAt, setOnceAt] = useState("");
  const [weeklyDow, setWeeklyDow] = useState("1");
  const [weeklyTime, setWeeklyTime] = useState("09:00");
  const [monthlyDom, setMonthlyDom] = useState("1");
  const [monthlyTime, setMonthlyTime] = useState("09:00");
  const [cronExpr, setCronExpr] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(SUBS_URL);
      setSubs(Array.isArray(data?.items) ? data.items : []);
      setPage(1);
    } catch {
      toast.error("Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const buildPayload = (overrideSchedule) => {
    const payload = {
      subject,
      headerHtml,
      bodyHtml,
      footerHtml,
      imageUrl: imageUrl?.trim() || null,
      schedule: { type: mode }
    };
    if (overrideSchedule) payload.schedule = overrideSchedule;
    if (mode === "once" && onceAt) payload.schedule.when = new Date(onceAt).toISOString();
    if (mode === "weekly") payload.schedule.weekly = { dow: Number(weeklyDow), time: weeklyTime };
    if (mode === "monthly") payload.schedule.monthly = { dom: Number(monthlyDom), time: monthlyTime };
    if (mode === "cron" && cronExpr) payload.schedule.cron = cronExpr;
    return payload;
  };

  const doSendNow = async () => {
    setConfirmSend(false);
    setSending(true);
    try {
      const { data } = await axios.post(CAMP_URL, buildPayload({ type: "now" }), { withCredentials: true });
      toast.success(`Newsletter sent to ${data?.sent || 0} subscriber${data?.sent === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to send newsletter");
    } finally {
      setSending(false);
    }
  };

  const scheduleCampaign = async () => {
    if (!subject.trim()) { toast.warning("Please enter a subject"); return; }
    try {
      const { data } = await axios.post(CAMP_URL, buildPayload(), { withCredentials: true });
      toast.success(`Campaign ${data?.status === "scheduled" ? "scheduled" : "saved"}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to schedule campaign");
    }
  };

  const activeCount = subs.filter(s => s.active !== false).length;
  const totalPages = Math.max(1, Math.ceil(subs.length / PAGE_SIZE));
  const pageSubs = subs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = [
    { icon: Mail, value: subs.length, label: "Total subscribers" },
    { icon: Users, value: activeCount, label: "Active" },
    { icon: Send, value: subject ? "1" : "0", label: "Ready to send" },
    { icon: CalendarClock, value: mode !== "now" ? "1" : "0", label: "Scheduled" },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Newsletters</h2>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="panel panel-pad flex flex-col items-start">
            <Icon size={17} className="text-vermillion mb-3" />
            <span className="text-[1.6rem] text-ink leading-none" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
              {value}
            </span>
            <span className="text-[0.68rem] text-slate uppercase tracking-[0.1em] mt-2">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Composer */}
        <section className="flex-1 min-w-0 panel">
          <div className="px-5 py-4 border-b border-rule flex items-center gap-2.5">
            <Edit2 size={16} className="text-vermillion" />
            <h3 className="text-[1.05rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
              Compose
            </h3>
          </div>

          <div className="px-5 py-5 flex flex-col gap-4">
            <div>
              <label htmlFor="nl-subject" className="label">Email subject</label>
              <input
                id="nl-subject" type="text" className="field"
                placeholder="New work in the studio…"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="nl-header" className="label">Header HTML</label>
              <textarea id="nl-header" className="field font-mono text-[0.8rem] resize-y" rows={2}
                value={headerHtml} onChange={(e) => setHeaderHtml(e.target.value)} />
            </div>
            <div>
              <label htmlFor="nl-body" className="label">Body HTML</label>
              <textarea id="nl-body" className="field font-mono text-[0.8rem] resize-y" rows={9}
                value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
            </div>
            <div>
              <label htmlFor="nl-footer" className="label">Footer HTML</label>
              <textarea id="nl-footer" className="field font-mono text-[0.8rem] resize-y" rows={2}
                value={footerHtml} onChange={(e) => setFooterHtml(e.target.value)} />
            </div>
            <div>
              <ImageDropzone
                id="nl-image"
                label="Hero image (optional)"
                size="wide"
                previewUrl={imageUrl}
                uploading={uploadingImage}
                onRemove={() => setImageUrl("")}
                onChange={async (file) => {
                  if (!file) return;
                  setUploadingImage(true);
                  try {
                    const { url } = await uploadImage(file, { folder: "newsletters" });
                    setImageUrl(url);
                    toast.success("Image uploaded");
                  } catch (err) {
                    toast.error(err.message || "Upload failed");
                  } finally {
                    setUploadingImage(false);
                  }
                }}
              />
              <input
                id="nl-image-url" type="url" className="field mt-2.5"
                placeholder="…or paste an image URL"
                value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-rule flex flex-col sm:flex-row gap-2">
            <button
              className="btn btn-primary flex-1"
              type="button"
              onClick={() => setConfirmSend(true)}
              disabled={!subject.trim() || sending || subs.length === 0}
            >
              {sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Send now to all</>}
            </button>
            <button className="btn btn-ghost flex-1" type="button" onClick={scheduleCampaign} disabled={!subject.trim() || sending}>
              <CalendarClock size={15} /> Save &amp; schedule
            </button>
          </div>
        </section>

        {/* Sidebar */}
        <div className="flex flex-col gap-5 w-full lg:w-[330px] shrink-0">
          {/* Schedule */}
          <section className="panel">
            <div className="px-5 py-4 border-b border-rule flex items-center gap-2.5">
              <CalendarClock size={16} className="text-vermillion" />
              <h3 className="text-[1.05rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                Schedule
              </h3>
            </div>
            <div className="px-5 py-5 flex flex-col gap-4">
              <div>
                <label htmlFor="nl-mode" className="label">Delivery mode</label>
                <Select
                  id="nl-mode"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "now", label: "Send immediately" },
                    { value: "once", label: "Schedule once" },
                    { value: "weekly", label: "Weekly recurring" },
                    { value: "monthly", label: "Monthly recurring" },
                    { value: "cron", label: "Advanced (cron)" },
                  ]}
                />
              </div>

              {mode === "once" && (
                <div>
                  <label htmlFor="nl-once" className="label">Send at</label>
                  <input id="nl-once" type="datetime-local" className="field"
                    value={onceAt} onChange={(e) => setOnceAt(e.target.value)} />
                </div>
              )}

              {mode === "weekly" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="nl-dow" className="label">Day</label>
                    <Select
                      id="nl-dow"
                      value={weeklyDow}
                      onChange={setWeeklyDow}
                      options={DOW.map(([v, l]) => ({ value: v, label: l }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="nl-wtime" className="label">Time</label>
                    <input id="nl-wtime" type="time" className="field" value={weeklyTime} onChange={(e) => setWeeklyTime(e.target.value)} />
                  </div>
                </div>
              )}

              {mode === "monthly" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="nl-dom" className="label">Day of month</label>
                    <input id="nl-dom" type="number" min={1} max={31} className="field"
                      value={monthlyDom} onChange={(e) => setMonthlyDom(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="nl-mtime" className="label">Time</label>
                    <input id="nl-mtime" type="time" className="field" value={monthlyTime} onChange={(e) => setMonthlyTime(e.target.value)} />
                  </div>
                </div>
              )}

              {mode === "cron" && (
                <div>
                  <label htmlFor="nl-cron" className="label">Cron expression</label>
                  <input id="nl-cron" type="text" className="field font-mono" placeholder="0 9 * * 1"
                    value={cronExpr} onChange={(e) => setCronExpr(e.target.value)} />
                  <p className="text-[0.68rem] text-slate mt-1.5">Format: min hour dom mon dow</p>
                </div>
              )}
            </div>
          </section>

          {/* Subscribers */}
          <section className="panel flex flex-col">
            <div className="px-5 py-4 border-b border-rule flex items-center gap-2.5">
              <Users size={16} className="text-vermillion" />
              <h3 className="text-[1.05rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                Subscribers
              </h3>
              <span className="ml-auto tag tag-neutral">{subs.length}</span>
            </div>

            <div className="flex flex-col max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-5 flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-6 bg-paper-dim animate-pulse" />
                  ))}
                </div>
              ) : subs.length === 0 ? (
                <div className="flex flex-col items-center text-slate py-10">
                  <Users size={24} className="mb-2" />
                  <span className="text-[0.85rem]">No subscribers yet</span>
                </div>
              ) : (
                pageSubs.map((s) => (
                  <div key={s._id} className="flex items-center gap-2 border-b border-rule last:border-0 px-5 py-2.5">
                    <Mail size={12} className="text-slate shrink-0" />
                    <span className="font-mono text-[0.75rem] break-all text-graphite">{s.email}</span>
                    <span className="ml-auto text-[0.68rem] text-slate shrink-0">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-rule text-[0.8rem]">
                <button className="btn btn-ghost btn-sm !px-2" onClick={() => setPage(p => p - 1)} disabled={page <= 1} aria-label="Previous page">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-graphite">Page {page} / {totalPages}</span>
                <button className="btn btn-ghost btn-sm !px-2" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} aria-label="Next page">
                  <ChevronRight size={15} />
                </button>
              </div>
            )}

            <div className="px-5 py-4 border-t border-rule">
              <a className="btn btn-ghost w-full" href={`${SUBS_URL}/export`} target="_blank" rel="noreferrer">
                <Download size={15} /> Export CSV
              </a>
            </div>
          </section>
        </div>
      </div>

      {/* Send confirmation this one is irreversible and goes to real inboxes */}
      {confirmSend && (
        <div className="modal-backdrop" onClick={() => setConfirmSend(false)}>
          <div className="modal-card max-w-md" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirm-send-title">
            <div className="modal-head flex items-center justify-between px-6 py-4">
              <h2 id="confirm-send-title" className="page-title !text-[1.15rem]">Confirm send</h2>
              <button className="btn btn-ghost btn-sm !px-2" onClick={() => setConfirmSend(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body px-6 py-5">
              <div className="flex items-start gap-2.5 bg-vermillion-wash border border-vermillion-dark/40 px-4 py-3.5 mb-5 text-[0.86rem] text-vermillion-dark">
                <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                <span>
                  This sends immediately to <strong>{activeCount} active subscriber{activeCount === 1 ? "" : "s"}</strong>.
                  Email cannot be recalled once sent.
                </span>
              </div>
              <dl className="text-[0.85rem] mb-6 flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <dt className="text-slate shrink-0">Subject:</dt>
                  <dd className="text-ink font-medium break-words">{subject}</dd>
                </div>
              </dl>
              <div className="flex gap-2">
                <button className="btn btn-primary flex-1" onClick={doSendNow} disabled={sending}>
                  <Send size={15} /> Yes, send now
                </button>
                <button className="btn btn-ghost" onClick={() => setConfirmSend(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewslettersPage;
