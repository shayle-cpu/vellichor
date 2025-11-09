import React, { useEffect, useMemo, useState } from "react";
import { useBooks } from "../context/BookContext";
import BookPickerModal from "../components/BookPickerModal";
import "../styles/Challenges.css";

/* ---------- helpers ---------- */
const getNum = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
const pagesTotal = (b) => getNum(b?.pageCount ?? b?.totalPages ?? 0);

/* ---------- default challenges ---------- */
const DEFAULTS = [
  {
    id: "big-book",
    title: "Big Book",
    desc: "Read a 1,000+ page book",
    goal: 1,
    calcProgress: ({ finished }) =>
      finished.filter((b) => pagesTotal(b) >= 500).length,
    suggest: ({ tbr, current }) =>
      [...current, ...tbr].filter((b) => pagesTotal(b) >= 500),
  },
  
];

/* ---------- storage ---------- */
const LS_KEY = "pt_challenges_v1";
function useChallengeState() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw
        ? JSON.parse(raw)
        : { completed: {}, progressEntries: {}, userChallenges: [] };
    } catch {
      return { completed: {}, progressEntries: {}, userChallenges: [] };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const setProgressEntry = (id, index, value) =>
    setState((s) => {
      const entries = { ...(s.progressEntries[id] || {}) };
      entries[index] = value;
      return {
        ...s,
        progressEntries: {
          ...s.progressEntries,
          [id]: entries,
        },
      };
    });

  const addUserChallenge = (challenge) =>
    setState((s) => ({
      ...s,
      userChallenges: [...s.userChallenges, challenge],
    }));

  const removeUserChallenge = (id) =>
    setState((s) => ({
      ...s,
      userChallenges: s.userChallenges.filter((c) => c.id !== id),
      progressEntries: Object.fromEntries(
        Object.entries(s.progressEntries).filter(([key]) => key !== id)
      ),
    }));

  return {
    state,
    setProgressEntry,
    addUserChallenge,
    removeUserChallenge,
  };
}

/* ---------- challenge card ---------- */
/* ---------- challenge card (left content + right horizontal progress bar) ---------- */
function ChallengeCard({ c, progress, completed, onClick, onDelete }) {
  const done = completed || progress >= c.goal;
  const pct = Math.max(0, Math.min(100, Math.round((progress / Math.max(c.goal, 1)) * 100)));

  const handleActivate = () => onClick(c);

  return (
    <div
      className={`ch-card ${done ? "ch-card--done" : ""}`}
      onClick={handleActivate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleActivate()}
    >
      <div className="ch-card-row">
        {/* LEFT: title + description */}
        <div className="ch-head ch-head--left">
          <div className="ch-head__meta">
            <div className="ch-title">{c.title}</div>
            {c.desc ? <div className="ch-desc">{c.desc}</div> : null}
          </div>
        </div>

        {/* RIGHT: horizontal progress bar */}
        <div className="ch-progress" aria-label={`Progress ${progress} of ${c.goal}`}>
          <div className="ch-progress__label">{progress}/{c.goal}</div>
          <div className="ch-pbar">
            <div className="ch-pbar__fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {onDelete && (
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(c.id);
          }}
          aria-label="Delete challenge"
          title="Delete challenge"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ---------- challenge modal ---------- */
/* ---------- challenge modal ---------- */
function ChallengeModal({
  c,
  progressEntries,
  onClose,
  onChange,
  finished,
  current,
  tbr,
}) {
  const [pickerOpenIndex, setPickerOpenIndex] = useState(null);
  if (!c) return null;

  const goal = c.goal;
  const entries = progressEntries[c.id] || {};
  const allBooks = [...finished, ...current, ...tbr];

  const handleBookSelect = (index, selectedIds) => {
    onChange(c.id, index, selectedIds[0] || "");
    setPickerOpenIndex(null);
  };

  return (
    <div className="ch-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="ch-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button className="ch-modal__close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <div className="ch-modal-body">
          <h2 id="modal-title" className="ch-modal__title">
            {c.title}
          </h2>
          {c.desc ? <div className="ch-modal__desc">{c.desc}</div> : null}

          <div className="ch-slot-grid">
            {[...Array(goal)].map((_, i) => {
              const bookId = entries[i] || "";
              const bookObj = allBooks.find((b) => {
                const nb = {
                  id: b.id || b.googleId || b.isbn || "",
                  cover: b.cover || b.coverUrl || b.coverURL || "",
                  title: b.title || "",
                };
                return nb.id === bookId;
              });

              return (
                <div
                  key={i}
                  className={`book-slot ${bookId ? "has-cover" : ""}`}
                  onClick={() => setPickerOpenIndex(i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setPickerOpenIndex(i)}
                >
                  {bookId ? (
                    <img
                      src={bookObj?.cover || ""}
                      alt={bookObj?.title || "Selected book cover"}
                      loading="lazy"
                    />
                  ) : (
                    <span style={{ fontSize: 28, color: "var(--pt-sage)" }}>＋</span>
                  )}
                  {bookId && (
                    <button
                      className="remove-btn"
                      aria-label="Remove book"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(c.id, i, "");
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  )}
                  <div className="overlay">Change</div>
                </div>
              );
            })}
          </div>
        </div>

        {pickerOpenIndex !== null && (
          <BookPickerModal
            open={true}
            selectedIds={entries[pickerOpenIndex] ? [entries[pickerOpenIndex]] : []}
            onClose={() => setPickerOpenIndex(null)}
            onSave={(ids) => handleBookSelect(pickerOpenIndex, ids)}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- main page ---------- */
export default function ChallengesPage() {
  const { shelves } = useBooks();
  const {
    state,
    setProgressEntry,
    addUserChallenge,
    removeUserChallenge,
  } = useChallengeState();

  // Memoize shelf arrays so downstream deps are stable
  const finished = useMemo(() => shelves.finished || [], [shelves.finished]);
  const current = useMemo(() => shelves.currentlyReading || [], [shelves.currentlyReading]);
  const tbr = useMemo(() => shelves.tbr || [], [shelves.tbr]);

  // Build cards with progress based on filled book entries
  const cards = useMemo(() => {
    const defaultCards = DEFAULTS.map((c) => {
      const entries = state.progressEntries[c.id] || {};
      const filledCount = Object.values(entries).filter((v) => v && v.trim() !== "").length;
      const completed = filledCount >= c.goal;
      const suggestions = c.suggest({ finished, current, tbr });
      return { c, progress: filledCount, suggestions, completed, isUser: false };
    });
    const userCards = state.userChallenges.map((c) => {
      const entries = state.progressEntries[c.id] || {};
      const filledCount = Object.values(entries).filter((v) => v && v.trim() !== "").length;
      const completed = filledCount >= c.goal;
      return { c, progress: filledCount, suggestions: [], completed, isUser: true };
    });
    return [...defaultCards, ...userCards];
  }, [finished, current, tbr, state.progressEntries, state.userChallenges]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalChallenge, setModalChallenge] = useState(null);

  const openModal = (challenge) => {
    setModalChallenge(challenge);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const handleProgressChange = (id, index, value) => {
    setProgressEntry(id, index, value);
  };

  const handleDelete = (id) => {
    removeUserChallenge(id);
    if (modalChallenge?.id === id) closeModal();
  };

  /* ------- Create Your Own Challenge ------- */
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newGoal, setNewGoal] = useState(5);
  const [newDesc, setNewDesc] = useState("");

  const submitCreate = (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    const goal = Math.max(1, Number(newGoal) || 1);

    if (!title) return;

    const challenge = {
      id: `uc-${Date.now()}`,
      title,
      desc: newDesc.trim(),
      goal,
      // user challenges don’t need calcProgress/suggest
      suggest: () => [],
    };

    addUserChallenge(challenge);
    setShowCreate(false);
    setNewTitle("");
    setNewGoal(5);
    setNewDesc("");
  };

  return (
    <div className="ch-page">
      <header className="ch-header">
        <h1>Reading Challenges</h1>
      </header>

      {/* Create Challenge Toggle + Form */}
      <div style={{ display: "flex", justifyContent: "center", margin: "0.5rem 0 1rem" }}>
        {!showCreate ? (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{
              background: "white",
              border: "1px solid var(--pt-sage)",
              color: "var(--pt-green)",
              borderRadius: 12,
              padding: "8px 14px",
              fontFamily: "'Playfair Display', serif",
              cursor: "pointer",
            }}
          >
            + Create a Challenge
          </button>
        ) : (
          <form
            onSubmit={submitCreate}
            style={{
              background: "#fffdf8",
              border: "1px solid #e9dccb",
              borderRadius: 14,
              padding: "12px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
              maxWidth: 720,
              boxShadow: "0 3px 10px rgba(0,0,0,.06)",
            }}
          >
            <input
              type="text"
              placeholder="Challenge title (e.g., Read 10 Romances)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              style={{
                flex: "2 1 260px",
                minWidth: 220,
                border: "1px solid #e0d9c9",
                borderRadius: 10,
                padding: "8px 10px",
                fontFamily: "'Playfair Display', serif",
              }}
            />
            <input
              type="number"
              min="1"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              title="How many books?"
              style={{
                width: 120,
                border: "1px solid #e0d9c9",
                borderRadius: 10,
                padding: "8px 10px",
                fontFamily: "'Playfair Display', serif",
              }}
            />
            <input
              type="text"
              placeholder="Optional description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              style={{
                flex: "1 1 200px",
                minWidth: 180,
                border: "1px solid #e0d9c9",
                borderRadius: 10,
                padding: "8px 10px",
                fontFamily: "'Playfair Display', serif",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                style={{
                  background: "var(--pt-terracotta)",
                  color: "#fff",
                  border: "1px solid #c18f78",
                  borderRadius: 10,
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewTitle("");
                  setNewGoal(5);
                  setNewDesc("");
                }}
                style={{
                  background: "#fff",
                  color: "var(--pt-green)",
                  border: "1px solid var(--pt-sage)",
                  borderRadius: 10,
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="ch-grid">
        {cards.map(({ c, progress, completed, isUser }) => (
          <ChallengeCard
            key={c.id}
            c={c}
            progress={progress}
            completed={completed}
            onClick={openModal}
            onDelete={isUser ? handleDelete : undefined}
          />
        ))}
      </div>

      {modalOpen && (
        <ChallengeModal
          c={modalChallenge}
          progressEntries={state.progressEntries}
          onClose={closeModal}
          onChange={handleProgressChange}
          finished={finished}
          current={current}
          tbr={tbr}
        />
      )}
    </div>
  );
}
