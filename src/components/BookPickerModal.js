import React, { useMemo, useState } from "react";
import { useBooks } from "../context/BookContext";
import "../styles/BookPickerModal.css";

const normalize = (b = {}) => ({
  ...b,
  id: b.id || b.googleId || b.isbn || String(Math.random()),
  cover: b.cover || b.coverUrl || b.coverURL || "",
  title: b.title || "Untitled",
  author: b.author || b.authors?.[0] || "",
});

export default function BookPickerModal({ open, onClose, selectedIds = [], onSave }) {
  const { shelves } = useBooks();

  const allBooks = useMemo(() => {
    const map = {};
    ["currentlyReading", "tbr", "finished"].forEach((k) => {
      (shelves?.[k] || []).forEach((b) => {
        const nb = normalize(b);
        if (nb.id) map[nb.id] = nb;
      });
    });
    return map; // { id: book }
  }, [shelves]);

  const [picked, setPicked] = useState(() => new Set(selectedIds));

  // Keep internal state in sync when modal is reopened for a different day
  React.useEffect(() => {
    setPicked(new Set(selectedIds));
  }, [selectedIds, open]);

  if (!open) return null;

  const toggle = (id) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const list = Object.values(allBooks);

  return (
    <div className="bp-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bp-header">
          <h2>Select books for this day</h2>
          <button className="bp-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {list.length === 0 ? (
          <div className="bp-empty">
            No books in your shelves yet. Add some from <strong>My Library</strong>.
          </div>
        ) : (
          <div className="bp-grid">
            {list.map((b) => {
              const checked = picked.has(b.id);
              return (
                <label key={b.id} className={`bp-card ${checked ? "bp-card--checked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(b.id)}
                    aria-label={`Select ${b.title}`}
                  />
                  <div className="bp-cover-wrap">
                    {b.cover ? (
                      <img className="bp-cover" src={b.cover} alt={`${b.title} cover`} />
                    ) : (
                      <div className="bp-cover bp-cover--placeholder">No Cover</div>
                    )}
                  </div>
                  <div className="bp-meta">
                    <div className="bp-title" title={b.title}>{b.title}</div>
                    {b.author && <div className="bp-author">{b.author}</div>}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="bp-actions">
          <button className="bp-btn bp-btn--ghost" onClick={onClose}>Cancel</button>
          <button
            className="bp-btn"
            onClick={() => onSave(Array.from(picked))}
            disabled={list.length === 0}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
