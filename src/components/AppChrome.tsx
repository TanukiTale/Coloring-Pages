import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAudio } from '../audio/AudioProvider';

interface AppChromeProps {
  children: ReactNode;
}

export const AppChrome = ({ children }: AppChromeProps): JSX.Element => {
  const location = useLocation();
  const { musicMuted, effectsMuted, toggleMusicMuted, toggleEffectsMuted, setMusicTheme } = useAudio();

  useEffect(() => {
    if (location.pathname.startsWith('/paint/')) {
      // Paint route sets its own theme as soon as session data is loaded.
      return;
    }

    const themeMatch = location.pathname.match(/^\/theme\/([^/]+)/);
    if (themeMatch && themeMatch[1]) {
      setMusicTheme(decodeURIComponent(themeMatch[1]));
      return;
    }

    setMusicTheme('default');
  }, [location.pathname, setMusicTheme]);

  return (
    <div className="app-root">
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          Coloring Quest
        </Link>
        <div className="app-header__actions">
          <nav className="app-header__nav">
            <Link className={location.pathname === '/' ? 'is-active' : ''} to="/">
              Themes
            </Link>
            <Link className={location.pathname === '/gallery' ? 'is-active' : ''} to="/gallery">
              My Gallery
            </Link>
          </nav>

          <div className="app-header__audio" role="group" aria-label="Sound controls">
            <button
              type="button"
              className={`action-btn sound-toggle ${musicMuted ? 'is-off' : 'is-on'}`}
              onClick={toggleMusicMuted}
            >
              Music
            </button>
            <button
              type="button"
              className={`action-btn sound-toggle ${effectsMuted ? 'is-off' : 'is-on'}`}
              onClick={toggleEffectsMuted}
            >
              Pop
            </button>
          </div>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
};
