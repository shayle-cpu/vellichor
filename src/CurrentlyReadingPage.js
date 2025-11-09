import React, { useState, useEffect } from 'react';
import './Bookshelf.css';

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes?q=';

function CurrentlyReading() {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState(() => {
    const stored = localStorage.getItem('currentlyReadingBooks');
    return stored ? JSON.parse(stored) : [];
  });
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    localStorage.setItem('currentlyReadingBooks', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    if (query.trim()) {
      fetch(`${GOOGLE_BOOKS_API}${encodeURIComponent(query)}&maxResults=5`)
        .then((res) => res.json())
        .then((data) => {
          if (data.items) {
            setSuggestions(data.items);
          } else {
            setSuggestions([]);
          }
        });
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const handleAdd = (book) => {
    const info = book.volumeInfo;
    const newBook = {
      id: book.id,
      title: info.title,
      author: info.authors?.[0] || 'Unknown Author',
      cover: info.imageLinks?.thumbnail || ''
    };
    if (!books.some((b) => b.id === newBook.id)) {
      setBooks([...books, newBook]);
      setQuery('');
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  };

  const handleRemove = (id) => {
    setBooks(books.filter(book => book.id !== id));
  };

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? suggestions.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      handleAdd(suggestions[selectedIndex]);
    }
  };

  return (
    <div className="bookshelf-container">
      <h1 className="bookshelf-title">Currently Reading</h1>

      <div className="search-section">
        <input
          type="text"
          placeholder="Add a book title..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className="book-input"
        />
        <button onClick={() => selectedIndex >= 0 ? handleAdd(suggestions[selectedIndex]) : null} className="add-button">
          Add
        </button>
        {suggestions.length > 0 && (
          <ul className="suggestions-dropdown">
            {suggestions.map((book, index) => (
              <li
                key={book.id}
                className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleAdd(book)}
              >
                {book.volumeInfo.title} — {book.volumeInfo.authors?.[0] || 'Unknown'}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="book-list">
        {books.map((book) => (
          <div className="book-card" key={book.id}>
            {book.cover && (
              <img src={book.cover} alt={book.title} className="book-cover" />
            )}
            <div className="book-title">{book.title}</div>
            <div className="book-author">{book.author}</div>
            <button onClick={() => handleRemove(book.id)} className="remove-button">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CurrentlyReading;
