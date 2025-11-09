import React, { useState } from "react";
import { Link } from "react-router-dom";
import Shelf from "../components/Shelf";
import BookModal from "../components/BookModal";
import { useBooks } from "../context/BookContext";
import "../styles/Bookshelf.css";

// ✅ NEW: log finished books for achievements like First Finish / Double Feature
import { logFinishedBook } from "../utils/history";

// Ensure a consistent cover field
const normalizeBook = (b = {}) => ({
  ...b,
  cover: b.cover || b.coverUrl || b.coverURL || "",
});

export default function Bookshelf({
  readOnly = false,
  heading = "My Library",
}) {
  const { shelves = {}, upsertBook, moveBookShelf, removeBook } = useBooks();

  const {
    currentlyReading = [],
    tbr = [],
    finished = [],
    dnf = [],
  } = shelves || {};

  const [modalOpen, setModalOpen] = useState(false);
  const [modalBook, setModalBook] = useState(null);

  const openBookModal = (book) => {
    setModalBook(normalizeBook(book));
    setModalOpen(true);
  };

  const closeBookModal = () => {
    setModalOpen(false);
    setModalBook(null);
  };

  // Remove from library (inline X or from modal)
  const handleRemoveBook = (bookOrId) => {
    if (readOnly) return;
    const id = typeof bookOrId === "string" ? bookOrId : bookOrId?.id;
    if (!id) return;
    removeBook(id);
    if (modalBook?.id === id) closeBookModal();
  };

  // Find which shelf a book is on right now
  const findShelfKey = (id) => {
    if (currentlyReading.some((b) => b.id === id)) return "currentlyReading";
    if (tbr.some((b) => b.id === id)) return "tbr";
    if (finished.some((b) => b.id === id)) return "finished";
    if (dnf.some((b) => b.id === id)) return "dnf";
    return "tbr";
  };

  // Move between shelves from inside the modal
  const handleMoveToShelf = (targetShelf) => {
    if (readOnly || !modalBook?.id) return;

    const key = ["finished", "currentlyReading", "tbr", "dnf"].includes(targetShelf)
      ? targetShelf
      : "tbr";

    moveBookShelf(modalBook.id, key);

    // ✅ If moved to Finished, record a finish event for achievement logic
    if (key === "finished") {
      logFinishedBook({
        bookId: modalBook.id,
        title: modalBook.title,
        authors: modalBook.authors,
        date: modalBook.endDate || new Date(),
      });
    }

    setModalBook((m) => (m ? { ...m, shelf: key } : m));
    closeBookModal();
  };

  // Update fields (favorite, pages, rating, etc.) and keep on its shelf
  const handleUpdateBook = (partial) => {
    if (readOnly || !modalBook?.id) return;

    const shelfKey = findShelfKey(modalBook.id);
    const current =
      (shelfKey === "currentlyReading"
        ? currentlyReading.find((b) => b.id === modalBook.id)
        : shelfKey === "tbr"
        ? tbr.find((b) => b.id === modalBook.id)
        : shelfKey === "finished"
        ? finished.find((b) => b.id === modalBook.id)
        : dnf.find((b) => b.id === modalBook.id)) || {};

    // Persist to store
    upsertBook({
      ...current,
      ...modalBook,
      ...partial,
      id: modalBook.id,
      shelf: shelfKey,
    });

    // Keep modal UI in sync
    setModalBook((m) => ({ ...(m || {}), ...partial, shelf: shelfKey }));
  };

  return (
    <div className="bookshelf-page">
      {/* Header */}
      <div className="library-hero">
        <h1 className="library-title">{heading}</h1>
        {!readOnly && (
          <div className="library-actions">
            <Link to="/add-book" className="add-book-button">+ Add Book</Link>
          </div>
        )}
      </div>

      {/* Shelves — order: Currently Reading → TBR → Finished → DNF */}
      <Shelf
        title="Currently Reading"
        books={currentlyReading.map(normalizeBook)}
        onBookClick={openBookModal}
        {...(!readOnly && { onRemoveBook: handleRemoveBook })}
      />
      <Shelf
        title="To Be Read"
        books={tbr.map(normalizeBook)}
        onBookClick={openBookModal}
        {...(!readOnly && { onRemoveBook: handleRemoveBook })}
      />
      <Shelf
        title="Finished"
        books={finished.map(normalizeBook)}
        onBookClick={openBookModal}
        {...(!readOnly && { onRemoveBook: handleRemoveBook })}
      />
      <Shelf
        title="DNF"
        books={dnf.map(normalizeBook)}
        onBookClick={openBookModal}
        {...(!readOnly && { onRemoveBook: handleRemoveBook })}
      />

      {/* Modal (read-only if prop set) */}
      <BookModal
        open={modalOpen}
        onClose={closeBookModal}
        book={modalBook}
        seriesName={modalBook?.series || ""}
        onMoveToShelf={readOnly ? null : handleMoveToShelf}
        onRemove={readOnly ? null : (() => modalBook?.id && handleRemoveBook(modalBook.id))}
        onUpdateBook={readOnly ? null : handleUpdateBook}
      />
    </div>
  );
}
