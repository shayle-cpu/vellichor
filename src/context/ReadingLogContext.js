import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ReadingLogCtx = createContext(null);
const LS_KEY = "pt-reading-log-v1";

/**
 * Shape:
 * logByDate = {
 *   "2025-08-07": ["bookId1", "bookId2"],
 *   ...
 * }
 */
export function ReadingLogProvider({ children }) {
  const [logByDate, setLogByDate] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(logByDate));
    } catch {
      // ignore write errors (storage quota, etc.)
    }
  }, [logByDate]);

  const setDateBooks = (dateKey, bookIds = []) => {
    setLogByDate((prev) => {
      const next = { ...prev };
      if (!bookIds || bookIds.length === 0) {
        delete next[dateKey];
      } else {
        next[dateKey] = Array.from(new Set(bookIds)); // dedupe
      }
      return next;
    });
  };

  const addBookToDate = (dateKey, bookId) => {
    setLogByDate((prev) => {
      const cur = prev[dateKey] || [];
      if (cur.includes(bookId)) return prev;
      return { ...prev, [dateKey]: [...cur, bookId] };
    });
  };

  const removeBookFromDate = (dateKey, bookId) => {
    setLogByDate((prev) => {
      const cur = prev[dateKey] || [];
      const next = cur.filter((id) => id !== bookId);
      const out = { ...prev };
      if (next.length === 0) delete out[dateKey];
      else out[dateKey] = next;
      return out;
    });
  };

  const value = useMemo(
    () => ({ logByDate, setDateBooks, addBookToDate, removeBookFromDate }),
    [logByDate]
  );

  return <ReadingLogCtx.Provider value={value}>{children}</ReadingLogCtx.Provider>;
}

export function useReadingLog() {
  const ctx = useContext(ReadingLogCtx);
  if (!ctx) {
    throw new Error("useReadingLog must be used within a ReadingLogProvider");
  }
  return ctx;
}
