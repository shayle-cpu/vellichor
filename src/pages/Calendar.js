// src/pages/Calendar.js
import React, { useMemo, useState } from "react";
import "../styles/Calendar.css";
import { useReadingLog } from "../context/ReadingLogContext";
import { useBooks } from "../context/BookContext";
import BookPickerModal from "../components/BookPickerModal";

// Helpers
const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function buildCalendarGrid(activeMonth) {
  // Show a 6-week grid starting on Sunday
  const firstOfMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay()); // back to Sunday

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function Calendar() {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDateKey, setModalDateKey] = useState(null);

  // coverIndexes keeps which cover index is currently shown per dateKey
  const [coverIndexes, setCoverIndexes] = useState({});

  const { logByDate, setDateBooks } = useReadingLog(); // { [dateKey]: [bookIds] }
  const { shelves } = useBooks(); // { currentlyReading:[], tbr:[], finished:[] }

  const allBooks = useMemo(() => {
    // Flatten shelves into one lookup by id for easy mapping
    const flat = {};
    ["currentlyReading", "tbr", "finished"].forEach((k) => {
      (shelves?.[k] || []).forEach((b) => {
        if (b?.id) flat[b.id] = {
          ...b,
          cover: b.cover || b.coverUrl || b.coverURL || "",
        };
      });
    });
    return flat;
  }, [shelves]);

  const gridDays = useMemo(() => buildCalendarGrid(month), [month]);

  const openPickerForKey = (dateKey) => {
    setModalDateKey(dateKey);
    setModalOpen(true);
  };

  const onSaveBooksForDay = (dateKey, pickedBookIds) => {
    setDateBooks(dateKey, pickedBookIds);
    setModalOpen(false);
  };

  const nextCover = (dateKey, total) => {
    setCoverIndexes((prev) => ({
      ...prev,
      [dateKey]: ((prev[dateKey] ?? 0) + 1) % total,
    }));
  };

  const goPrevMonth = () =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goNextMonth = () =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const isSameMonth = (d, m) => d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
  const isToday = (d) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  return (
    <div className="calendar-page">
       <header className="calendar-header">
  <button className="cal-nav" onClick={goPrevMonth} aria-label="Previous month">‹</button>
  <div className="calendar-month">
    {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
  </div>
  <button className="cal-nav" onClick={goNextMonth} aria-label="Next month">›</button>
</header>



      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="cal-dow">{d}</div>
        ))}

        {gridDays.map((d) => {
          const dk = toKey(d);
          const bookIds = logByDate[dk] || [];
          const dayBooks = bookIds.map((id) => allBooks[id]).filter(Boolean);
          const showIdx = coverIndexes[dk] ?? 0;

          return (
            <div
              key={dk}
              className={[
                "cal-cell",
                isSameMonth(d, month) ? "" : "cal-cell--faded",
                isToday(d) ? "cal-cell--today" : "",
              ].join(" ")}
              onClick={() => openPickerForKey(dk)}
            >
              <div className="cal-date">{d.getDate()}</div>

              {/* Cover stack area. Clicking it cycles covers without opening modal */}
              {dayBooks.length > 0 && (
                <div
                  className="cover-stack"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dayBooks.length > 1) nextCover(dk, dayBooks.length);
                  }}
                  role="button"
                  aria-label={
                    dayBooks.length > 1
                      ? `Cycle through ${dayBooks.length} books logged`
                      : `Book logged`
                  }
                  title={
                    dayBooks.length > 1
                      ? "Click to cycle covers"
                      : dayBooks[0]?.title || "Book"
                  }
                >
                  {/* Bottom ghost layers for “stacked” look (up to 2) */}
                  {dayBooks.length > 1 && (
                    <>
                      <img
                        className="cover-thumb cover-thumb--ghost cover-thumb--g1"
                        src={dayBooks[(showIdx + 1) % dayBooks.length]?.cover}
                        alt=""
                        draggable="false"
                      />
                      {dayBooks.length > 2 && (
                        <img
                          className="cover-thumb cover-thumb--ghost cover-thumb--g2"
                          src={dayBooks[(showIdx + 2) % dayBooks.length]?.cover}
                          alt=""
                          draggable="false"
                        />
                      )}
                    </>
                  )}

                  {/* Top visible cover */}
                  <img
                    className="cover-thumb"
                    src={dayBooks[showIdx]?.cover}
                    alt={dayBooks[showIdx]?.title || "Book cover"}
                    draggable="false"
                  />

                  {/* Count badge */}
                  {dayBooks.length > 1 && (
                    <div className="cover-count" aria-hidden="true">
                      {dayBooks.length}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Book Picker Modal */}
      <BookPickerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        // Provide currently selected bookIds for that day
        selectedIds={modalDateKey ? (logByDate[modalDateKey] || []) : []}
        onSave={(ids) => onSaveBooksForDay(modalDateKey, ids)}
      />
    </div>
  );
}
