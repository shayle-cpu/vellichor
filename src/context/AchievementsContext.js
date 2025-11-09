// src/context/AchievementsContext.js
import React from "react";
import { useBooks } from "./BookContext";
import { getHistory } from "../utils/history";
import {
  BADGES,
  evaluateAchievements,
  loadEarned,
  saveEarned,
  setAchievementsEpochNow, // reset from NOW
} from "../utils/achievementsUtils";
import BadgeToasts from "../components/BadgeToasts";

const AchievementsContext = React.createContext({
  earned: [],
  newlyEarned: [],
  earnedDates: {},
  resetAchievements: () => {},
});

const DATES_STORAGE_KEY = "pt_achievements_dates_v1";

export function AchievementsProvider({ children }) {
  const { shelves } = useBooks();

  const [earned, setEarned] = React.useState(() => loadEarned().earned || []);
  const [queue, setQueue] = React.useState([]); // toast queue
  const [earnedDates, setEarnedDates] = React.useState(() => {
    try {
      const raw = localStorage.getItem(DATES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const persistDates = React.useCallback((next) => {
    setEarnedDates(next);
    try {
      localStorage.setItem(DATES_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const enqueue = React.useCallback((ids) => {
    setQueue((q) => {
      const have = new Set(q);
      const add = ids.filter((id) => !have.has(id));
      return add.length ? [...q, ...add] : q;
    });
  }, []);

  // Reset: clear earned, dates, toasts; set epoch to NOW
  const resetAchievements = React.useCallback(() => {
    setEarned([]);
    saveEarned([]);
    persistDates({});
    try {
      localStorage.removeItem(DATES_STORAGE_KEY);
    } catch {}
    setAchievementsEpochNow();
    setQueue([]);
  }, [persistDates]);

  // Re-evaluate whenever shelves or history change
  React.useEffect(() => {
    const history = getHistory();
    const nowEarned = evaluateAchievements({ shelves, history });
    const prev = new Set(earned);
    const newOnes = nowEarned.filter((id) => !prev.has(id));

    if (newOnes.length) {
      const merged = Array.from(new Set([...earned, ...newOnes]));
      setEarned(merged);
      saveEarned(merged);

      const nowIso = new Date().toISOString();
      const nextDates = { ...earnedDates };
      for (const id of newOnes) if (!nextDates[id]) nextDates[id] = nowIso;
      persistDates(nextDates);

      enqueue(newOnes);
    }
  }, [shelves, earned, earnedDates, enqueue, persistDates]);

  // Optional: light polling for history-only changes
  React.useEffect(() => {
    const t = setInterval(() => {
      const history = getHistory();
      const nowEarned = evaluateAchievements({ shelves, history });
      const prev = new Set(earned);
      const newOnes = nowEarned.filter((id) => !prev.has(id));

      if (newOnes.length) {
        const merged = Array.from(new Set([...earned, ...newOnes]));
        setEarned(merged);
        saveEarned(merged);

        const nowIso = new Date().toISOString();
        const nextDates = { ...earnedDates };
        for (const id of newOnes) if (!nextDates[id]) nextDates[id] = nowIso;
        persistDates(nextDates);

        enqueue(newOnes);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [earned, shelves, earnedDates, enqueue, persistDates]);

  const value = React.useMemo(
    () => ({ earned, newlyEarned: queue, earnedDates, resetAchievements }),
    [earned, queue, earnedDates, resetAchievements]
  );

  return (
    <AchievementsContext.Provider value={value}>
      {children}
      <BadgeToasts
        queue={queue}
        onDequeue={(id) => setQueue((q) => q.filter((x) => x !== id))}
      />
    </AchievementsContext.Provider>
  );
}

export function useAchievements() {
  return React.useContext(AchievementsContext);
}

export function getBadgeMeta(id) {
  return BADGES.find((b) => b.id === id) || { id, name: id, desc: "" };
}
