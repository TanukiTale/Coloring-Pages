import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface AppChromeProps {
  children: ReactNode;
}

export const AppChrome = ({ children }: AppChromeProps): JSX.Element => {
  const location = useLocation();

  return (
    <div className="app-root">
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          Coloring Quest
        </Link>
        <nav className="app-header__nav">
          <Link className={location.pathname === '/' ? 'is-active' : ''} to="/">
            Themes
          </Link>
          <Link className={location.pathname === '/gallery' ? 'is-active' : ''} to="/gallery">
            My Gallery
          </Link>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
};
