// src/pages/BookshelfSelector.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/BookshelfSelector.css';

const BookshelfSelector = () => {
  const navigate = useNavigate();

  const goToBookshelf = () => {
    navigate('/bookshelf');
  };

  return (
    <div className="selector-container">
      <h1 className="selector-title">My Library</h1>
      <button className="selector-button" onClick={goToBookshelf}>
        Go to Bookshelves
      </button>
    </div>
  );
};

export default BookshelfSelector;
