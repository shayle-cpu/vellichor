import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooks } from "../context/BookContext";
import "../styles/AddBook.css";

const ensureHttps = (url) => (url ? url.replace(/^http:/, "https:") : url);
const GOOGLE_BOOKS_KEY =
  process.env.REACT_APP_GOOGLE_BOOKS_API_KEY ||
  (typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_GOOGLE_BOOKS_API_KEY
    : undefined);

const buildGoogleBooksUrl = (search) => {
  const params = new URLSearchParams({
    q: search,
    maxResults: "12",
  });

  if (GOOGLE_BOOKS_KEY) {
    params.set("key", GOOGLE_BOOKS_KEY);
  }

  return `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
};

export default function AddBook() {
  const navigate = useNavigate();
  const { upsertBook } = useBooks();

  const [shelf, setShelf] = useState("tbr");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef(new Map());
  const inFlightRef = useRef(new Map());
  const activeRequestRef = useRef("");

  // Fetch books from Google Books API
  const fetchBooks = async (search) => {
    const normalizedQuery = search?.trim();

    if (!normalizedQuery || normalizedQuery.length < 3) {
      setSuggestions([]);
      setSearchError("");
      setIsLoading(false);
      return;
    }

    if (cacheRef.current.has(normalizedQuery)) {
      setSuggestions(cacheRef.current.get(normalizedQuery));
      setSearchError("");
      setIsLoading(false);
      return;
    }

    if (inFlightRef.current.has(normalizedQuery)) {
      setIsLoading(true);
      return;
    }

    try {
      setSearchError("");
      setIsLoading(true);
      activeRequestRef.current = normalizedQuery;

      const request = fetch(buildGoogleBooksUrl(normalizedQuery));
      inFlightRef.current.set(normalizedQuery, request);
      const res = await request;
      const data = await res.json();
      inFlightRef.current.delete(normalizedQuery);

      if (activeRequestRef.current !== normalizedQuery) {
        return;
      }

      if (!res.ok) {
        setSuggestions([]);
        setSearchError(
          data?.error?.message ||
            "Book search is temporarily unavailable. Please try again in a moment."
        );
        return;
      }

      if (data.items) {
        const normalized = data.items.map((item) => {
          const v = item.volumeInfo || {};
          const thumb =
            ensureHttps(v.imageLinks?.thumbnail) ||
            ensureHttps(v.imageLinks?.smallThumbnail) ||
            "https://via.placeholder.com/128x193?text=No+Cover";

          return {
            id: item.id,
            title: v.title || "Untitled",
            author: (v.authors && v.authors[0]) || "Unknown Author",
            series: "",
            cover: thumb,
            pageCount: Number(v.pageCount) || 0, // renamed here
          };
        });
        cacheRef.current.set(normalizedQuery, normalized);
        setSuggestions(normalized);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Error fetching books:", err);
      setSuggestions([]);
      setSearchError("Unable to reach Google Books. Please try again shortly.");
      inFlightRef.current.delete(normalizedQuery);
    } finally {
      if (activeRequestRef.current === normalizedQuery) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks(query);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // When user selects a book, save it to shelf
  const handleSelectBook = (book) => {
    upsertBook({
      ...book,
      shelf,
      rating: 0,
      currentPage: 0,
    });
    navigate("/");
  };

  return (
    <div className="add-book-page">
      <h1>Add a Book</h1>

      <div className="select-input-container">
        <div className="shelf-selection">
          <label className="shelf-label">Choose a shelf:</label>
          <select
            id="shelf"
            value={shelf}
            onChange={(e) => setShelf(e.target.value)}
          >
            <option value="currentlyReading">Currently Reading</option>
            <option value="tbr">TBR</option>
            <option value="finished">Finished</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Search by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.trim().length > 0 && query.trim().length < 3 && (
        <p className="search-error">Type at least 3 characters to search.</p>
      )}
      {isLoading && <p>Searching books...</p>}
      {!isLoading && !searchError && query.trim().length >= 3 && suggestions.length === 0 && (
        <p>No books found for "{query.trim()}".</p>
      )}

      <ul className="suggestions-list">
        {suggestions.map((book) => (
          <li key={book.id} onClick={() => handleSelectBook(book)}>
            <img
              src={book.cover}
              alt={book.title}
              style={{
                width: "50px",
                height: "75px",
                objectFit: "cover",
                borderRadius: "6px",
                marginRight: "10px",
              }}
            />
            <div>
              <strong>{book.title}</strong>
              <br />
              <span>{book.author}</span>
            </div>
          </li>
        ))}
      </ul>
      {searchError && <p className="search-error">{searchError}</p>}
    </div>
  );
}
