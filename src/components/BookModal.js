import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/BookModal.css";
import { logReadActivity } from "../utils/history";
import PrettySelect from "../components/PrettySelect";
import PrettyMultiSelect from "../components/PrettyMultiSelect";

const getCover = (b) =>
  (b?.cover && String(b.cover)) ||
  (b?.coverUrl && String(b.coverUrl)) ||
  (b?.coverURL && String(b.coverURL)) ||
  "https://via.placeholder.com/200x300?text=No+Cover";

const PRESET_GENRES = [
  "Fantasy",
  "Romance",
  "Romantacy",
  "Mystery/Thriller",
  "Science Fiction",
  "Historical",
  "Nonfiction",
  "Young Adult",
  "Contemporary",
  "Horror",
  "Dystopian",
  "Graphic Novel",
  "Classics",
  "Other",
];

const PRESET_TROPES = [
  "Enemies to Lovers",
  "Friends to Lovers",
  "Grumpy x Sunshine",
  "Slow Burn",
  "Found Family",
  "Fake Dating",
  "Second Chance",
  "Forced Proximity",
  "Love Triangle",
  "Secret Identity",
  "Heist/Caper",
  "Quest",
  "Mentor/Protégé",
  "Training Montage",
  "Chosen One",
];

export default function BookModal({
  open,
  onClose,
  book,
  seriesName,
  onMoveToShelf,   // 'tbr' | 'currentlyReading' | 'finished' | 'dnf'
  onRemove,        // () => void
  onUpdateBook,    // (partial) => void
}) {
  const shouldRender = !!(open && book);
  const isReadOnly = !onMoveToShelf && !onRemove && !onUpdateBook;

  // Local form state
  const [currentPage, setCurrentPage] = useState(Number(book?.currentPage) || 0);
  const [totalPages, setTotalPages]   = useState(Number(book?.totalPages) || 0);
  const [startDate, setStartDate]     = useState(book?.startDate || "");
  const [endDate, setEndDate]         = useState(book?.endDate || "");
  const [review, setReview]           = useState(book?.review || "");
  const [editingReview, setEditingReview] = useState(false);

  // Sync on open/book change
  useEffect(() => {
    if (!shouldRender) return;
    setCurrentPage(Number(book?.currentPage) || 0);
    setTotalPages(Number(book?.totalPages) || 0);
    setStartDate(book?.startDate || "");
    setEndDate(book?.endDate || "");
    setReview(book?.review || "");
    setEditingReview(false);
  }, [shouldRender, book]);

  // Close on Escape
  useEffect(() => {
    if (!shouldRender) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shouldRender, onClose]);

  const coverSrc = getCover(book || {});
  const pct = useMemo(() => {
    if (!totalPages || totalPages <= 0) return 0;
    return Math.min(100, Math.round((Number(currentPage) / Number(totalPages)) * 100));
  }, [currentPage, totalPages]);

  if (!shouldRender) return null;

  // Handlers
  const handleFavorite = () => onUpdateBook?.({ favorite: !book?.favorite });
  const handleRating = (n) => onUpdateBook?.({ rating: n });

  const saveProgress = () => {
    const prevPage = Number(book?.currentPage || 0);
    const nextPage = Number(currentPage) || 0;
    const delta = Math.max(0, nextPage - prevPage);
    if (delta > 0) logReadActivity({ pagesDelta: delta });

    onUpdateBook?.({
      currentPage: nextPage,
      totalPages: Number(totalPages) || 0,
      startDate,
      endDate,
    });
  };

  const saveReview = () => {
    onUpdateBook?.({ review: review || "" });
    setEditingReview(false);
  };

  return createPortal(
    <>
      <div className="book-modal-backdrop" onClick={onClose} />

      <div
        className="book-modal"
        role="dialog"
        aria-modal="true"
        aria-label={book?.title || "Book"}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="book-modal-header">
          {/* LEFT: cover + fav + remove */}
          <div className="cover-col">
            <img className="book-modal-cover" src={coverSrc} alt={book?.title || "Book cover"} />

            {!isReadOnly && (
              <>
                <button
                  className={`fav-toggle ${book?.favorite ? "is-fav" : ""}`}
                  onClick={handleFavorite}
                  aria-pressed={!!book?.favorite}
                  title={book?.favorite ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <span className="heart">♥</span>
                  <span className="fav-label">{book?.favorite ? "Favorited" : "Add to Favorites"}</span>
                </button>

                <button className="remove-inline-button" onClick={onRemove}>Remove</button>
              </>
            )}
          </div>

          {/* RIGHT: details */}
          <div className="book-modal-main">
            <div className="title-row">
              <h2 className="book-modal-title">{book?.title || "Untitled"}</h2>
            </div>

            {book?.authors && (
              <div className="book-modal-author">
                {Array.isArray(book.authors) ? book.authors.join(", ") : book.authors}
              </div>
            )}
            {seriesName && <div className="modal-series">Series: {seriesName}</div>}

            {/* Dates */}
            <div className="dates-row">
              <div className="date-field">
                <label>Start date</label>
                <input
                  type="date"
                  value={startDate || ""}
                  onChange={isReadOnly ? undefined : (e) => setStartDate(e.target.value)}
                  onBlur={isReadOnly ? undefined : saveProgress}
                  disabled={isReadOnly}
                />
              </div>
              <div className="date-field">
                <label>End date</label>
                <input
                  type="date"
                  value={endDate || ""}
                  onChange={isReadOnly ? undefined : (e) => setEndDate(e.target.value)}
                  onBlur={isReadOnly ? undefined : saveProgress}
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {/* Progress */}
            <div className="reading-block">
              <label className="reading-label">Reading progress</label>
              <div className="reading-row">
                <input
                  className="page-input"
                  inputMode="numeric"
                  value={String(currentPage)}
                  onChange={
                    isReadOnly
                      ? undefined
                      : (e) => setCurrentPage(e.target.value.replace(/\D+/g, ""))
                  }
                  onBlur={isReadOnly ? undefined : saveProgress}
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                />
                <span className="of">of</span>
                <input
                  className="page-input"
                  inputMode="numeric"
                  value={String(totalPages)}
                  onChange={
                    isReadOnly
                      ? undefined
                      : (e) => setTotalPages(e.target.value.replace(/\D+/g, ""))
                  }
                  onBlur={isReadOnly ? undefined : saveProgress}
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                />
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="progress-small">
                {Number(currentPage) || 0} / {Number(totalPages) || 0} pages ({pct}%)
              </div>
            </div>

            {/* Rating */}
            <RatingStars
              value={Number(book?.rating || 0)}
              onChange={isReadOnly ? undefined : handleRating}
            />

            {/* ===== Genre (left) + Tropes (right) ===== */}
            <div className="meta-row">
              <div className="meta-field">
                <label className="bm-label">Genre</label>
                {isReadOnly ? (
                  <div className="review-display" style={{ padding: ".4rem .6rem" }}>
                    {book?.genre || "—"}
                  </div>
                ) : (
                  <PrettySelect
                    className="bm-select"
                    label="Genre"
                    placeholder="Select genre…"
                    value={book?.genre || ""}
                    onChange={(val) => onUpdateBook?.({ genre: val })}
                    options={PRESET_GENRES}
                  />
                )}
              </div>

              <div className="meta-field">
                <label className="bm-label">Tropes</label>
                {isReadOnly ? (
                  <div className="pm-pills" style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                    {(Array.isArray(book?.tropes) ? book.tropes : []).length
                      ? (book.tropes || []).map((t) => (
                          <span key={t} className="pm-pill">{t}</span>
                        ))
                      : <span className="pm-placeholder">—</span>}
                  </div>
                ) : (
                  <PrettyMultiSelect
                    className="bm-multi"
                    placeholder="Select tropes…"
                    value={Array.isArray(book?.tropes) ? book.tropes : []}
                    onChange={(vals) => onUpdateBook?.({ tropes: vals })}
                    options={PRESET_TROPES}
                  />
                )}
              </div>
            </div>

            {/* Review */}
            <div className="review-card">
              <div className="review-card-head">
                <div className="review-card-title">Review</div>
                {!isReadOnly && !editingReview && (
                  <button className="edit-btn" onClick={() => setEditingReview(true)}>Edit</button>
                )}
              </div>

              {!editingReview ? (
                <div className="review-display">
                  {review?.trim() ? review : "No review yet."}
                </div>
              ) : (
                !isReadOnly && (
                  <>
                    <textarea
                      className="review-textarea"
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      placeholder="Write your thoughts…"
                    />
                    <div className="review-actions">
                      <button className="review-save" onClick={saveReview}>Save</button>
                      <button
                        className="review-clear"
                        onClick={() => { setReview(""); setEditingReview(false); onUpdateBook?.({ review: "" }); }}
                      >
                        Clear
                      </button>
                    </div>
                  </>
                )
              )}
            </div>

            {/* Bottom actions */}
            {!isReadOnly && (
              <div className="bottom-actions">
                <button onClick={() => onMoveToShelf?.("currentlyReading")}>Add to Currently Reading</button>
                <button onClick={() => onMoveToShelf?.("tbr")}>Add to TBR</button>
                <button onClick={() => onMoveToShelf?.("finished")}>Mark as Finished</button>
                <button onClick={() => onMoveToShelf?.("dnf")}>Move to DNF</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.getElementById("modal-root") || document.body
  );
}

/* ---------- Half-star rating component ---------- */
function RatingStars({ value = 0, onChange }) {
  const [hover, setHover] = React.useState(null);
  const display = hover ?? value;

  const fillFor = (i) => {
    const amt = Math.max(0, Math.min(1, display - (i - 1)));
    return `${amt * 100}%`;
  };

  const halfOrFull = (e, i) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return x < rect.width / 2 ? i - 0.5 : i;
  };

  const clickable = typeof onChange === "function";

  return (
    <div
      className="rating-row"
      onMouseLeave={() => setHover(null)}
      aria-label="Rating"
      role="group"
      style={!clickable ? { opacity: 0.9, pointerEvents: "none" } : undefined}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className="star-btn"
          onMouseMove={clickable ? (e) => setHover(halfOrFull(e, i)) : undefined}
          onClick={clickable ? (e) => onChange?.(halfOrFull(e, i)) : undefined}
          onDoubleClick={clickable ? () => onChange?.(0) : undefined}
          aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
        >
          <span className="star-empty">★</span>
          {/* ESLint-friendly custom property */}
          <span className="star-fill" style={{ "--fill": fillFor(i) }} aria-hidden="true">
            ★
          </span>
        </button>
      ))}
    </div>
  );
}
