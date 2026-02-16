import type { CSSProperties } from 'react';
import { Theme, ThemeProgress } from '../models/domain';

interface ThemeCardProps {
  theme: Theme;
  progress?: ThemeProgress;
  onSelect: () => void;
}

export const ThemeCard = ({ theme, progress, onSelect }: ThemeCardProps): JSX.Element => {
  const unlockedText = progress?.bonusUnlocked ? 'Bonus unlocked' : `${progress?.unlockedQuadrants ?? 0}/4 bonus reveals`;

  return (
    <button className="theme-card" onClick={onSelect} style={{ '--theme-accent': theme.accentColor } as CSSProperties}>
      <img src={theme.coverAsset} alt={theme.name} className="theme-card__image" />
      <span className="theme-card__name">{theme.name}</span>
      <span className="theme-card__desc">{theme.description}</span>
      <span className="theme-card__progress">{unlockedText}</span>
    </button>
  );
};
