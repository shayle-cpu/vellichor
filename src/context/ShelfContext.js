// src/context/ShelfContext.js
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

export const ShelfContext = createContext(null);

const SHELVES_KEY = "vellichor_shelves_v1";

// Helpers to keep book shape consistent
const normalizeBook = (b = {}) => ({
  id: b.id || `${(b.title || "book").slice(0, 50)}-${Date.now()}`,
  title: b.title || "",
  author: b.author || "",
  series: b.series || "",
  cover: b.cover || b.coverUrl || b.coverURL || "",
  addedAt: b.addedAt || Date.now(),
});

const normalizeShelves = (s) => ({
  tbr: (s?.tbr || []).map(normalizeBook),
  currentlyReading: (s?.currentlyReading || []).map(normalizeBook),
  finished: (s?.finished || []).map(normalizeBook),
});

export function ShelfProvider({ children }) {
  const [shelves, setShelves] = useState({ tbr: [], currentlyReading: [], finished: [] });
  const [hydrated, setHydrated] = useState(false);

  // Load shelves from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SHELVES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = normalizeShelves(parsed);
        setShelves(normalized);
        // write back once so everything uses .cover going forward
        localStorage.setItem(SHELVES_KEY, JSON.stringify(normalized));
      }
    } catch {
      // ignore
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SHELVES_KEY, JSON.stringify(shelves));
    } catch {
      // ignore
    }
  }, [shelves, hydrated]);

  const addBookToShelf = useCallback((shelf, book) => {
    const key =
      shelf === "finished"
        ? "finished"
        : shelf === "currentlyReading"
        ? "currentlyReading"
        : "tbr";

    const entry = normalizeBook(book);

    setShelves((prev) => {
      const exists = prev[key].some(
        (b) =>
          (b.title || "").trim().toLowerCase() ===
            (entry.title || "").trim().toLowerCase() &&
          (b.series || "").trim().toLowerCase() ===
            (entry.series || "").trim().toLowerCase()
      );
      if (exists) return prev;
      const next = { ...prev, [key]: [...prev[key], entry] };
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      shelves,
      addBookToShelf,
      setShelves, // expose if you need to manipulate directly
    }),
    [shelves, addBookToShelf]
  );

  return <ShelfContext.Provider value={value}>{children}</ShelfContext.Provider>;
}
