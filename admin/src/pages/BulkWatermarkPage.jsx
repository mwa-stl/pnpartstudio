import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Droplets, CheckSquare, Square, AlertTriangle, Check } from "lucide-react";
import { applyWatermark, uploadWatermarked, urlToFile } from "../utils/watermark.js";
import { WatermarkPositionModal } from "../components/WatermarkModal.jsx";
import SectionEyebrow from "../components/SectionEyebrow.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const PRODUCTS_URL = `${API_BASE}/api/products`;

axios.defaults.withCredentials = true;

export default function BulkWatermarkPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [showWmModal, setShowWmModal] = useState(false);
  const [previewFiles, setPreviewFiles] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get(PRODUCTS_URL, { params: { raw: 1 } });
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setProducts(items.filter(p => Array.isArray(p.images) && p.images.length > 0));
      } catch {
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === products.length) setSelected(new Set());
    else setSelected(new Set(products.map(p => p._id)));
  };

  const handleApplyClick = async () => {
    if (!selected.size) { toast.warn("Select at least one product"); return; }
    const firstProduct = products.find(p => selected.has(p._id));
    try {
      const f = await urlToFile(firstProduct.images[0], "preview.jpg");
      setPreviewFiles([f]);
      setShowWmModal(true);
    } catch {
      toast.error("Failed to load the preview image");
    }
  };

  const handleWmConfirm = async (opts) => {
    setShowWmModal(false);
    setPreviewFiles(null);
    const selectedProducts = products.filter(p => selected.has(p._id));
    const total = selectedProducts.reduce((sum, p) => sum + p.images.length, 0);
    setProgress({ done: 0, total, current: "" });
    setProcessing(true);

    let done = 0;
    const errors = [];

    for (const product of selectedProducts) {
      try {
        const newUrls = [];
        for (const imgUrl of product.images) {
          setProgress({ done, total, current: product.title || product._id });
          const file = await urlToFile(imgUrl, "img.jpg");
          const watermarked = await applyWatermark(file, opts);
          const { url } = await uploadWatermarked(watermarked);
          newUrls.push(url);
          done++;
          setProgress({ done, total, current: product.title || product._id });
        }
        await axios.put(
          `${PRODUCTS_URL}/${product._id}`,
          { images: newUrls },
          { withCredentials: true }
        );
      } catch (e) {
        errors.push(product.title || product._id);
        console.error(e);
      }
    }

    setProcessing(false);
    setSelected(new Set());
    if (errors.length) toast.error(`Failed for: ${errors.join(", ")}`);
    else toast.success(`Watermark applied to ${selectedProducts.length} product${selectedProducts.length !== 1 ? "s" : ""}`);
  };

  const handleWmCancel = () => {
    setShowWmModal(false);
    setPreviewFiles(null);
  };

  const allSelected = products.length > 0 && selected.size === products.length;
  const pct = progress.total ? (progress.done / progress.total) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <SectionEyebrow />
        <h2 className="page-title flex items-center gap-2.5">
          <Droplets size={22} className="text-vermillion" /> Bulk watermark
        </h2>
        <p className="text-[0.85rem] text-graphite mt-1.5">
          Re-watermark existing product images in one pass.
        </p>
      </div>

      {/* Destructive warning */}
      <div
        role="alert"
        className="flex items-start gap-2.5 bg-vermillion-wash border border-vermillion-dark/40 px-4 py-3.5 mb-5 text-[0.86rem] text-vermillion-dark"
      >
        <AlertTriangle size={17} className="mt-0.5 shrink-0" />
        <span>
          This <strong>permanently replaces</strong> each selected product&apos;s images with new
          watermarked versions. The originals are not kept and this cannot be undone.
        </span>
      </div>

      {/* Action bar */}
      <div className="panel panel-pad flex items-center gap-3 flex-wrap mb-5">
        <button type="button" className="btn btn-ghost btn-sm" onClick={toggleAll} disabled={processing || !products.length}>
          {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
          {allSelected ? "Deselect all" : "Select all"}
        </button>
        <span className="text-[0.82rem] text-slate">
          {selected.size} of {products.length} selected
        </span>
        <button
          type="button"
          className="btn btn-primary ml-auto"
          onClick={handleApplyClick}
          disabled={!selected.size || processing}
        >
          <Droplets size={15} />
          Apply watermark
        </button>
      </div>

      {/* Progress */}
      {processing && (
        <div className="panel panel-pad mb-5">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[0.85rem] font-semibold text-vermillion">Processing…</span>
            <span className="text-[0.78rem] text-slate tabular-nums">{progress.done} / {progress.total}</span>
          </div>
          <div className="w-full h-1.5 bg-paper-dim rounded-full overflow-hidden">
            <div className="h-full bg-vermillion rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          {progress.current && (
            <p className="text-[0.75rem] text-slate mt-2 truncate">Current: {progress.current}</p>
          )}
        </div>
      )}

      {/* Products */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel h-40 animate-pulse bg-paper-dim" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="panel py-20 text-center">
          <Droplets size={26} className="mx-auto text-slate mb-4" />
          <p className="text-graphite">No products with images found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => {
            const isSelected = selected.has(product._id);
            return (
              <button
                key={product._id}
                type="button"
                onClick={() => !processing && toggleSelect(product._id)}
                aria-pressed={isSelected}
                className={`relative text-left border transition-all overflow-hidden bg-surface ${
                  isSelected ? "border-vermillion ring-1 ring-vermillion" : "border-rule hover:border-rule-strong"
                } ${processing ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className={`absolute top-2.5 right-2.5 z-10 w-6 h-6 flex items-center justify-center transition-all ${
                  isSelected ? "bg-vermillion text-white" : "bg-surface/90 border border-rule text-transparent"
                }`}>
                  <Check size={13} />
                </span>

                <span className="flex gap-0.5 h-28 overflow-hidden bg-paper-dim">
                  {product.images.slice(0, 3).map((src, i) => (
                    <img key={i} src={src} alt="" className="flex-1 object-cover min-w-0" loading="lazy" />
                  ))}
                  {product.images.length > 3 && (
                    <span className="shrink-0 w-10 bg-paper-deep flex items-center justify-center text-[0.72rem] font-bold text-slate">
                      +{product.images.length - 3}
                    </span>
                  )}
                </span>

                <span className="block px-3.5 py-3">
                  <span className="block font-medium text-[0.88rem] text-ink truncate">{product.title}</span>
                  <span className="block text-[0.72rem] text-slate mt-0.5">
                    {product.images.length} image{product.images.length !== 1 ? "s" : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {showWmModal && previewFiles && (
        <WatermarkPositionModal
          files={previewFiles}
          onConfirm={handleWmConfirm}
          onCancel={handleWmCancel}
        />
      )}
    </div>
  );
}
