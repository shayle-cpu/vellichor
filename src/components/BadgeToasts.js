import React from "react";
import { getBadgeMeta } from "../context/AchievementsContext";
import "../styles/BadgeToasts.css";

export default function BadgeToasts({ queue = [], onDequeue }) {
  const [visible, setVisible] = React.useState(null);

  React.useEffect(() => {
    if (visible || queue.length === 0) return;
    const next = queue[0];
    setVisible(next);
    const timer = setTimeout(() => {
      setVisible(null);
      onDequeue?.(next);
    }, 3000);
    return () => clearTimeout(timer);
  }, [queue, visible, onDequeue]);

  if (!visible) return null;
  const meta = getBadgeMeta(visible);

  const dismissNow = () => {
    const id = visible;
    setVisible(null);
    onDequeue?.(id);
  };

  return (
    <div className="badge-toast" onClick={dismissNow} role="status" aria-live="polite">
      <div className="badge-icon" aria-hidden="true" />
      <div className="badge-text">
        <div className="badge-title">{meta.name}</div>
        <div className="badge-desc">{meta.desc}</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Click to dismiss</div>
      </div>
    </div>
  );
}
