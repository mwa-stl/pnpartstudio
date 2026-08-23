import React, { useState } from "react";
import { UploadCloud, Loader2, X } from "lucide-react";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

/**
 * The console's upload control — every page that takes an image was using a
 * thin dashed-border strip that was easy to miss. This is deliberately much
 * larger and drag-and-drop capable, so it reads as a distinct, clickable
 * target rather than blending into the surrounding form fields.
 */
const ImageDropzone = ({
  id,
  label,
  hint,
  required = false,
  previewUrl,
  uploading = false,
  onChange,          // (file) => void — a single File
  onFiles,           // (FileList) => void — used instead of onChange when multiple
  onRemove,
  multiple = false,
  accept = "image/*",
  size = "md",        // "sm" (112px) | "md" (144px) | "wide" (full width, 176px tall)
}) => {
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    if (multiple && onFiles) onFiles(fileList);
    else onChange?.(fileList[0]);
  };

  const dims = size === "sm" ? "w-28 h-28" : size === "wide" ? "w-full h-44" : "w-36 h-36";

  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label} {required && <span className="text-vermillion">*</span>}
        </label>
      )}

      <label
        htmlFor={id}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`group relative flex flex-col items-center justify-center gap-2 border-2 border-dashed cursor-pointer transition-all duration-200 overflow-hidden ${dims} ${
          uploading ? "cursor-wait" : ""
        } ${
          dragOver
            ? "border-vermillion bg-vermillion-wash"
            : previewUrl
              ? "border-rule-strong hover:border-vermillion"
              : "border-rule-strong bg-paper-dim hover:border-vermillion hover:bg-vermillion-wash/40"
        }`}
      >
        <input
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          disabled={uploading}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />

        {previewUrl ? (
          <>
            {VIDEO_EXT.test(previewUrl) ? (
              <video
                src={previewUrl}
                autoPlay muted loop playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <img src={previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/55 transition-colors duration-200 flex items-center justify-center">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-paper opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {uploading ? "" : "Click or drop to replace"}
              </span>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
                <Loader2 size={22} className="animate-spin text-paper" />
              </div>
            )}
          </>
        ) : uploading ? (
          <>
            <Loader2 size={24} className="animate-spin text-vermillion" />
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-graphite">Uploading…</span>
          </>
        ) : (
          <>
            <UploadCloud size={26} strokeWidth={1.6} className="text-vermillion" />
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-graphite text-center px-3 leading-relaxed">
              Click or drop {multiple ? "images" : "an image"}
            </span>
          </>
        )}
      </label>

      {previewUrl && onRemove && (
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-2"
          onClick={onRemove}
          disabled={uploading}
        >
          <X size={13} /> Remove
        </button>
      )}

      {hint && <p className="text-[0.74rem] text-slate mt-1.5 max-w-xs">{hint}</p>}
    </div>
  );
};

export default ImageDropzone;
