import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

function Predictions() {
  const [name, setName] = useState("");
  const [prediction, setPrediction] = useState("");
  const [chapter, setChapter] = useState("");
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "predictions"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());
      setPredictions(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prediction) return;

    await addDoc(collection(db, "predictions"), {
      name: name || "Anonymous",
      prediction,
      chapter,
      timestamp: serverTimestamp(),
    });

    setName("");
    setPrediction("");
    setChapter("");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>🧠 Make a Prediction</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: "block", marginBottom: "1rem", padding: "0.5rem" }}
        />
        <input
          type="text"
          placeholder="Prediction"
          value={prediction}
          onChange={(e) => setPrediction(e.target.value)}
          required
          style={{ display: "block", marginBottom: "1rem", padding: "0.5rem" }}
        />
        <input
          type="text"
          placeholder="Chapter"
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
          style={{ display: "block", marginBottom: "1rem", padding: "0.5rem" }}
        />
        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Submit
        </button>
      </form>

      <h2>🔮 Recent Predictions</h2>
      {predictions.map((p, index) => (
        <div key={index} style={{ marginBottom: "1rem" }}>
          <em>🗣 {p.name || "Anonymous"}</em> said:
          <blockquote>{p.prediction}</blockquote>
          <small>
            Chapter {p.chapter || "?"} —{" "}
            {p.timestamp?.seconds
              ? new Date(p.timestamp.seconds * 1000).toLocaleString()
              : "Unknown time"}
          </small>
        </div>
      ))}
    </div>
  );
}

export default Predictions;
