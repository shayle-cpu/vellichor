// src/components/Library.js
import React from "react";
import { useBooks } from "../context/BookContext";
import Shelf from "./Shelf";

export default function Library() {
  const { shelves } = useBooks(); // ← read the real shelf state

  const cr = shelves.currentlyReading || [];
  const tbr = shelves.tbr || [];
  const fin = shelves.finished || [];

  return (
    <div className="library">
      <Shelf title="TBR" books={tbr} />
      <Shelf title="Currently Reading" books={cr} />
      <Shelf title="Finished" books={fin} />
    </div>
  );
}
