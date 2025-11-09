// src/context/LibraryContext.js
import React, { createContext, useContext, useState } from 'react';

const LibraryContext = createContext();

export const LibraryProvider = ({ children }) => {
  const [booksByShelf, setBooksByShelf] = useState({
    'Currently Reading': [],
    TBR: [],
    Finished: [],
  });

  const addBookToShelf = (shelf, book) => {
    setBooksByShelf(prev => ({
      ...prev,
      [shelf]: [...(prev[shelf] || []), book],
    }));
  };

  return (
    <LibraryContext.Provider value={{ booksByShelf, addBookToShelf }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => useContext(LibraryContext);
