// src/context/library.js
import React, { createContext, useContext, useMemo } from "react";
import { useBooks } from "./BookContext";

const LibraryContext = createContext();

const titleToKey = {
  "Currently Reading": "currentlyReading",
  TBR: "tbr",
  Finished: "finished",
};
const keyToTitle = {
  currentlyReading: "Currently Reading",
  tbr: "TBR",
  finished: "Finished",
};

export const LibraryProvider = ({ children }) => {
  const { shelves, upsertBook } = useBooks();

  const booksByShelf = useMemo(
    () => ({
      "Currently Reading": shelves?.currentlyReading || [],
      TBR: shelves?.tbr || [],
      Finished: shelves?.finished || [],
    }),
    [shelves]
  );

  const addBook = (shelfTitle, book) => {
    const shelfKey = titleToKey[shelfTitle] || "tbr";
    const safeId =
      book?.id ||
      `lib:${(book?.title || "untitled")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}::${Date.now()}`;
    upsertBook({ ...book, id: safeId, shelf: shelfKey });
  };

  const moveBook = (book, nextShelfTitle) => {
    addBook(nextShelfTitle, { ...book, id: book.id });
  };

  return (
    <LibraryContext.Provider
      value={{ booksByShelf, addBook, moveBook, keyToTitle, titleToKey }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => useContext(LibraryContext);
