import React, { useState, useEffect } from "react";
// This CSS file is CRUCIAL for the text itself to be a gradient.
// Tailwind does not have direct utilities for background-clip: text;
import "../GradientText.css"; 

export default function FadingGradientText({
  texts = [  "Digitilized.",
    "Simplified.",
    "Scalable.",
  ], // A list of texts to cycle through
  colors = ["#363478", "#683089", "#BE3E2F", "#F4811A", "#FDC005"],
  animationSpeed = 8, // Speed for the gradient's background animation
  fadeDuration = 400, // Duration of the fade-in/out transition in milliseconds
  interval = 1000, // How long each text stays visible before fading out (in milliseconds)
  showBorder = false,
  className = "",
}) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [displayText, setDisplayText] = useState(texts[0]);

  // This style object applies the linear gradient and its animation duration.
  // It will be picked up by the '.text-content' class's `background-image`
  // property in GradientText.css.
  const gradientBackgroundStyle = {
    backgroundImage: `linear-gradient(to right, ${colors.join(", ")})`,
    animationDuration: `${animationSpeed}s`,
  };

  useEffect(() => {
    if (texts.length === 0) {
      setDisplayText(""); // Clear text if no texts are provided
      return;
    }

    // Set a timer to start fading out
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true); 
    }, interval); 

    // After fade-out is complete (interval + fadeDuration),
    // update the text and trigger the fade-in for the new text.
    const textChangeTimer = setTimeout(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
      setIsFadingOut(false); // Prepare for fade-in of new text
    }, interval + fadeDuration); 

    // Cleanup timers when component unmounts or dependencies change
    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(textChangeTimer);
    };
  }, [currentTextIndex, texts, interval, fadeDuration]);

  // Update `displayText` only when we are about to fade in, 
  // ensuring the new text appears after the old one has faded out.
  useEffect(() => {
    if (!isFadingOut && texts.length > 0) {
      setDisplayText(texts[currentTextIndex]);
    }
  }, [currentTextIndex, isFadingOut, texts]);


  return (
    <div className={`animated-gradient-text ${className} relative inline-block overflow-hidden`}>
      {showBorder && (
        <div 
          className="gradient-overlay absolute inset-0 z-10" 
          style={gradientBackgroundStyle} // This applies the gradient to the background overlay
        ></div>
      )}
      <div
        // The `text-content` class (from GradientText.css) is vital for the gradient text effect.
        // Tailwind classes handle the fading effect.
        className={`text-content z-20 
                    ${isFadingOut ? "opacity-0" : "opacity-100"} 
                    transition-opacity duration-[${fadeDuration}ms] ease-in-out`}
        // Apply the gradient `backgroundImage` and `animationDuration` directly here
        // as the `text-content` class in `GradientText.css` expects it.
        style={gradientBackgroundStyle}
      >
        {displayText}
      </div>
    </div>
  );
}