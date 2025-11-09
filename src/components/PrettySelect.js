import React, { useEffect, useRef, useState, useId } from "react";

/**
 * Accessible custom select with keyboard support.
 * - options can be ["Fantasy", "Romance", ...] OR [{value, label}]
 */
export default function PrettySelect({
  value = "",
  onChange,
  options = [],
  placeholder = "Select…",
  className = "",
  label = "Select",
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const wrapRef = useRef(null);
  const uid = useId();
  const listboxId = `ps-listbox-${uid}`;

  // normalize options so strings work
  const flat = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  const current = flat.find((o) => o.value === value) || null;

  // close on outside click / esc
  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const openList = () => {
    setOpen(true);
    const idx = flat.findIndex((o) => o.value === value);
    setActive(idx >= 0 ? idx : 0);
  };

  const choose = (opt) => {
    onChange?.(opt.value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i == null ? 0 : Math.min(flat.length - 1, i + 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i == null ? 0 : Math.max(0, i - 1)));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (active != null) choose(flat[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`pretty-select ${className}`}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open ? "true" : "false"}
      aria-controls={listboxId}
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className="ps-trigger"
        onClick={() => (open ? setOpen(false) : openList())}
        aria-controls={listboxId}
        aria-expanded={open ? "true" : "false"}
        aria-haspopup="listbox"
      >
        <span className={`ps-value ${current ? "" : "ps-placeholder"}`}>
          {current ? current.label : placeholder}
        </span>
        <span className="ps-chevron" aria-hidden>▾</span>
      </button>

      {open && (
        <ul className="ps-list" id={listboxId} role="listbox" tabIndex={-1}>
          {flat.map((opt, i) => {
            const selected = opt.value === value;
            const activeItem = i === active;
            return (
              <li
                key={opt.value ?? `opt-${i}`}
                role="option"
                aria-selected={selected}
                className={`ps-option ${selected ? "is-selected" : ""} ${
                  activeItem ? "is-active" : ""
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(opt)}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
