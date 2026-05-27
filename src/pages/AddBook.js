import React, { useState } from "react";
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

  // Fetch books from Google Books API
  const fetchBooks = async (search) => {
    if (!search?.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      setSearchError("");
      const res = await fetch(buildGoogleBooksUrl(search));
      const data = await res.json();

      if (!res.ok) {
        setSuggestions([]);
        setSearchError(data?.error?.message || "Book search failed.");
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
        setSuggestions(normalized);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Error fetching books:", err);
      setSuggestions([]);
      setSearchError("Unable to reach Google Books. Please try again.");
    }
  };

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
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            fetchBooks(val);
          }}
        />
      </div>

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
