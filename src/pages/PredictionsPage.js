// src/pages/PredictionsPage.js
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import "../styles/Predictions.css";

export default function PredictionsPage() {
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState([]);

  // form
  const [bookTitle, setBookTitle] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [chapter, setChapter] = useState("");
  const [prediction, setPrediction] = useState("");

  // session
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const id = data?.session?.user?.id || null;
      if (alive) setUid(id);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // initial load + fine-grained realtime (INSERT / UPDATE / DELETE)
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (!error && alive) setList(data || []);
      setLoading(false);
    })();

    const chan = supabase.channel(`predictions:${uid}`);

    // INSERT: prepend, but avoid duplicates by id
    chan.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "predictions", filter: `user_id=eq.${uid}` },
      (payload) => {
        const row = payload.new;
        setList((cur) => {
          const withoutDup = cur.filter((r) => r.id !== row.id);
          return [row, ...withoutDup].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        });
      }
    );

    // UPDATE: merge in place
    chan.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "predictions", filter: `user_id=eq.${uid}` },
      (payload) => {
        const row = payload.new;
        setList((cur) =>
          cur
            .map((r) => (r.id === row.id ? { ...r, ...row } : r))
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        );
      }
    );

    // DELETE: remove by id
    chan.on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "predictions", filter: `user_id=eq.${uid}` },
      (payload) => {
        const row = payload.old;
        setList((cur) => cur.filter((r) => r.id !== row.id));
      }
    );

    chan.subscribe();

    return () => {
      supabase.removeChannel(chan);
    };
  }, [uid]);

  const pending = useMemo(() => list.filter((p) => p.status === "pending"), [list]);
  const resolved = useMemo(() => list.filter((p) => p.status !== "pending"), [list]);

  // create
  const submit = async (e) => {
    e.preventDefault();
    if (!uid) return alert("Please sign in.");

    const title = bookTitle.trim();
    const pred = prediction.trim();
    const chap = chapter.trim();
    const page = pageNumber ? Number(pageNumber) : null;

    if (!title || !pred) return alert("Please enter a book title and a prediction.");

    setSaving(true);

    const payload = {
      user_id: uid,
      book_title: title,
      prediction: pred,
      page_number: Number.isFinite(page) ? page : null,
      chapter: chap || null,
      status: "pending",
    };

    // Optimistic insert WITHOUT fake id (UUID-safe)
    const temp = {
      localOnly: true,
      created_at: new Date().toISOString(),
      resolved_at: null,
      ...payload,
    };
    setList((cur) => [temp, ...cur]);

    // Insert and immediately fetch the real row so we can replace the temp one
    const { data, error } = await supabase
      .from("predictions")
      .insert(payload)
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      // revert optimistic
      setList((cur) => cur.filter((r) => r !== temp));
      alert(error.message);
      return;
    }

    // Replace temp with real row (realtime INSERT may also arrive; the dedupe in the handler prevents duplicates)
    setList((cur) => [data, ...cur.filter((r) => r !== temp)]);

    setBookTitle("");
    setPageNumber("");
    setChapter("");
    setPrediction("");
  };

  // update
  const mark = async (id, nextStatus) => {
    setList((cur) =>
      cur.map((r) =>
        r.id === id
          ? {
              ...r,
              status: nextStatus,
              resolved_at: nextStatus === "pending" ? null : new Date().toISOString(),
            }
          : r
      )
    );
    const { error } = await supabase
      .from("predictions")
      .update({
        status: nextStatus,
        resolved_at: nextStatus === "pending" ? null : new Date().toISOString(),
      })
      .eq("id", id);
    if (error) alert(error.message);
  };

  // delete
  const remove = async (id) => {
    if (!window.confirm("Delete this prediction?")) return;
    const prev = list;
    setList((cur) => cur.filter((r) => r.id !== id));
    const { error } = await supabase.from("predictions").delete().eq("id", id);
    if (error) {
      alert(error.message);
      setList(prev);
    }
  };

  if (!uid) {
    return (
      <div className="predictions-page">
        <h1 className="predictions-title">Predictions</h1>
        <p className="predictions-note">Please sign in to make and track your predictions.</p>
      </div>
    );
  }

  return (
    <div className="predictions-page">
      <h1 className="predictions-title">Predictions</h1>

      <form className="predictions-form" onSubmit={submit}>
        <div className="row">
          <label className="field">
            <span className="label">Book title *</span>
            <input
              className="input"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="A Court of Thorns and Roses"
              required
            />
          </label>

          <label className="field field--sm">
            <span className="label">Page</span>
            <input
              className="input"
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value.replace(/\D+/g, ""))}
              inputMode="numeric"
              placeholder="123"
            />
          </label>

          <label className="field field--sm">
            <span className="label">Chapter</span>
            <input
              className="input"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="18"
            />
          </label>
        </div>

        <label className="field">
          <span className="label">Your prediction *</span>
          <textarea
            className="textarea"
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            placeholder="I think Rhysand will..."
            rows={6}
            required
          />
        </label>

        <div className="form-actions">
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save prediction"}
          </button>
        </div>
      </form>

      <section>
        <h2 className="section-head">Pending</h2>
        {loading ? (
          <div className="muted">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="muted">No pending predictions yet.</div>
        ) : (
          <ul className="cards">
            {pending.map((p) => (
              <li className="card" key={p.id ?? p.created_at}>
                <div className="card-head">
                  <div className="card-title">
                    <div className="book">{p.book_title}</div>
                    <div className="meta">
                      {p.page_number ? `Page ${p.page_number}` : ""}
                      {p.page_number && p.chapter ? " • " : ""}
                      {p.chapter ? `Ch. ${p.chapter}` : ""}
                      {!p.page_number && !p.chapter ? "—" : ""}
                    </div>
                  </div>
                  <span className="badge pending">Pending</span>
                </div>

                <div className="pred">{p.prediction}</div>
                <div className="actions">
                  <button className="btn ghost subtle" onClick={() => mark(p.id, "correct")}>
                    Mark Correct
                  </button>
                  <button className="btn ghost subtle" onClick={() => mark(p.id, "incorrect")}>
                    Mark Incorrect
                  </button>
                  <button className="btn ghost danger-outline" onClick={() => remove(p.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-head">Resolved</h2>
        {resolved.length === 0 ? (
          <div className="muted">Nothing resolved yet.</div>
        ) : (
          <ul className="cards">
            {resolved.map((p) => (
              <li className={`card ${p.status}`} key={p.id}>
                <div className="card-head">
                  <div className="card-title">
                    <div className="book">{p.book_title}</div>
                    <div className="meta">
                      {p.page_number ? `Page ${p.page_number}` : ""}
                      {p.page_number && p.chapter ? " • " : ""}
                      {p.chapter ? `Ch. ${p.chapter}` : ""}
                      {!p.page_number && !p.chapter ? "—" : ""}
                    </div>
                  </div>

                  <span className={`badge ${p.status}`}>
                    {p.status === "correct" ? "Correct" : "Incorrect"}
                  </span>
                </div>

                <div className="pred">{p.prediction}</div>

                <div className="actions">
                  <button className="btn ghost subtle" onClick={() => mark(p.id, "pending")}>
                    Move back to Pending
                  </button>
                  <button className="btn ghost danger-outline" onClick={() => remove(p.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
