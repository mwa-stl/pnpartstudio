import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { RefreshCw, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import SectionEyebrow from "../components/SectionEyebrow.jsx";
import useConfirm from "../hooks/useConfirm.js";
import { formatBytes } from "../api/media.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const USAGE_URL = `${API_BASE}/api/media/usage`;
const CLEANUP_URL = `${API_BASE}/api/media/cleanup`;

axios.defaults.withCredentials = true;

const Stat = ({ label, value, sub, warn }) => (
  <div className="panel p-5">
    <div className="label-mono mb-2">{label}</div>
    <div
      className={`text-[1.7rem] leading-none tabular-nums ${warn ? "text-vermillion" : "text-ink"}`}
      style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
    >
      {value}
    </div>
    {sub && <div className="text-[0.76rem] text-slate mt-2">{sub}</div>}
  </div>
);

export default function StoragePage() {
  const confirm = useConfirm();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const scan = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await axios.get(USAGE_URL);
      setUsage(data);
    } catch (err) {
      setUsage(null);
      setError(err?.response?.data?.message || "Could not read the storage bucket");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { scan(); }, [scan]);

  const clean = () => confirm.ask({
    title: "Delete unused files?",
    description: `${usage.orphanFiles} file${usage.orphanFiles === 1 ? "" : "s"} (${formatBytes(usage.orphanBytes)}) that no product, class, banner or other record uses will be permanently removed from the bucket. Files uploaded in the last 24 hours are never touched.`,
    onConfirm: async () => {
      try {
        const { data } = await axios.post(CLEANUP_URL);
        toast.success(`Removed ${data.removed} file${data.removed === 1 ? "" : "s"}, freed ${formatBytes(data.freedBytes)}`);
        scan();
      } catch (err) {
        toast.error(err?.response?.data?.message || "Cleanup failed");
        throw err;
      }
    },
  });

  return (
    <div className="mx-auto max-w-5xl w-full">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Media storage</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5 max-w-2xl">
            Images are converted to small WebP files on upload. Replacing or removing an image, or deleting a record,
            deletes the old file from the bucket automatically. This page finds anything left behind — for example a
            photo uploaded into a form that was never saved.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={scan} disabled={loading} type="button">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Scan again
        </button>
      </div>

      {error && <div className="panel p-5 text-[0.88rem] text-vermillion-dark" role="alert">{error}</div>}

      {loading && !usage ? (
        <div className="panel py-16 flex justify-center"><Loader2 className="animate-spin text-slate" /></div>
      ) : usage && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <Stat label="Files in bucket" value={usage.totalFiles.toLocaleString()} />
            <Stat label="Space used" value={formatBytes(usage.totalBytes)} />
            <Stat
              label="Unused files"
              value={usage.orphanFiles.toLocaleString()}
              sub={usage.orphanFiles ? `${formatBytes(usage.orphanBytes)} can be freed` : "Nothing to clean"}
              warn={usage.orphanFiles > 0}
            />
          </div>

          <section className="panel">
            <div className="px-5 py-4 border-b border-rule flex items-center justify-between gap-3">
              <h3 className="text-[1.05rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>Unused files</h3>
              <button className="btn btn-danger" disabled={!usage.orphanFiles || loading} onClick={clean} type="button">
                <Trash2 size={14} /> Delete all unused
              </button>
            </div>
            {usage.orphanFiles === 0 ? (
              <div className="py-14 text-center">
                <CheckCircle2 size={24} className="mx-auto text-forest mb-3" />
                <p className="text-graphite text-[0.9rem]">Every file in the bucket is in use.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-k">
                  <thead><tr><th>File</th><th className="text-right">Size</th><th>Uploaded</th></tr></thead>
                  <tbody>
                    {usage.orphans.map((o) => (
                      <tr key={o.path}>
                        <td className="font-mono text-[0.76rem] break-all">{o.path}</td>
                        <td className="text-right tabular-nums">{formatBytes(o.bytes)}</td>
                        <td className="text-graphite text-[0.8rem]">{o.created ? new Date(o.created).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {usage.orphanFiles > usage.orphans.length && (
                  <p className="px-5 py-3 text-[0.78rem] text-slate border-t border-rule">
                    Showing the {usage.orphans.length} largest of {usage.orphanFiles}.
                  </p>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <ConfirmDialog {...confirm.props} />
    </div>
  );
}
