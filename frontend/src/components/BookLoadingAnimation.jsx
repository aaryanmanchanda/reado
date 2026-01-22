import React, { useState, useEffect } from 'react';

const loadingMessages = [
  "Analyzing your recent bookmarks...",
  "Scanning your reading preferences...",
  "Discovering hidden literary gems...",
  "Curating personalized recommendations...",
  "Exploring the bookshelf universe...",
  "Matching your reading style...",
  "Finding your next favorite read...",
  "Consulting the book oracle...",
  "Browsing through endless pages...",
  "Connecting the dots between books...",
];

const BookLoadingAnimation = ({ messageIndex = 0 }) => {
  const [bookRotation, setBookRotation] = useState(0);
  const [bookScale, setBookScale] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setBookRotation(prev => (prev + 15) % 360);
      setBookScale(prev => prev === 1 ? 1.1 : 1);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      padding: '2rem',
    }}>
      {/* Animated book icon */}
      <div
        style={{
          fontSize: '4rem',
          transform: `rotate(${bookRotation}deg) scale(${bookScale})`,
          transition: 'transform 0.2s ease-in-out',
          display: 'inline-block',
          animation: 'bookBounce 1.5s ease-in-out infinite',
        }}
      >
        📚
      </div>
      {/* Loading message */}
      <div style={{
        color: 'var(--accent)',
        fontWeight: 600,
        fontSize: '1.1rem',
        textAlign: 'center',
        animation: 'fadeInOut 2s ease-in-out infinite',
      }}>
        {loadingMessages[messageIndex % loadingMessages.length]}
      </div>
      {/* Loading dots */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent)',
              animation: `pulse 1.4s ease-in-out infinite ${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes bookBounce {
          0%, 100% {
            transform: translateY(0) rotate(${bookRotation}deg) scale(${bookScale});
          }
          50% {
            transform: translateY(-10px) rotate(${bookRotation + 5}deg) scale(${bookScale * 1.05});
          }
        }
        @keyframes fadeInOut {
          0%, 100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default BookLoadingAnimation;
export { loadingMessages };
