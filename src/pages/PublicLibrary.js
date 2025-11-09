// src/pages/PublicLibrary.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

// Reuse your app's look & components
import Shelf from "../components/Shelf";
import BookModal from "../components/BookModal";
import "../styles/Bookshelf.css";

// ---------- helpers ----------
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const mapShelf = (status) => {
  const raw = String(status ?? "").trim().toLowerCase();
  if (["currentlyreading", "current", "reading", "reading_now"].includes(raw)) return "currentlyReading";
  if (["finished", "done", "complete", "completed"].includes(raw)) return "finished";
  if (["dnf", "abandoned", "did not finish"].includes(raw)) return "dnf";
  return "tbr";
};

const toTropes = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === "string") {
    const s = val.trim();
    try {
      if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      }
    } catch {}
    return s.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
};

// Try to select meta columns, fall back if they don't exist
async function selectUserBooks(userId) {
  const base =
    "id, title, author, cover_url, total_pages, current_page, genre, status, created_at";
  const withMeta = `${base}, rating, review, tropes`;

  let res = await supabase
    .from("books")
    .select(withMeta)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (res.error && /column .* does not exist/i.test(res.error.message)) {
    res = await supabase
      .from("books")
      .select(base)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
  }
  return res;
}

// Normalize to what your BookModal/Shelf expect (cover, totalPages, currentPage, etc.)
const normalizeBook = (r = {}) => ({
  id: r.id,
  title: r.title || "Untitled",
  authors: r.author || "",                   // your DB uses 'author'
  cover: r.cover_url || "",
  totalPages: toNum(r.total_pages),          // BookModal reads totalPages
  currentPage: toNum(r.current_page),
  genre: r.genre || "",
  rating: toNum(r.rating || 0),
  review: r.review || "",
  tropes: toTropes(r.tropes),
});

export default function PublicLibrary() {
  const { username } = useParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // shelves shaped exactly like your Bookshelf uses
  const [shelves, setShelves] = useState({
    currentlyReading: [],
    tbr: [],
    finished: [],
    dnf: [],
  });

  // read-only modal state (use your BookModal)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBook, setModalBook] = useState(null);

  const openBookModal = (book) => {
    setModalBook(book);
    setModalOpen(true);
  };
  const closeBookModal = () => {
    setModalOpen(false);
    setModalBook(null);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        // 1) profile by username (case-insensitive)
        const { data: prof, error: pErr } = await supabase
          .from("profiles")
          .select("id, username, display_name, library_public")
          .ilike("username", username)
          .maybeSingle();
        if (pErr) throw pErr;
        if (!prof) throw new Error("User not found.");
        if (prof.library_public === false) throw new Error("This library is private.");

        if (cancelled) return;
        setProfile(prof);

        // 2) books for that user (schema tolerant)
        const { data: rows, error: bErr } = await selectUserBooks(prof.id);
        if (bErr) throw bErr;

        if (cancelled) return;

        const next = { currentlyReading: [], tbr: [], finished: [], dnf: [] };
        (rows || []).forEach((r) => {
          const shelf = mapShelf(r.status);
          next[shelf].push(normalizeBook(r));
        });
        setShelves(next);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load library.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [username]);

  const displayName = profile?.display_name || profile?.username || username;

  useEffect(() => {
    if (displayName) document.title = `${displayName}’s Library`;
  }, [displayName]);

  if (loading) {
    return (
      <div className="bookshelf-page">
        <div className="library-hero">
          <h1 className="library-title">{displayName}’s Library</h1>
        </div>
        <p>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bookshelf-page">
        <div className="library-hero">
          <h1 className="library-title">{displayName}’s Library</h1>
        </div>
        <div className="notice-card" style={{ marginTop: 8 }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="bookshelf-page">
      {/* Use the exact same hero/title so it matches My Library */}
      <div className="library-hero">
        <h1 className="library-title">{displayName}’s Library</h1>
      </div>

      {/* Use your Shelf component so titles & boards look identical */}
      <Shelf
        title="Currently Reading"
        books={shelves.currentlyReading}
        onBookClick={openBookModal}
        /* read-only: no onRemoveBook */
      />
      <Shelf
        title="To Be Read"
        books={shelves.tbr}
        onBookClick={openBookModal}
      />
      <Shelf
        title="Finished"
        books={shelves.finished}
        onBookClick={openBookModal}
      />
      <Shelf
        title="DNF"
        books={shelves.dnf}
        onBookClick={openBookModal}
      />

      {/* Your BookModal already supports read-only when action handlers are absent */}
      <BookModal
        open={modalOpen}
        onClose={closeBookModal}
        book={modalBook}
        seriesName={modalBook?.series || ""}
        onMoveToShelf={null}
        onRemove={null}
        onUpdateBook={null}
      />
    </div>
  );
}
