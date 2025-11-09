import React, { useEffect, useMemo, useRef, useState, useId } from "react";

/**
 * PrettyMultiSelect (pills + searchable popover)
 * - options: string[] or {value,label}[]
 * - value: string[]  (selected values)
 * - onChange: (string[]) => void
 */
export default function PrettyMultiSelect({
  value = [],
  onChange,
  options = [],
  placeholder = "Select tropes…",
  className = "",
  label = "Tropes",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const uid = useId();
  const listboxId = `pms-listbox-${uid}`;

  const flat = useMemo(
    () =>
      options.map((o) => (typeof o === "string" ? { value: o, label: o } : o)),
    [options]
  );

  const selectedSet = useMemo(() => new Set(value), [value]);

  // search filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flat;
    return flat.filter((o) => o.label.toLowerCase().includes(q));
  }, [flat, query]);

  // close on outside click/esc
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

  const add = (val) => {
    if (!selectedSet.has(val)) onChange?.([...value, val]);
  };
  const remove = (val) => {
    onChange?.(value.filter((v) => v !== val));
  };

  return (
    <div ref={wrapRef} className={`pretty-multi ${className}`}>
      <div
        className="pm-trigger"
        role="combobox"
        aria-expanded={open ? "true" : "false"}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        aria-label={label}
      >
        <div className="pm-pills">
          {value.length === 0 ? (
            <span className="pm-placeholder">{placeholder}</span>
          ) : (
            value.map((v) => (
              <span key={v} className="pm-pill">
                {v}
                <button
                  type="button"
                  className="pm-x"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(v);
                  }}
                  aria-label={`Remove ${v}`}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        <span className="pm-chevron" aria-hidden>▾</span>
      </div>

      {open && (
        <div className="pm-pop">
          <input
            className="pm-input"
            placeholder="Search tropes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <ul className="pm-list" id={listboxId} role="listbox">
            {filtered.length === 0 && (
              <li className="pm-empty">No matches</li>
            )}
            {filtered.map((o) => {
              const selected = selectedSet.has(o.value);
              return (
                <li
                  key={o.value}
                  className={`pm-opt ${selected ? "is-selected" : ""}`}
                  role="option"
                  aria-selected={selected}
                  onClick={() => add(o.value)}
                >
                  {o.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
