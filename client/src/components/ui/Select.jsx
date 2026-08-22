import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * Select — the project's own dropdown, replacing every native <select>.
 *
 * A native select cannot be styled past its border: the option list is drawn
 * by the OS, so it arrives with rounded corners, system fonts and a blue
 * highlight that belong to no design system. This renders the list itself so
 * the whole control stays in the Kunsthalle language.
 *
 * It keeps the accessibility contract of the element it replaces:
 * role="combobox" + role="listbox", full keyboard support (arrows, Home/End,
 * Enter/Space, Escape, typeahead), and an optional hidden input so the value
 * still participates in normal form submission.
 *
 * Options accept either plain strings or `{ value, label, hint, group, disabled }`.
 */

const normalise = (options) =>
  (options || []).map((o) =>
    o !== null && typeof o === "object"
      ? {
          value: String(o.value ?? ""),
          label: o.label ?? String(o.value ?? ""),
          hint: o.hint || "",
          group: o.group || "",
          disabled: !!o.disabled,
        }
      : { value: String(o), label: String(o), hint: "", group: "", disabled: false }
  );

const Select = ({
  value,
  onChange,
  options,
  placeholder = "Select…",
  id,
  name,
  disabled = false,
  required = false,
  invalid = false,
  size = "md",              // "sm" | "md"
  variant = "line",         // "line" (underline, matches .field-k) | "box"
  className = "",
  buttonClassName = "",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}) => {
  const items = useMemo(() => normalise(options), [options]);
  const reactId = useId();
  const listId = `${id || reactId}-listbox`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropUp, setDropUp] = useState(false);

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const typeahead = useRef({ buffer: "", at: 0 });

  const selectedIndex = items.findIndex((o) => o.value === String(value ?? ""));
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setActiveIndex(-1);
    if (refocus) buttonRef.current?.focus();
  }, []);

  /* Decide which way the panel opens before it paints, so it never hangs off
     the bottom of a modal or a short viewport. */
  const openList = useCallback(() => {
    if (disabled) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setDropUp(below < 260 && rect.top > below);
    }
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : items.findIndex((o) => !o.disabled));
    setOpen(true);
  }, [disabled, items, selectedIndex]);

  // Click or focus outside closes the list.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) close(false);
    };
    const onWindowChange = () => close(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    window.addEventListener("resize", onWindowChange);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("resize", onWindowChange);
    };
  }, [open, close]);

  // Keep the active option in view while arrowing through a long list.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const commit = (index) => {
    const opt = items[index];
    if (!opt || opt.disabled) return;
    if (opt.value !== String(value ?? "")) onChange?.(opt.value, opt);
    close();
  };

  const step = (from, delta) => {
    if (!items.length) return -1;
    let i = from;
    for (let n = 0; n < items.length; n += 1) {
      i = (i + delta + items.length) % items.length;
      if (!items[i].disabled) return i;
    }
    return from;
  };

  const edge = (fromEnd) => {
    const order = fromEnd ? [...items.keys()].reverse() : [...items.keys()];
    return order.find((i) => !items[i].disabled) ?? -1;
  };

  const onKeyDown = (e) => {
    if (disabled) return;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " ", "Spacebar"].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => step(i < 0 ? -1 : i, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => step(i < 0 ? 0 : i, -1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(edge(false));
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(edge(true));
        break;
      case "Enter":
      case " ":
      case "Spacebar":
        e.preventDefault();
        commit(activeIndex);
        break;
      default:
        // Typeahead: letters jump to the next option starting with them.
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const now = Date.now();
          const t = typeahead.current;
          t.buffer = now - t.at > 600 ? e.key : t.buffer + e.key;
          t.at = now;
          const q = t.buffer.toLowerCase();
          const found = items.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(q));
          if (found >= 0) setActiveIndex(found);
        }
    }
  };

  const pad = size === "sm" ? "py-2 text-[0.82rem]" : "py-2.5 text-[0.9rem]";
  const shell =
    variant === "box"
      ? `bg-paper border border-rule-strong px-3 ${open ? "border-vermillion" : "hover:border-ink"}`
      : `bg-transparent border-0 border-b px-0 ${open ? "border-vermillion" : "border-rule-strong hover:border-ink"}`;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value ?? ""} />}

      <button
        ref={buttonRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={`w-full flex items-center justify-between gap-3 text-left transition-colors duration-200 font-[var(--font-body)] text-ink disabled:text-slate disabled:cursor-not-allowed ${pad} ${shell} ${
          invalid ? "!border-vermillion-dark" : ""
        } ${buttonClassName}`}
      >
        <span className={`truncate ${selected ? "text-ink" : "text-slate"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          strokeWidth={1.7}
          aria-hidden="true"
          className={`shrink-0 text-slate transition-transform duration-300 ${open ? "rotate-180 text-vermillion" : ""}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel || "Options"}
          tabIndex={-1}
          className={`absolute left-0 right-0 z-50 max-h-64 overflow-y-auto bg-paper border border-ink shadow-[0_16px_40px_-24px_rgba(11,11,11,0.55)] ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {items.length === 0 && (
            <li className="px-3 py-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-slate">
              No options
            </li>
          )}

          {items.map((opt, i) => {
            const isSelected = i === selectedIndex;
            const isActive = i === activeIndex;
            const newGroup = opt.group && opt.group !== items[i - 1]?.group;
            return (
              <React.Fragment key={`${opt.value}-${i}`}>
                {newGroup && (
                  <li
                    role="presentation"
                    className="px-3 pt-3 pb-1.5 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-vermillion border-t border-rule first:border-t-0"
                  >
                    {opt.group}
                  </li>
                )}
                <li
                  id={`${listId}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  onMouseEnter={() => !opt.disabled && setActiveIndex(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit(i)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors duration-150 ${
                    opt.disabled
                      ? "text-slate cursor-not-allowed"
                      : isActive
                        ? "bg-ink text-paper"
                        : "text-ink"
                  }`}
                >
                  <Check
                    size={13}
                    strokeWidth={2}
                    aria-hidden="true"
                    className={`mt-[3px] shrink-0 ${isSelected ? (isActive ? "text-paper" : "text-vermillion") : "opacity-0"}`}
                  />
                  <span className="min-w-0">
                    <span className="block text-[0.88rem] leading-snug truncate">{opt.label}</span>
                    {opt.hint && (
                      <span className={`block font-mono text-[0.58rem] uppercase tracking-[0.1em] mt-0.5 truncate ${isActive ? "text-paper/60" : "text-slate"}`}>
                        {opt.hint}
                      </span>
                    )}
                  </span>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Select;
