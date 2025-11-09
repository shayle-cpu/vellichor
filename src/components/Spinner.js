import React, { useState } from 'react';
import '../styles/Spinner.css';
import wheelImage from '../assets/wheel.png';
import pointerImage from '../assets/pointer.png';

const prompts = [
  "Book with a map",
  "Cozy mystery",
  "Set by the sea",
  "Debut author",
  "Book with a flower",
  "Dark fairytale",
  "Book with a dragon",
  "Book you already own",
  "Has a dog",
  "New genre",
  "Water on the cover",
  "5-star prediction",
  "Memoir",
  "More than 500 pages",
  "Under 250 pages",
  "Based on a true story",
  "Retelling of a classic",
  "Character's name in the title",
  "Animal on the cover",
  "A banned book",
  "Illustated cover",
  "A book about books",
  "Finish a DNF",
  "Start a new series",
  "BookTok book",
  "The cover is your favorite color",
  "Involves a road trip",
  "A book of short stories",
  "Published in your birth month",
  "Orange on the cover",
  "Author you've never read",
  "Cover you don't like",
  "Fits the current season",
  "Number in the title",
  "Written by a male author",
  "Published this year",
  "Set on a different continent",
  "Title is 2 words or less",
  "Trees on the cover",
  "Set in the future",
  "Written by an author with your initials",
  "Recommended by a friend",
  "Food or drink on the cover",
  "Sports romance",
  "Multiple POVs",
  "Book with an odd number of pages",
  "Book with an even number of pages",
  "Yellow cover",
  "Red cover",
  "Green cover",
  "Award winning book",
  "Book that has a TV/movie adaptation",
  "Continue a series you started"
];

const Spinner = () => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedPrompt, setSelectedPrompt] = useState("");

  const spinWheel = () => {
    if (isSpinning) return;

    const index = Math.floor(Math.random() * prompts.length);
    const anglePerSegment = 360 / prompts.length;
    const spinAngle = 360 * 4 + (360 - index * anglePerSegment); // spin 4 times + land
    const newRotation = rotation + spinAngle;

    setIsSpinning(true);
    setRotation(newRotation);

    setTimeout(() => {
      setSelectedPrompt(prompts[index]);
      setIsSpinning(false);
    }, 3000);
  };

  return (
    <div className="spinner-container">
      <h1 className="spinner-title">Random TBR Prompt</h1>

      <div className="wheel-wrapper">
        <img src={pointerImage} alt="Pointer" className="pointer-img" />
        <div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>
          <img src={wheelImage} alt="Spinning Wheel" className="wheel-img" />
        </div>
      </div>

      {/* ✅ Move button here, with spacing wrapper */}
      <div className="spin-button-wrapper">
        <button className="spin-button" onClick={spinWheel}>
          {isSpinning ? "Spinning..." : "Spin"}
        </button>
      </div>

      {/* ✅ Keep prompt under the button */}
      {selectedPrompt && <div className="prompt-result">{selectedPrompt}</div>}
    </div>
  );
};

export default Spinner;
