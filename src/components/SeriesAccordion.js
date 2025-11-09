// src/components/SeriesAccordion.js
import React, { useState } from "react";
import "../styles/SeriesAccordion.css";

const PLACEHOLDER = "https://via.placeholder.com/200x300?text=No+Cover";

function StatusPills({ seriesName, idx, value, onChange }) {
  const options = [
    { key: "todo", label: "Not started" },
    { key: "inprogress", label: "In progress" },
    { key: "done", label: "Finished" },
  ];

  return (
    <div className="sa-pill-row" role="tablist" aria-label="Reading status">
      {options.map((opt) => {
        const active = (value || "todo").toLowerCase() === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            className={`sa-pill ${active ? "active" : ""}`}
            aria-pressed={active}
            onClick={() => onChange(seriesName, idx, opt.key)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function PagesControl({ seriesName, idx, b, onPageChange }) {
  const total = Number(b.totalPages) || 0;
  const current = Number(b.currentPage) || 0;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  const setCurrent = (val) =>
    onPageChange(seriesName, idx, "currentPage", String(val));

  if (total > 0) {
    return (
      <div className="sa-pages-block">
        <div className="sa-pages-label">Pages</div>

        <div className="sa-range-row">
          <input
            type="range"
            min="0"
            max={total}
            value={Math.min(current, total)}
            onChange={(e) => setCurrent(e.target.value)}
            className="sa-range"
            aria-label="Current page"
          />
          <div className="sa-page-chip">{pct}%</div>
        </div>

        <div className="sa-readout-row">
          <input
            type="number"
            min="0"
            max={total}
            value={Math.min(current, total)}
            onChange={(e) => setCurrent(e.target.value)}
            className="sa-input"
            aria-label="Current page (number)"
          />
          <span className="sa-slash">/</span>
          <span className="sa-total">{total}</span>
        </div>
      </div>
    );
  }

  // Fallback when we don't know total pages
  return (
    <div className="sa-pages-block">
      <div className="sa-pages-label">Current page</div>
      <input
        type="number"
        min="0"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        className="sa-input"
      />
    </div>
  );
}

function BookRow({ seriesName, b, idx, onStatusChange, onPageChange }) {
  const coverSrc = b.cover || b.coverUrl || b.coverURL || PLACEHOLDER;

  return (
    <div className="sa-row">
      <img className="sa-cover" src={coverSrc} alt={`${b.title} cover`} />

      <div className="sa-main">
        <div className="sa-title">{b.title || "Untitled"}</div>
        {b.author ? <div className="sa-author">{b.author}</div> : null}

        <div className="sa-controls">
          <div className="sa-field">
            <div className="sa-small-label">Status</div>
            <StatusPills
              seriesName={seriesName}
              idx={idx}
              value={(b.status || "todo").toLowerCase()}
              onChange={onStatusChange}
            />
          </div>

          <div className="sa-field sa-pages">
            <PagesControl
              seriesName={seriesName}
              idx={idx}
              b={b}
              onPageChange={onPageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SeriesAccordion({
  series,
  onStatusChange,
  onPageChange,
  onRemoveSeries,
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="sa-wrap">
      <button className="sa-header" onClick={() => setOpen((v) => !v)}>
        <div className="sa-name">{series?.name || "Untitled series"}</div>
        <div className={`sa-chevron ${open ? "open" : ""}`} aria-hidden>
          ▾
        </div>
      </button>

      {open && (
        <div className="sa-body">
          {(series?.books || []).map((b, i) => (
            <BookRow
              key={b.id || `${b.title}-${i}`}
              seriesName={series.name}
              b={b}
              idx={i}
              onStatusChange={onStatusChange}
              onPageChange={onPageChange}
            />
          ))}
        </div>
      )}

      <div className="sa-footer">
        <button className="sa-remove" onClick={() => onRemoveSeries(series.name)}>
          Remove series
        </button>
      </div>
    </div>
  );
}
