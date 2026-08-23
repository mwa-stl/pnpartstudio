import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

/**
 * Select — the console's own dropdown, replacing every native <select>.
 *
 * A native select's option list is drawn by the OS, so it ignores the
 * console's type, colour and square-corner rules. This renders the list
 * itself while keeping the accessibility contract of the element it
 * replaces: role="combobox" + role="listbox", full keyboard support
 * (arrows, Home/End, Enter/Space, Escape, typeahead), and an optional
 * hidden input so the value still submits with a normal form.
 *
 * Options accept plain strings or `{ value, label, hint, group, disabled }`.
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
  size = "md",          // "sm" | "md"
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
  const [coords, setCoords] = useState(null); // { top, left, width, dropUp } — viewport-fixed, computed at open time

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

  /*
   * The option list renders through a portal to document.body (see the
   * return below), positioned with `position: fixed` from the trigger
   * button's own viewport rect rather than flowing in normal layout. A
   * plain `position: absolute` panel nested inside a table cell (or any
   * `overflow`/transformed ancestor) can get clipped or land in the wrong
   * place depending on the browser's table layout quirks — a portal
   * sidesteps that entire class of bug by never living inside that
   * ancestor's DOM subtree at all.
   */
  const openList = useCallback(() => {
    if (disabled) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      const dropUp = below < 260 && rect.top > below;
      setCoords({
        top: dropUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        dropUp,
      });
    }
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : items.findIndex((o) => !o.disabled));
    setOpen(true);
  }, [disabled, items, selectedIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) close(false);
    };
    const onWindowChange = () => close(false);
    // A scroll of the option list itself (its own `overflow-y-auto`, fired
    // e.g. by the scroll-active-option-into-view effect below the instant
    // the list opens) must not count as "the page scrolled out from under
    // the panel" — that would close the list the moment it opens, before a
    // click can ever land.
    const onWindowScroll = (e) => {
      if (listRef.current && (e.target === listRef.current || listRef.current.contains(e.target))) return;
      close(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    window.addEventListener("resize", onWindowChange);
    // Capture phase so a scroll on any nested scrollable ancestor (a table's
    // horizontal scroller, a modal body, etc.) is caught too — scroll events
    // don't bubble, but they do fire during capture.
    window.addEventListener("scroll", onWindowScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowScroll, true);
    };
  }, [open, close]);

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

  const pad = size === "sm" ? "py-1.5 px-2.5 text-[0.8rem]" : "py-2 px-3 text-[0.86rem]";

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
        className={`w-full flex items-center justify-between gap-3 text-left bg-surface border transition-colors duration-200 text-ink disabled:bg-paper-dim disabled:text-slate disabled:cursor-not-allowed ${pad} ${
          open ? "border-vermillion" : "border-rule-strong hover:border-ink"
        } ${invalid ? "!border-vermillion-dark" : ""} ${buttonClassName}`}
      >
        <span className={`truncate ${selected ? "text-ink" : "text-slate"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.7}
          aria-hidden="true"
          className={`shrink-0 text-slate transition-transform duration-300 ${open ? "rotate-180 text-vermillion" : ""}`}
        />
      </button>

      {open && coords && createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel || "Options"}
          tabIndex={-1}
          className="fixed z-[130] max-h-64 overflow-y-auto bg-surface border border-ink shadow-[0_16px_40px_-24px_rgba(11,11,11,0.55)]"
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
            transform: coords.dropUp ? "translateY(-100%)" : "none",
          }}
        >
          {items.length === 0 && (
            <li className="px-3 py-3 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-slate">
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
                    className="px-3 pt-2.5 pb-1 font-mono text-[0.54rem] uppercase tracking-[0.16em] text-vermillion border-t border-rule first:border-t-0"
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
                  className={`flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors duration-150 ${
                    opt.disabled
                      ? "text-slate cursor-not-allowed"
                      : isActive
                        ? "bg-ink text-paper"
                        : "text-ink"
                  }`}
                >
                  <Check
                    size={12}
                    strokeWidth={2}
                    aria-hidden="true"
                    className={`mt-[3px] shrink-0 ${isSelected ? (isActive ? "text-paper" : "text-vermillion") : "opacity-0"}`}
                  />
                  <span className="min-w-0">
                    <span className="block text-[0.84rem] leading-snug truncate">{opt.label}</span>
                    {opt.hint && (
                      <span className={`block font-mono text-[0.56rem] uppercase tracking-[0.1em] mt-0.5 truncate ${isActive ? "text-paper/60" : "text-slate"}`}>
                        {opt.hint}
                      </span>
                    )}
                  </span>
                </li>
              </React.Fragment>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  );
};

export default Select;
