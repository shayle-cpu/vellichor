// src/components/BookCover.js
import React from 'react';
import '../styles/BookCover.css';

const BookCover = ({ book }) => {
  return (
    <div className="book-cover">
      <img src={book.thumbnail} alt={book.title} />
    </div>
  );
};

export default BookCover;
