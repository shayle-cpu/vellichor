import React, { useState } from 'react';
import '../styles/SearchBar.css';
import { useLibrary } from '../context/LibraryContext';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const { addBookToShelf } = useLibrary();

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 2) {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${value}`);
      const data = await res.json();
      const suggestions = data.items?.map((item) => ({
        title: item.volumeInfo.title,
        cover: item.volumeInfo.imageLinks?.thumbnail || '',
      })) || [];
      setSuggestions(suggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (book) => {
    addBookToShelf(book);
    setQuery('');
    setSuggestions([]);
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search for a book…"
        value={query}
        onChange={handleInputChange}
      />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((book, index) => (
            <li key={index} onClick={() => handleSelect(book)}>
              {book.cover && <img src={book.cover} alt={book.title} />}
              <span>{book.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
