// src/pages/SeriesTracker.js
import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import SeriesAccordion from "../components/SeriesAccordion";
import "../styles/SeriesTracker.css";
import { useBooks } from "../context/BookContext";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAmDCvY62K-lcViWKSXm0S0MxL41xaE8oENji0lWIb73YdKLOyol557SyU4qQb6GOvo9kRQeLsSxES/pub?output=csv";

const STORAGE_KEY = "pt_series_tracker_v1";
const sortSeries = (list) => [...list].sort((a, b) => a.name.localeCompare(b.name));

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// stable id
const makeId = (seriesName, title, author) =>
  `series:${slugify(seriesName)}::${slugify(title)}${
    author ? `::${slugify(author)}` : ""
  }`;

// status → shelf
const statusToShelf = (status) => {
  switch ((status || "").toLowerCase()) {
    case "progress":
    case "inprogress":
      return "currentlyReading";
    case "done":
      return "finished";
    case "todo":
    default:
      return "tbr";
  }
};

// tracker → library object
const toLibraryBook = (seriesName, b) => ({
  id: b.id || makeId(seriesName, b.title, b.author),
  title: b.title || "",
  author: b.author || "",
  cover:
    b.cover || b.coverUrl || b.coverURL ||
    "https://via.placeholder.com/200x300?text=No+Cover",
  shelf: statusToShelf(b.status || "todo"),
  source: "seriesTracker",
  seriesName,
  totalPages: Number(b.totalPages) || 0,
  currentPage: Number(b.currentPage) || 0,
  rating: Number(b.rating || 0) || 0,
});

export default function SeriesTracker() {
  const { upsertBook, moveBookShelf } = useBooks();

  const [sheetData, setSheetData] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [notFound, setNotFound] = useState(false);

  const [manualBooks, setManualBooks] = useState([
    { title: "", author: "", cover: "", totalPages: "" },
  ]);

  // 1) load tracker UI from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSeriesList(sortSeries(JSON.parse(raw)));
    } catch (e) {
      console.warn("Failed to read series tracker storage", e);
    } finally {
      setHydrated(true);
    }
  }, []);

  // 2) load CSV
  useEffect(() => {
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      complete: (res) => {
        const rows = res.data.filter(
          (r) => r.Series && r.BookTitle && r.Series.trim() && r.BookTitle.trim()
        );
        setSheetData(rows);
      },
      error: (err) => console.error("CSV parse error:", err),
    });
  }, []);

  // 3) persist tracker UI
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seriesList));
    } catch (e) {
      console.warn("Failed to write series tracker storage", e);
    }
  }, [seriesList, hydrated]);

  // 4) suggestions
  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      setNotFound(false);
      return;
    }
    const q = search.trim().toLowerCase();
    const names = [
      ...new Set(
        sheetData
          .map((r) => r.Series)
          .filter((n) => n && n.toLowerCase().includes(q))
      ),
    ].sort((a, b) => a.localeCompare(b));
    setSuggestions(names);
    setNotFound(names.length === 0);
  }, [search, sheetData]);

  // add series from sheet
  const addSeriesFromSheet = (seriesName) => {
    const books = sheetData
      .filter((r) => r.Series?.toLowerCase() === seriesName.toLowerCase())
      .map((r) => {
        const title = r.BookTitle;
        const author = r.Author || "";
        return {
          id: makeId(seriesName, title, author), // save id on tracker book
          title,
          author,
          cover: r.CoverURL || "",
          status: "todo",
          currentPage: 0,
          totalPages: Number(r.TotalPages) || 0,
        };
      });

    if (books.length === 0) {
      setNotFound(true);
      return;
    }

    setSeriesList((prev) => {
      if (prev.some((s) => s.name.toLowerCase() === seriesName.toLowerCase()))
        return prev;
      return sortSeries([...prev, { name: seriesName, books }]);
    });

    // sync all to TBR — functional upserts will keep all of them
    books.forEach((b) => upsertBook(toLibraryBook(seriesName, b)));

    setSearch("");
    setSuggestions([]);
    setNotFound(false);
  };

  const handleAddClick = () => {
    if (!search.trim()) return;
    if (suggestions.length === 1) {
      addSeriesFromSheet(suggestions[0]);
      return;
    }
    const exact = suggestions.find(
      (s) => s.toLowerCase() === search.trim().toLowerCase()
    );
    if (exact) addSeriesFromSheet(exact);
    else setNotFound(true);
  };

  const onSuggestionClick = (name) => addSeriesFromSheet(name);

  // manual add
  const handleManualBookChange = (i, field, val) => {
    const copy = [...manualBooks];
    copy[i][field] = val;
    setManualBooks(copy);
  };

  const addManualBookRow = () =>
    setManualBooks((b) => [...b, { title: "", author: "", cover: "", totalPages: "" }]);

  const saveManualSeries = () => {
    if (!search.trim()) return;
    const seriesName = search.trim();
    const books = manualBooks
      .filter((b) => b.title.trim())
      .map((b) => ({
        id: makeId(seriesName, b.title, b.author || ""), // save id here too
        title: b.title,
        author: b.author || "",
        cover: b.cover || "",
        status: "todo",
        currentPage: 0,
        totalPages: Number(b.totalPages) || 0,
      }));
    if (books.length === 0) return;

    setSeriesList((prev) => sortSeries([...prev, { name: seriesName, books }]));

    books.forEach((b) => upsertBook(toLibraryBook(seriesName, b)));

    setManualBooks([{ title: "", author: "", cover: "", totalPages: "" }]);
    setSearch("");
    setSuggestions([]);
    setNotFound(false);
  };

  // status change → move shelves with saved id
  const handleStatusChange = (seriesName, bookIdx, nextStatus) => {
    const series = seriesList.find((x) => x.name === seriesName);
    const book = series?.books?.[bookIdx];

    if (book?.id) {
      const targetShelf = statusToShelf(nextStatus);
      moveBookShelf(book.id, targetShelf);
    }

    // update tracker UI
    setSeriesList((prev) =>
      prev.map((s) => {
        if (s.name !== seriesName) return s;
        const books = s.books.map((b, i) =>
          i !== bookIdx ? b : { ...b, status: nextStatus }
        );
        return { ...s, books };
      })
    );
  };

  const handlePageChange = (seriesName, bookIdx, field, value) => {
    const num = value === "" ? "" : Math.max(0, Number(value));
    setSeriesList((prev) =>
      prev.map((s) => {
        if (s.name !== seriesName) return s;
        const books = s.books.map((b, i) =>
          i !== bookIdx ? b : { ...b, [field]: num }
        );
        return { ...s, books };
      })
    );
  };

  const handleRemoveSeries = (seriesName) => {
    setSeriesList((prev) => sortSeries(prev.filter((s) => s.name !== seriesName)));
  };

  return (
    <div className="series-tracker">
      <div className="tracker-header">
        <h1 className="tracker-title">Series I'm Reading</h1>
      </div>

      <div className="add-series-form">
        <input
          type="text"
          className="series-search-input"
          placeholder="Search for a series..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="confirm-add-button" onClick={handleAddClick}>
          Add
        </button>

        {suggestions.length > 0 && (
          <ul className="suggestions-dropdown">
            {suggestions.map((s, i) => (
              <li key={i} onClick={() => onSuggestionClick(s)}>
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {notFound && search.trim() && suggestions.length === 0 && (
        <div className="manual-add-card">
          <div className="manual-add-header">
            Series "{search}" not found — add manually:
          </div>

          {manualBooks.map((b, i) => (
            <div key={i} className="manual-book-row">
              <input
                type="text"
                placeholder="Book title"
                value={b.title}
                onChange={(e) => handleManualBookChange(i, "title", e.target.value)}
              />
              <input
                type="text"
                placeholder="Author"
                value={b.author}
                onChange={(e) => handleManualBookChange(i, "author", e.target.value)}
              />
              <input
                type="text"
                placeholder="Cover image URL"
                value={b.cover}
                onChange={(e) => handleManualBookChange(i, "cover", e.target.value)}
              />
              <input
                type="number"
                min="0"
                placeholder="Total pages"
                value={b.totalPages}
                onChange={(e) => handleManualBookChange(i, "totalPages", e.target.value)}
              />
            </div>
          ))}

          <div className="manual-buttons">
            <button onClick={addManualBookRow}>+ Add Another Book</button>
            <button onClick={saveManualSeries}>Save Series</button>
          </div>
        </div>
      )}

      {seriesList.map((series) => (
        <SeriesAccordion
          key={series.name}
          series={series}
          onStatusChange={handleStatusChange}
          onPageChange={handlePageChange}
          onRemoveSeries={handleRemoveSeries}
        />
      ))}
    </div>
  );
}
