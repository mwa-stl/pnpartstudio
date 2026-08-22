import React from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

/**
 * Add/remove/reorder row editors, shared by every content form in the console
 * (artist profile, class details, page mastheads, contact settings).
 *
 * The list always keeps one visible row — an empty list would leave nothing
 * to type into. Blank rows are dropped server-side, so a stray empty row is
 * harmless.
 */

const RowTools = ({ index, count, onRemove, onMove }) => (
  <div className="flex flex-col gap-1 shrink-0">
    <button
      type="button"
      onClick={onRemove}
      disabled={count === 1}
      className="btn btn-ghost btn-sm !px-2"
      aria-label={`Remove row ${index + 1}`}
      title="Remove"
    >
      <Trash2 size={13} />
    </button>
    {onMove && (
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="btn btn-ghost btn-sm !px-1.5"
          aria-label={`Move row ${index + 1} up`}
          title="Move up"
        >
          <ArrowUp size={12} />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          className="btn btn-ghost btn-sm !px-1.5"
          aria-label={`Move row ${index + 1} down`}
          title="Move down"
        >
          <ArrowDown size={12} />
        </button>
      </div>
    )}
  </div>
);

const AddButton = ({ onClick, label }) => (
  <button type="button" onClick={onClick} className="btn btn-ghost btn-sm self-start mt-1">
    <Plus size={13} /> {label}
  </button>
);

const move = (list, from, delta) => {
  const to = from + delta;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
};

/** A list of plain strings — heading lines, tags, bullet points, paragraphs. */
export const ListEditor = ({
  label,
  hint,
  values = [],
  onChange,
  addLabel = "Add row",
  placeholder,
  multiline = false,
  reorderable = true,
}) => (
  <div>
    {label && <span className="label">{label}</span>}
    {hint && <p className="text-[0.76rem] text-slate -mt-1 mb-2">{hint}</p>}
    <div className="flex flex-col gap-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          {multiline ? (
            <textarea
              className="field resize-y"
              rows={3}
              value={v}
              placeholder={placeholder}
              aria-label={`${label || "Item"} ${i + 1}`}
              onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ) : (
            <input
              className="field"
              value={v}
              placeholder={placeholder}
              aria-label={`${label || "Item"} ${i + 1}`}
              onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
            />
          )}
          <RowTools
            index={i}
            count={values.length}
            onRemove={() => onChange(values.filter((_, j) => j !== i))}
            onMove={reorderable ? (d) => onChange(move(values, i, d)) : undefined}
          />
        </div>
      ))}
      <AddButton onClick={() => onChange([...values, ""])} label={addLabel} />
    </div>
  </div>
);

const WIDTH = { sm: "sm:max-w-[150px]", md: "sm:max-w-[260px]", lg: "" };

/**
 * A list of objects, one input per named field.
 * `fields`: [{ key, placeholder, multiline, width: "sm" | "md" | "lg" }]
 */
export const RowEditor = ({
  label,
  hint,
  values = [],
  onChange,
  fields = [],
  addLabel = "Add row",
  reorderable = true,
}) => {
  const blank = Object.fromEntries(fields.map((f) => [f.key, ""]));
  const patch = (i, key, value) =>
    onChange(values.map((row, j) => (j === i ? { ...row, [key]: value } : row)));

  return (
    <div>
      {label && <span className="label">{label}</span>}
      {hint && <p className="text-[0.76rem] text-slate -mt-1 mb-2">{hint}</p>}
      <div className="flex flex-col gap-3">
        {values.map((row, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 flex flex-col sm:flex-row gap-2 min-w-0">
              {fields.map((f) =>
                f.multiline ? (
                  <textarea
                    key={f.key}
                    rows={2}
                    className={`field resize-y ${WIDTH[f.width] || ""}`}
                    value={row[f.key] ?? ""}
                    placeholder={f.placeholder}
                    aria-label={`${f.placeholder || f.key} ${i + 1}`}
                    onChange={(e) => patch(i, f.key, e.target.value)}
                  />
                ) : (
                  <input
                    key={f.key}
                    className={`field ${WIDTH[f.width] || ""}`}
                    value={row[f.key] ?? ""}
                    placeholder={f.placeholder}
                    aria-label={`${f.placeholder || f.key} ${i + 1}`}
                    onChange={(e) => patch(i, f.key, e.target.value)}
                  />
                )
              )}
            </div>
            <RowTools
              index={i}
              count={values.length}
              onRemove={() => onChange(values.filter((_, j) => j !== i))}
              onMove={reorderable ? (d) => onChange(move(values, i, d)) : undefined}
            />
          </div>
        ))}
        <AddButton onClick={() => onChange([...values, { ...blank }])} label={addLabel} />
      </div>
    </div>
  );
};

// Named aliases so call sites read as what they hold.
export const PairEditor = RowEditor;
export const TripleEditor = RowEditor;

export default ListEditor;
