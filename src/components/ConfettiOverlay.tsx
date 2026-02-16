import { useMemo } from 'react';

const confettiColors = ['#ff5f5f', '#ffb347', '#ffe66e', '#8be07f', '#78d6ff', '#b999ff', '#ff92cf'];

export const ConfettiOverlay = (): JSX.Element => {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }).map((_, index) => ({
        id: index,
        left: `${(index * 19) % 100}%`,
        delay: `${(index % 8) * 0.12}s`,
        duration: `${2.4 + (index % 6) * 0.25}s`,
        rotate: `${(index * 37) % 360}deg`,
        color: confettiColors[index % confettiColors.length],
      })),
    []
  );

  return (
    <div className="confetti-layer" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-layer__piece"
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            transform: `rotate(${piece.rotate})`,
            backgroundColor: piece.color,
          }}
        />
      ))}
    </div>
  );
};
