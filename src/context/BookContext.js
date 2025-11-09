// src/context/BookContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

const BookContext = createContext(null);

const STORAGE_KEY = "pt_shelves_v1";
const VALID_SHELVES = ["currentlyReading", "tbr", "finished", "dnf"];
const isValidShelf = (s) => VALID_SHELVES.includes(s);

// --- helpers ----
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const statusFromShelf = (shelf) => {
  switch (shelf) {
    case "currentlyReading":
      return "currentlyReading";
    case "finished":
      return "finished";
    case "dnf":
      return "dnf";
    default:
      return "tbr";
  }
};
const shelfFromStatus = (status) => {
  const raw = String(status ?? "").trim().toLowerCase();
  if (["currentlyreading", "current", "reading", "reading_now"].includes(raw))
    return "currentlyReading";
  if (["finished", "done", "complete", "completed"].includes(raw)) return "finished";
  if (["dnf", "abandoned", "did not finish"].includes(raw)) return "dnf";
  return "tbr";
};
const isUUID = (s) =>
  typeof s === "string" &&
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    s
  );

// DB row → app book
function fromRow(row = {}) {
  return {
    id: row.id,
    dbId: row.id, // explicit db id tracker
    title: row.title || "Untitled",
    authors: row.author || "",
    cover: row.cover_url || "",
    pageCount: toNum(row.total_pages),
    currentPage: toNum(row.current_page),
    genre: row.genre || "",
    shelf: shelfFromStatus(row.status),
    created_at: row.created_at,
    user_id: row.user_id,
  };
}

// normalize local additions (Google Books etc.)
const normalizeBook = (b = {}) => {
  const pageCount =
    toNum(
      b.pageCount ??
        b.totalPages ??
        b.pages ??
        b.numPages ??
        b.length ??
        b.page_count
    ) || 0;

  const currentPage =
    toNum(b.currentPage ?? b.pagesRead ?? b.readPages ?? b.progressPages) || 0;

  const shelf = isValidShelf(b.shelf) ? b.shelf : "tbr";

  return {
    ...b,
    pageCount,
    currentPage,
    shelf,
  };
};

const findIn = (state, bookId) => {
  for (const shelf of VALID_SHELVES) {
    const index = state[shelf].findIndex((bk) => bk.id === bookId);
    if (index !== -1) return { book: state[shelf][index], shelf, index };
  }
  return null;
};

const stripEverywhere = (state, bookId) => ({
  currentlyReading: state.currentlyReading.filter((b) => b.id !== bookId),
  tbr: state.tbr.filter((b) => b.id !== bookId),
  finished: state.finished.filter((b) => b.id !== bookId),
  dnf: state.dnf.filter((b) => b.id !== bookId),
});

export const BookProvider = ({ children }) => {
  const { user } = useAuth();

  const [shelves, setShelves] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          currentlyReading: (parsed.currentlyReading || []).map(normalizeBook),
          tbr: (parsed.tbr || []).map(normalizeBook),
          finished: (parsed.finished || []).map(normalizeBook),
          dnf: (parsed.dnf || []).map(normalizeBook),
        };
      }
    } catch {}
    return { currentlyReading: [], tbr: [], finished: [], dnf: [] };
  });

  // keep localStorage in sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shelves));
    } catch {}
  }, [shelves]);

  // Load from Supabase (one-way) on login
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("books")
        .select(
          "id, user_id, title, author, cover_url, total_pages, current_page, genre, status, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled || error) return;

      const rows = data || [];
      if (rows.length === 0) return; // preserve local if server empty

      const next = { currentlyReading: [], tbr: [], finished: [], dnf: [] };
      for (const r of rows) {
        const b = fromRow(r);
        next[b.shelf].push(b);
      }
      setShelves(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ---------- cloud sync helpers ----------
  const getDbId = (b) => b?.dbId || (isUUID(b?.id) ? b.id : null);

  async function saveToCloud(b) {
    if (!user?.id) return null;

    const payload = {
      user_id: user.id,
      title: b.title || "Untitled",
      author: b.authors || "",
      cover_url: b.cover || "",
      total_pages: toNum(b.pageCount),
      current_page: toNum(b.currentPage),
      genre: b.genre || "",
      status: statusFromShelf(b.shelf),
    };

    const dbId = getDbId(b);

    if (dbId) {
      const { data, error } = await supabase
        .from("books")
        .upsert([{ id: dbId, ...payload }])
        .select("id")
        .single();
      if (error) {
        console.warn("[books upsert]", error);
        return null;
      }
      return data?.id || dbId;
    } else {
      const { data, error } = await supabase
        .from("books")
        .insert([payload])
        .select("id")
        .single();
      if (error) {
        console.warn("[books insert]", error);
        return null;
      }
      return data?.id || null;
    }
  }

  async function updateCloudShelf(book, nextShelf) {
    const dbId = getDbId(book);
    if (!user?.id || !dbId) return;
    const { error } = await supabase
      .from("books")
      .update({ status: statusFromShelf(nextShelf) })
      .eq("id", dbId)
      .eq("user_id", user.id);
    if (error) console.warn("[books update shelf]", error);
  }

  async function deleteFromCloud(book) {
    const dbId = getDbId(book);
    if (!user?.id || !dbId) return;
    const { error } = await supabase
      .from("books")
      .delete()
      .eq("id", dbId)
      .eq("user_id", user.id);
    if (error) console.warn("[books delete]", error);
  }

  // ---------- public API ----------
  const addBookToShelf = (shelf, book) => {
    if (!isValidShelf(shelf)) return;
    const n = normalizeBook({ ...book, shelf });

    // optimistic local update
    setShelves((prev) => ({
      ...prev,
      [shelf]: [...prev[shelf], n],
    }));

    // sync to cloud (fire & patch dbId if we get one)
    (async () => {
      const newId = await saveToCloud(n);
      if (newId) {
        setShelves((prev) => {
          const found = findIn(prev, n.id);
          if (!found) return prev;
          const updated = { ...found.book, dbId: newId };
          const without = stripEverywhere(prev, n.id);
          return { ...without, [found.shelf]: [...without[found.shelf], updated] };
        });
      }
    })();
  };

  const upsertBook = (book) => {
    if (!book || !book.id) return;
    const n = normalizeBook(book);
    const targetShelf = isValidShelf(n.shelf) ? n.shelf : "tbr";

    // optimistic local merge
    setShelves((prev) => {
      const found = findIn(prev, n.id);
      const merged = found ? normalizeBook({ ...found.book, ...n }) : n;
      const without = stripEverywhere(prev, n.id);
      return {
        ...without,
        [targetShelf]: [...without[targetShelf], merged],
      };
    });

    // cloud upsert + patch dbId if new
    (async () => {
      const newId = await saveToCloud(n);
      if (newId) {
        setShelves((prev) => {
          const found = findIn(prev, n.id);
          if (!found) return prev;
          const updated = { ...found.book, dbId: found.book.dbId ?? newId };
          const without = stripEverywhere(prev, n.id);
          return { ...without, [found.shelf]: [...without[found.shelf], updated] };
        });
      }
    })();
  };

  const moveBookShelf = (bookId, nextShelf) => {
    if (!isValidShelf(nextShelf)) return;

    setShelves((prev) => {
      const found = findIn(prev, bookId);
      if (!found) return prev;
      const without = stripEverywhere(prev, bookId);
      const moved = normalizeBook({ ...found.book, shelf: nextShelf });
      // cloud update (best-effort)
      updateCloudShelf(found.book, nextShelf);
      return { ...without, [nextShelf]: [...without[nextShelf], moved] };
    });
  };

  const removeBook = (bookId) => {
    setShelves((prev) => {
      const found = findIn(prev, bookId);
      if (found) deleteFromCloud(found.book);
      return stripEverywhere(prev, bookId);
    });
  };

  // One-time backfill helper to push existing local books to cloud (DEV)
  const backfillToSupabase = useCallback(async () => {
    if (!user?.id) return;
    for (const shelf of VALID_SHELVES) {
      for (const b of shelves[shelf]) {
        if (!getDbId(b)) {
          const id = await saveToCloud(b);
          if (id) {
            setShelves((prev) => {
              const f = findIn(prev, b.id);
              if (!f) return prev;
              const updated = { ...f.book, dbId: id };
              const without = stripEverywhere(prev, b.id);
              return { ...without, [f.shelf]: [...without[f.shelf], updated] };
            });
          }
        }
      }
    }
  }, [user?.id, shelves]); // explicit deps

  // expose backfill in dev so you can call `ptBackfill()` from console
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      window.ptBackfill = backfillToSupabase;
      return () => {
        delete window.ptBackfill;
      };
    }
  }, [backfillToSupabase]); // satisfies exhaustive-deps

  return (
    <BookContext.Provider
      value={{ shelves, addBookToShelf, upsertBook, moveBookShelf, removeBook }}
    >
      {children}
    </BookContext.Provider>
  );
};

export function useBooks() {
  const ctx = useContext(BookContext);
  if (!ctx) throw new Error("useBooks must be used inside <BookProvider>");
  return ctx;
}
