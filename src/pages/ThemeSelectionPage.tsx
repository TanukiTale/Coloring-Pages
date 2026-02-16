import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { themes } from '../data/library';
import { ThemeProgress } from '../models/domain';
import { getThemeProgressMap } from '../services/storage';
import { ThemeCard } from '../components/ThemeCard';

export const ThemeSelectionPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [progressByTheme, setProgressByTheme] = useState<Record<string, ThemeProgress>>({});

  useEffect(() => {
    setProgressByTheme(getThemeProgressMap());
  }, []);

  return (
    <section className="screen">
      <div className="screen__head">
        <h1>Choose Your Theme</h1>
        <p>Pick a world, paint 4 regular pictures, and unlock a bonus masterpiece.</p>
      </div>

      <div className="theme-grid">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            progress={progressByTheme[theme.id]}
            onSelect={() => navigate(`/theme/${theme.id}`)}
          />
        ))}
      </div>
    </section>
  );
};
