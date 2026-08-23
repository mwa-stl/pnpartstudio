import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { RotateCcw } from "lucide-react";
import Select from "../components/ui/Select.jsx";
import { uploadImage } from "../api/media.js";
import SectionEyebrow from "../components/SectionEyebrow.jsx";
import FloatingSaveBar from "../components/FloatingSaveBar.jsx";
import ImageDropzone from "../components/ui/ImageDropzone.jsx";

const API = (import.meta.env.VITE_API_URL ?? "") + "/api/promo-popup";

const empty = {
  enabled: true, delaySeconds: 5,
  image: "", imageBadge: "",
  sectionLabel: "", heading: "", body: "",
  emailLabel: "", emailPlaceholder: "", submitLabel: "", dismissLabel: "", footnote: "",
  successBody: "", successButtonLabel: "", alreadyBody: "",
};

const fromApi = (d) => ({
  enabled: d?.enabled !== false,
  delaySeconds: typeof d?.delaySeconds === "number" ? d.delaySeconds : 5,
  image: d?.image ?? "",
  imageBadge: d?.imageBadge ?? "",
  sectionLabel: d?.sectionLabel ?? "",
  heading: d?.heading ?? "",
  body: d?.body ?? "",
  emailLabel: d?.emailLabel ?? "",
  emailPlaceholder: d?.emailPlaceholder ?? "",
  submitLabel: d?.submitLabel ?? "",
  dismissLabel: d?.dismissLabel ?? "",
  footnote: d?.footnote ?? "",
  successBody: d?.successBody ?? "",
  successButtonLabel: d?.successButtonLabel ?? "",
  alreadyBody: d?.alreadyBody ?? "",
});

const Section = ({ n, title, blurb, children }) => (
  <section className="panel panel-pad flex flex-col gap-4">
    <header>
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-[0.62rem] text-vermillion tabular-nums">{n}</span>
        <span className="h-px w-8 bg-rule" />
      </div>
      <h3 className="text-[1.05rem] text-ink" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{title}</h3>
      {blurb && <p className="text-[0.82rem] text-graphite mt-1">{blurb}</p>}
    </header>
    {children}
  </section>
);

const Field = ({ id, label, hint, ...rest }) => (
  <div>
    <label htmlFor={id} className="label">{label}</label>
    <input id={id} className="field" {...rest} />
    {hint && <p className="text-[0.76rem] text-slate mt-1.5">{hint}</p>}
  </div>
);

const WelcomePopupPage = () => {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(API);
      setForm(fromApi(data));
    } catch (err) {
      toast.error("Failed to load the popup: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, { folder: "popup" });
      set("image", url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.enabled && !form.heading.trim()) {
      setError("A heading is required while the popup is switched on.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.put(API, form);
      setForm(fromApi(data));
      toast.success("Popup saved — live on the site now");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="panel h-52 animate-pulse bg-paper-dim" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Welcome popup</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5 max-w-xl">
            The offer panel that appears a few seconds after someone lands on
            the site. Every word of it is set here. The coupon code itself still
            comes from the newsletter system — this only controls the wording.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={load} disabled={saving}>
          <RotateCcw size={14} /> Discard changes
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-24" noValidate>
        {error && (
          <div role="alert" className="border border-vermillion-dark/40 bg-vermillion-wash text-vermillion-dark px-4 py-2.5 text-[0.85rem]">
            {error}
          </div>
        )}

        <Section n="01" title="Behaviour">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pp-enabled" className="label">Show the popup</label>
              <Select
                id="pp-enabled"
                value={form.enabled ? "on" : "off"}
                onChange={(v) => set("enabled", v === "on")}
                options={[
                  { value: "on", label: "On", hint: "Visitors see it" },
                  { value: "off", label: "Off", hint: "Never shown" },
                ]}
              />
            </div>
            <Field
              id="pp-delay"
              type="number"
              min="0"
              max="120"
              label="Delay (seconds)"
              value={form.delaySeconds}
              onChange={(e) => set("delaySeconds", Number(e.target.value || 0))}
              hint="How long after arriving it appears. It shows once per browsing session."
            />
          </div>
        </Section>

        <Section n="02" title="Image" blurb="The panel on the left of the popup. Leave empty to use the bundled artwork.">
          <ImageDropzone
            id="pp-image"
            size="wide"
            previewUrl={form.image}
            uploading={uploading}
            onChange={handleImage}
            onRemove={() => set("image", "")}
          />
          <Field id="pp-badge" label="Image caption" value={form.imageBadge}
            onChange={(e) => set("imageBadge", e.target.value)} placeholder="PnP Artstudio"
            hint="The small black tag in the corner of the image." />
        </Section>

        <Section n="03" title="The offer">
          <Field id="pp-label" label="Small label" value={form.sectionLabel}
            onChange={(e) => set("sectionLabel", e.target.value)} placeholder="Welcome offer" />
          <div>
            <label htmlFor="pp-heading" className="label">Heading <span className="text-vermillion">*</span></label>
            <textarea id="pp-heading" rows={2} className="field resize-y" value={form.heading}
              onChange={(e) => set("heading", e.target.value)} placeholder="Take 10% off your first piece." />
          </div>
          <div>
            <label htmlFor="pp-body" className="label">Body</label>
            <textarea id="pp-body" rows={3} className="field resize-y" value={form.body}
              onChange={(e) => set("body", e.target.value)}
              placeholder="Join the studio letter for new work, class dates, and an instant discount." />
          </div>
        </Section>

        <Section n="04" title="Form labels">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="pp-emaillabel" label="Email field label" value={form.emailLabel}
              onChange={(e) => set("emailLabel", e.target.value)} placeholder="Email address" />
            <Field id="pp-emailph" label="Email placeholder" value={form.emailPlaceholder}
              onChange={(e) => set("emailPlaceholder", e.target.value)} placeholder="you@example.com" />
            <Field id="pp-submit" label="Submit button" value={form.submitLabel}
              onChange={(e) => set("submitLabel", e.target.value)} placeholder="Claim discount" />
            <Field id="pp-dismiss" label="Dismiss link" value={form.dismissLabel}
              onChange={(e) => set("dismissLabel", e.target.value)} placeholder="No thanks" />
          </div>
          <Field id="pp-footnote" label="Small print" value={form.footnote}
            onChange={(e) => set("footnote", e.target.value)} placeholder="You can unsubscribe at any time." />
        </Section>

        <Section n="05" title="After they sign up" blurb="What the popup says once the form has been sent.">
          <div>
            <label htmlFor="pp-success" className="label">Success message</label>
            <textarea id="pp-success" rows={2} className="field resize-y" value={form.successBody}
              onChange={(e) => set("successBody", e.target.value)} />
          </div>
          <Field id="pp-successbtn" label="Success button" value={form.successButtonLabel}
            onChange={(e) => set("successButtonLabel", e.target.value)} placeholder="Start shopping" />
          <div>
            <label htmlFor="pp-already" className="label">Already-claimed message</label>
            <textarea id="pp-already" rows={2} className="field resize-y" value={form.alreadyBody}
              onChange={(e) => set("alreadyBody", e.target.value)} />
          </div>
        </Section>

        <FloatingSaveBar
          saving={saving}
          disabled={saving || uploading}
          label="Save popup"
          helperText={form.enabled ? "The popup is switched on." : "The popup is switched off — visitors will not see it."}
        />
      </form>
    </div>
  );
};

export default WelcomePopupPage;
