import React from "react";
import "../styles/Book.css";

export default function Book({ book, onClick, onRemove }) {
  const cover =
    book?.cover || book?.coverUrl || book?.coverURL ||
    "https://via.placeholder.com/128x193?text=No+Cover";

  // Check if this book is on the DNF shelf
  const isDNF = book?.shelf === "dnf";

  const handleClick = () => {
    onClick?.(book);
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation(); // prevent modal from opening
    onRemove?.(book);
  };

  return (
    <div
      className={`book ${isDNF ? "dnf" : ""}`} // add 'dnf' if needed
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleClick()}
      title={book?.title || "Book"}
    >
      {/* Remove X */}
      <button
        className="book-remove-btn"
        onClick={handleRemoveClick}
        aria-label="Remove book"
      >
        ×
      </button>

      <img
        className={`book-cover ${isDNF ? "dnf" : ""}`} // add 'dnf' if needed
        src={cover}
        alt={book?.title || "Book cover"}
      />
    </div>
  );
}
