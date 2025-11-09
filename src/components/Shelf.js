// src/components/Shelf.js
import React from "react";
import Book from "./Book";
import "../styles/Bookshelf.css";

export default function Shelf({ title, books = [], onBookClick, onRemoveBook }) {
  return (
    <div className="shelf-container">
      <div className="shelf-label">{title}</div>

      <div className="shelf">
        {books.length === 0 ? (
          <div className="empty-shelf">No books here yet</div>
        ) : (
          books.map((book, idx) => (
            <Book
              key={book.id || idx}
              book={book}
              onClick={() => onBookClick?.(book)}
              onRemove={() => onRemoveBook?.(book)}   // ← pass the X click up
            />
          ))
        )}
      </div>
    </div>
  );
}
