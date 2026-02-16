import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppChrome } from './components/AppChrome';
import { ThemeSelectionPage } from './pages/ThemeSelectionPage';
import { ThemeGalleryPage } from './pages/ThemeGalleryPage';
import { DifficultyPage } from './pages/DifficultyPage';
import { PaintPage } from './pages/PaintPage';
import { MyGalleryPage } from './pages/MyGalleryPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App = (): JSX.Element => (
  <BrowserRouter>
    <AppChrome>
      <Routes>
        <Route path="/" element={<ThemeSelectionPage />} />
        <Route path="/theme/:themeId" element={<ThemeGalleryPage />} />
        <Route path="/theme/:themeId/pick" element={<DifficultyPage />} />
        <Route path="/paint/:sessionId" element={<PaintPage />} />
        <Route path="/gallery" element={<MyGalleryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppChrome>
  </BrowserRouter>
);

export default App;
