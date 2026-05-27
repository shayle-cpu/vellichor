import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BookModal from "../components/BookModal";
import { useBooks } from "../context/BookContext";
import "../styles/Bookshelf.css";
import { logFinishedBook } from "../utils/history";

const normalizeBook = (b = {}) => ({
  ...b,
  cover: b.cover || b.coverUrl || b.coverURL || "",
});

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

export default function Bookshelf({ readOnly = false, heading = "My Library" }) {
  const { shelves = {}, upsertBook, moveBookShelf, removeBook } = useBooks();

  const { currentlyReading = [], tbr = [], finished = [], dnf = [] } = shelves || {};

  const [modalOpen, setModalOpen] = useState(false);
  const [modalBook, setModalBook] = useState(null);

  const normalizedCR = currentlyReading.map(normalizeBook);
  const normalizedTBR = tbr.map(normalizeBook);
  const normalizedFinished = finished.map(normalizeBook);
  const normalizedDNF = dnf.map(normalizeBook);

  const currentlyReadingHero = normalizedCR[0] || null;

  const readingActivity = useMemo(() => {
    const allBooks = [...normalizedCR, ...normalizedTBR, ...normalizedFinished, ...normalizedDNF];
    const pagesRead = allBooks.reduce((sum, book) => sum + (Number(book.currentPage) || Number(book.pagesRead) || 0), 0);
    const activeSessions = normalizedCR.length;
    const completed = normalizedFinished.length;
    const goal = 52;
    const completionPct = clamp(Math.round((completed / goal) * 100), 0, 100);
    return { pagesRead, activeSessions, completed, completionPct };
  }, [normalizedCR, normalizedTBR, normalizedFinished, normalizedDNF]);

  const openBookModal = (book) => {
    setModalBook(normalizeBook(book));
    setModalOpen(true);
  };

  const closeBookModal = () => {
    setModalOpen(false);
    setModalBook(null);
  };

  const handleRemoveBook = (bookOrId) => {
    if (readOnly) return;
    const id = typeof bookOrId === "string" ? bookOrId : bookOrId?.id;
    if (!id) return;
    removeBook(id);
    if (modalBook?.id === id) closeBookModal();
  };

  const findShelfKey = (id) => {
    if (currentlyReading.some((b) => b.id === id)) return "currentlyReading";
    if (tbr.some((b) => b.id === id)) return "tbr";
    if (finished.some((b) => b.id === id)) return "finished";
    if (dnf.some((b) => b.id === id)) return "dnf";
    return "tbr";
  };

  const handleMoveToShelf = (targetShelf) => {
    if (readOnly || !modalBook?.id) return;

    const key = ["finished", "currentlyReading", "tbr", "dnf"].includes(targetShelf) ? targetShelf : "tbr";

    moveBookShelf(modalBook.id, key);

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

    upsertBook({ ...current, ...modalBook, ...partial, id: modalBook.id, shelf: shelfKey });
    setModalBook((m) => ({ ...(m || {}), ...partial, shelf: shelfKey }));
  };

  const renderBookRail = (title, books, subtle = false) => (
    <section className="collection-section" key={title}>
      <div className="collection-head">
        <h3>{title}</h3>
        <span>{books.length} books</span>
      </div>
      {books.length === 0 ? (
        <div className="collection-empty">Nothing here yet — add a title to shape this collection.</div>
      ) : (
        <div className={`book-rail ${subtle ? "book-rail--subtle" : ""}`}>
          {books.map((book, idx) => (
            <div className="book-card-wrap" key={book.id || idx}>
              <img
                className={`book-card-cover ${book.shelf === "dnf" ? "book-card-cover--dnf" : ""}`}
                src={book.cover || "https://via.placeholder.com/180x270?text=No+Cover"}
                alt={book.title || "Book cover"}
                onClick={() => openBookModal(book)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="bookshelf-page">
      <header className="library-topbar">
        <div>
          <p className="eyebrow">Reading sanctuary</p>
          <h1 className="library-title">{heading}</h1>
        </div>
        {!readOnly && (
          <div className="library-actions">
            <Link to="/add-book" className="add-book-button">+ Add Book</Link>
          </div>
        )}
      </header>

      <section className="currently-reading-hero">
        <div className="hero-cover">
          <img
            src={currentlyReadingHero?.cover || "https://via.placeholder.com/280x420?text=Pick+your+next+read"}
            alt={currentlyReadingHero?.title || "Currently reading"}
          />
        </div>
        <div className="hero-content">
          <p className="eyebrow">Currently reading</p>
          <h2>{currentlyReadingHero?.title || "Choose your next immersive read"}</h2>
          <p className="hero-meta">{currentlyReadingHero?.authors || "Start a book to unlock progress, notes, and streak rituals."}</p>
          <div className="hero-stats">
            <div><span>Progress</span><strong>{Number(currentlyReadingHero?.currentPage) || 0} pages</strong></div>
            <div><span>Streak</span><strong>{Math.max(1, normalizedCR.length)} day rhythm</strong></div>
            <div><span>Reflection</span><strong>{currentlyReadingHero ? "What do you predict next?" : "Add your first reading thought"}</strong></div>
          </div>
        </div>
      </section>

      <section className="activity-grid">
        <article><span>Pages read</span><strong>{readingActivity.pagesRead}</strong></article>
        <article><span>Active books</span><strong>{readingActivity.activeSessions}</strong></article>
        <article><span>Books finished</span><strong>{readingActivity.completed}</strong></article>
        <article><span>Annual goal</span><strong>{readingActivity.completionPct}%</strong></article>
      </section>

      <section className="collections-layout">
        {renderBookRail("Continue Reading", normalizedCR)}
        {renderBookRail("Want to Read", normalizedTBR, true)}
        {renderBookRail("Finished", normalizedFinished)}
        {renderBookRail("Paused / DNF", normalizedDNF, true)}
      </section>

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
