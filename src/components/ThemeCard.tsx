import type { CSSProperties } from 'react';
import { Theme, ThemeProgress } from '../models/domain';

interface ThemeCardProps {
  theme: Theme;
  progress?: ThemeProgress;
  inProgressCount?: number;
  onSelect: () => void;
  onReset: () => void;
}

export const ThemeCard = ({ theme, progress, inProgressCount = 0, onSelect, onReset }: ThemeCardProps): JSX.Element => {
  const unlockedText = progress?.bonusUnlocked ? 'Bonus unlocked' : `${progress?.unlockedQuadrants ?? 0}/4 bonus reveals`;
  const inProgressText = inProgressCount > 0 ? ` | ${inProgressCount} in progress` : '';

  return (
    <article className="theme-card" style={{ '--theme-accent': theme.accentColor } as CSSProperties}>
      <button className="theme-card__select" onClick={onSelect}>
        <img src={theme.coverAsset} alt={theme.name} className="theme-card__image" />
        <span className="theme-card__name">{theme.name}</span>
        <span className="theme-card__desc">{theme.description}</span>
      </button>

      <div className="theme-card__footer">
        <span className="theme-card__progress">{`${unlockedText}${inProgressText}`}</span>
        <a
          className="theme-card__reset-link"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            onReset();
          }}
        >
          Reset theme
        </a>
      </div>
    </article>
  );
};
