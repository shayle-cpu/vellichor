import React from "react";
import "../styles/ReadingGoalCandle.css";

// Put your 5 PNGs in src/assets/candles/
import candle0 from "../assets/candles/candle_0.png";
import candle1 from "../assets/candles/candle_1.png";
import candle2 from "../assets/candles/candle_2.png";
import candle3 from "../assets/candles/candle_3.png";
import candle4 from "../assets/candles/candle_4.png";

const candles = [candle0, candle1, candle2, candle3, candle4];

export default function ReadingGoalCandle({
  title = "Reading Goal",
  current = 0,
  goal = 0,
  maxHeight = 170,   // tweak candle size here only
  showFraction = true,
}) {
  const safeGoal = Math.max(0, Number(goal) || 0);
  const safeCurrent = Math.max(0, Math.min(Number(current) || 0, safeGoal));
  const pct = safeGoal ? (safeCurrent / safeGoal) * 100 : 0;

  let stage = 0;
  if (pct > 80) stage = 4;
  else if (pct > 60) stage = 3;
  else if (pct > 40) stage = 2;
  else if (pct > 20) stage = 1;

  return (
    <section className="rgc-wrap" aria-label="Reading goal">
      <h3 className="rgc-title">{title}</h3>

      <div className="rgc-candleBox" style={{ maxHeight }}>
        <img
          src={candles[stage]}
          alt={`Candle progress stage ${stage}`}
          className="rgc-candle"
          draggable="false"
        />
      </div>

      {showFraction && (
        <div className="rgc-text">
          {safeCurrent} / {safeGoal} books
        </div>
      )}
    </section>
  );
}
