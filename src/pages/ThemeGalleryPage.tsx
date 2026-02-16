import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getThemeById, getThemeBonusPicture, getThemeRegularPictures } from '../data/library';
import { Picture } from '../models/domain';
import { getThemeProgressByThemeId } from '../services/storage';
import { takeRandom } from '../utils/random';
import { PictureCard } from '../components/PictureCard';

const SET_SIZE = 3;

export const ThemeGalleryPage = (): JSX.Element => {
  const { themeId } = useParams<{ themeId: string }>();
  const navigate = useNavigate();

  const theme = useMemo(() => (themeId ? getThemeById(themeId) : undefined), [themeId]);
  const regularPictures = useMemo(() => (themeId ? getThemeRegularPictures(themeId) : []), [themeId]);

  const [displayedPictures, setDisplayedPictures] = useState<Picture[]>([]);

  const progress = themeId ? getThemeProgressByThemeId(themeId) : undefined;
  const bonusPicture = themeId ? getThemeBonusPicture(themeId) : undefined;
  const unlockedQuadrants = progress?.unlockedQuadrants ?? 0;
  const bonusUnlocked = progress?.bonusUnlocked ?? false;

  useEffect(() => {
    if (regularPictures.length === 0) {
      setDisplayedPictures([]);
      return;
    }

    setDisplayedPictures(takeRandom(regularPictures, SET_SIZE));
  }, [themeId, regularPictures]);

  if (!theme || !themeId) {
    return (
      <section className="screen">
        <p>Theme not found.</p>
        <Link className="inline-link" to="/">
          Return to themes
        </Link>
      </section>
    );
  }

  return (
    <section className="screen">
      <div className="screen__head">
        <h1>{theme.name} Gallery</h1>
        <p>{theme.description}</p>
        <p className="muted-text">
          Bonus progress: {unlockedQuadrants}/4 quadrants unlocked
          {bonusUnlocked ? ' (ready!)' : ''}
        </p>
      </div>

      {bonusUnlocked && bonusPicture ? (
        <div className="bonus-card-wrap">
          <PictureCard
            picture={bonusPicture}
            badge="Bonus"
            onSelect={() => navigate(`/theme/${themeId}/pick?pictureId=${bonusPicture.id}`)}
          />
        </div>
      ) : null}

      <div className="row-actions">
        <button className="ghost-btn" onClick={() => setDisplayedPictures(takeRandom(regularPictures, SET_SIZE))}>
          Generate New Set
        </button>
        <Link className="inline-link" to="/gallery">
          View My Gallery
        </Link>
      </div>

      <div className="picture-grid">
        {displayedPictures.map((picture) => (
          <PictureCard
            key={picture.id}
            picture={picture}
            onSelect={() => navigate(`/theme/${themeId}/pick?pictureId=${picture.id}`)}
          />
        ))}
      </div>
    </section>
  );
};
