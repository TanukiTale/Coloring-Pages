import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { themes } from '../data/library';
import { ThemeProgress } from '../models/domain';
import { getAllSessions, getThemeProgressMap, resetThemeProgressByThemeId } from '../services/storage';
import { ThemeCard } from '../components/ThemeCard';

export const ThemeSelectionPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [progressByTheme, setProgressByTheme] = useState<Record<string, ThemeProgress>>({});
  const [inProgressByTheme, setInProgressByTheme] = useState<Record<string, number>>({});
  const [pendingResetThemeId, setPendingResetThemeId] = useState<string | null>(null);

  const refreshThemeOverview = (): void => {
    setProgressByTheme(getThemeProgressMap());

    const inProgressByThemeSet = getAllSessions()
      .filter((session) => !session.completed && !session.archivedFromTheme)
      .reduce<Record<string, Set<string>>>((acc, session) => {
        const currentSet = acc[session.themeId] ?? new Set<string>();
        currentSet.add(session.pictureId);
        acc[session.themeId] = currentSet;
        return acc;
      }, {});

    const inProgressCounts = Object.entries(inProgressByThemeSet).reduce<Record<string, number>>((acc, [themeId, pictureSet]) => {
      acc[themeId] = pictureSet.size;
      return acc;
    }, {});

    setInProgressByTheme(inProgressCounts);
  };

  useEffect(() => {
    refreshThemeOverview();
  }, []);

  const pendingResetTheme = useMemo(
    () => themes.find((theme) => theme.id === pendingResetThemeId),
    [pendingResetThemeId]
  );

  const confirmThemeReset = (): void => {
    if (!pendingResetThemeId) {
      return;
    }

    resetThemeProgressByThemeId(pendingResetThemeId);
    setPendingResetThemeId(null);
    refreshThemeOverview();
  };

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
            inProgressCount={inProgressByTheme[theme.id]}
            onSelect={() => navigate(`/theme/${theme.id}`)}
            onReset={() => setPendingResetThemeId(theme.id)}
          />
        ))}
      </div>

      {pendingResetTheme ? (
        <div
          className="overlay"
          role="alertdialog"
          aria-modal="true"
          aria-label={`Reset ${pendingResetTheme.name} theme`}
          onClick={() => setPendingResetThemeId(null)}
        >
          <div className="overlay__panel theme-reset-confirm" onClick={(event) => event.stopPropagation()}>
            <h2>Reset {pendingResetTheme.name} Theme?</h2>
            <p>
              You are about to reset the entire {pendingResetTheme.name} theme, not the entire app.
            </p>
            <p>
              All images in this theme will reset, including the bonus image. The 4 base images will return to black-and-white
              line art, completion status for this theme will clear, and bonus progress will reset to 0/4 quadrants unlocked.
            </p>
            <p>The bonus image will be hidden again until all 4 base images are completed in this theme.</p>
            <p>
              Saved images in My Gallery will remain in My Gallery. Nothing will be removed from your gallery by this reset.
            </p>
            <div className="overlay__actions">
              <button className="ghost-btn" onClick={() => setPendingResetThemeId(null)}>
                Cancel
              </button>
              <button className="primary-btn danger-fill-btn" onClick={confirmThemeReset}>
                Reset Theme
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
