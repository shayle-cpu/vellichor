import React, { useState, useCallback } from "react";

const STAR_SIZE = 40; // bigger stars
const GAP = 1;        // closer spacing
const EPS = 1e-9;     // tolerance for comparing numbers

const Star = ({ fill = "empty", onMouseMove, onMouseLeave, onClick, ariaLabel }) => {
  return (
    <span
      role="radio"
      aria-checked={fill === "full"}
      tabIndex={0}
      aria-label={ariaLabel}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick(e);
      }}
      style={{
        cursor: "pointer",
        display: "inline-block",
        width: STAR_SIZE,
        height: STAR_SIZE,
        position: "relative",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={STAR_SIZE}
        height={STAR_SIZE}
        fill={
          fill === "full"
            ? "#cb997e"
            : fill === "empty"
            ? "none"
            : "url(#halfGrad)"
        }
        stroke={fill === "empty" ? "#b7b7a4" : "none"}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          <linearGradient id="halfGrad">
            <stop offset="50%" stopColor="#cb997e" />
            <stop offset="50%" stopColor="#f5e9da" />
          </linearGradient>
        </defs>
        {/* Star shape with medium-point tips */}
        <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.5 1.1 6.4-5.8-3.1-5.8 3.1 1.1-6.4-4.7-4.5 6.5-.9L12 2.5z" />
      </svg>
    </span>
  );
};

export default function StarRating({
  value = 0,
  onChange,
  allowHalf = true,
  ariaLabel = "Rating",
}) {
  const [hoverValue, setHoverValue] = useState(null);

  const getPointerValue = useCallback(
    (event, index) => {
      if (!allowHalf) return index;
      const { left, width } = event.currentTarget.getBoundingClientRect();
      const isHalf = event.clientX - left < width / 2;
      return isHalf ? index - 0.5 : index;
    },
    [allowHalf]
  );

  const handleMouseMove = useCallback(
    (event, index) => {
      setHoverValue(getPointerValue(event, index));
    },
    [getPointerValue]
  );

  const handleMouseLeave = () => setHoverValue(null);

  const handleClick = (event, index) => {
    const clicked = getPointerValue(event, index);
    const current = Number(value) || 0;

    if (Math.abs(current - clicked) < EPS) {
      onChange(0); // reset
      setHoverValue(null); // clear hover immediately
    } else {
      onChange(clicked);
      setHoverValue(clicked);
    }
  };

  const displayValue = hoverValue !== null ? hoverValue : value;

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    let fill = "empty";
    if (displayValue >= i) fill = "full";
    else if (allowHalf && displayValue + 0.5 >= i) fill = "half";

    stars.push(
      <Star
        key={i}
        fill={fill}
        ariaLabel={`${ariaLabel} ${i}${fill === "half" ? " half" : ""} star`}
        onMouseMove={(e) => handleMouseMove(e, i)}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => handleClick(e, i)}
      />
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ display: "inline-flex", gap: GAP, userSelect: "none" }}
    >
      {stars}
    </div>
  );
}
