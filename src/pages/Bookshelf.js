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
    const completed = normalizedFinished.length;
    const goal = 52;
    const completionPct = clamp(Math.round((completed / goal) * 100), 0, 100);
    return { pagesRead, completed, completionPct };
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

  const EMPTY_COPY = {
  "Continue Reading": ["Waiting for your next obsession", "A fresh chapter will glow here tonight."],
  "Want to Read": ["This shelf smells like possibility", "A future favorite belongs here."],
  Finished: ["Every finished story leaves a little stardust", "Your completed adventures will gather here."],
  "Paused / DNF": ["Some stories need a different season", "Bookmarks wait patiently for your return."]
};

const SECTION_ICONS = {
  "Continue Reading": "🕯️",
  "Want to Read": "🌿",
  Finished: "📜",
  "Paused / DNF": "🪶"
};

const TBR_WHISPERS = [
  "waiting for a rainy day",
  "future obsession",
  "recommended by a friend",
  "saved for candlelight"
];

  const renderBookRail = (title, books, subtle = false) => (
    <section className="collection-section" key={title}>
      <div className="collection-head">
        <h3><span aria-hidden="true">{SECTION_ICONS[title] || "✦"}</span>{title}</h3>
        <span>{books.length} books</span>
      </div>
      {books.length === 0 ? (
        <div className="collection-empty">
          <div className="empty-line">{EMPTY_COPY[title]?.[0] || "A future favorite belongs here"}</div>
          <div className="empty-line">{EMPTY_COPY[title]?.[1] || "A little literary magic is on the way."}</div>
          <div className="empty-trinkets" aria-hidden="true">✧ pressed flower · tiny star map · velvet bookmark</div>
        </div>
      ) : (
        <div className={`book-rail ${subtle ? "book-rail--subtle" : ""}`}>
          {books.map((book, idx) => (
            <div className={`book-card-wrap ${title === "Want to Read" ? "book-card-wrap--dreamy" : ""}`} key={book.id || idx}>
              {/* Book cards are intentionally tilted and shadowed so they feel collectible and tactile. */}
              <img
                className={`book-card-cover ${book.shelf === "dnf" ? "book-card-cover--dnf" : ""}`}
                src={book.cover || "https://via.placeholder.com/180x270?text=No+Cover"}
                alt={book.title || "Book cover"}
                onClick={() => openBookModal(book)}
              />
              <div className="book-meta">{book.authors || "Unknown author"}</div>
              {title === "Want to Read" && (
                <div className="book-whisper">{TBR_WHISPERS[idx % TBR_WHISPERS.length]}</div>
              )}
              {title === "Finished" && (
                <div className="book-whisper">{book.endDate ? `finished ${new Date(book.endDate).toLocaleDateString()}` : "a treasured memory"}</div>
              )}
              <div className="book-badges">
                {!!book.favorite && <span className="book-badge">★ favorite</span>}
                {!!book.notes && <span className="book-badge">✎ notes</span>}
                {!!book.quote && <span className="book-badge">❝ quote</span>}
                {!!book.prediction && <span className="book-badge">🔮 prediction</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="bookshelf-page">
      {/* Atmospheric dust layer keeps empty spaces alive without adding UI clutter. */}
      <div className="atmospheric-dust" aria-hidden="true" />
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
        <div className="hero-ornaments" aria-hidden="true">✦ ☾ ❦</div>
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
            <div><span>Streak</span><strong>{Math.max(1, normalizedCR.length)} day ritual</strong></div>
            <div><span>Mood</span><strong>{currentlyReadingHero?.mood || "Rainy afternoon reverie"}</strong></div>
            <div><span>Quote</span><strong>{currentlyReadingHero?.quote || "“A line worth underlining awaits.”"}</strong></div>
            <div><span>Notebook</span><strong>{currentlyReadingHero?.notes ? "margin notes tucked in" : "leave a thought in the margins"}</strong></div>
          </div>
        </div>
      </section>

      <aside className="journal-strip" aria-label="Reading journal details">
        <p>Pages wandered: <strong>{readingActivity.pagesRead}</strong></p>
        <p>Volumes cherished: <strong>{readingActivity.completed}</strong></p>
        <p>Yearly chapter quest: <strong>{readingActivity.completionPct}%</strong></p>
      </aside>

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
