import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getThemeById, getThemeBonusPicture, getThemeRegularPictures } from '../data/library';
import { PaintingSession, Picture } from '../models/domain';
import { getLatestSessionMapByThemeId, getThemeProgressByThemeId } from '../services/storage';
import { takeRandom } from '../utils/random';
import { PictureCard } from '../components/PictureCard';

const SET_SIZE = 4;

export const ThemeGalleryPage = (): JSX.Element => {
  const { themeId } = useParams<{ themeId: string }>();
  const navigate = useNavigate();

  const theme = useMemo(() => (themeId ? getThemeById(themeId) : undefined), [themeId]);
  const regularPictures = useMemo(() => (themeId ? getThemeRegularPictures(themeId) : []), [themeId]);

  const [displayedPictures, setDisplayedPictures] = useState<Picture[]>([]);
  const [latestByPictureId, setLatestByPictureId] = useState<Record<string, PaintingSession>>({});

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

  useEffect(() => {
    if (!themeId) {
      setLatestByPictureId({});
      return;
    }

    setLatestByPictureId(getLatestSessionMapByThemeId(themeId));
  }, [themeId]);

  const openPicture = (pictureId: string): void => {
    if (!themeId) {
      return;
    }

    const latestSession = latestByPictureId[pictureId];
    if (latestSession && !latestSession.completed) {
      navigate(`/paint/${latestSession.id}`);
      return;
    }

    navigate(`/theme/${themeId}/pick?pictureId=${pictureId}`);
  };

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
        <h1>{theme.name} Theme</h1>
        <p>{theme.description}</p>
        <p className="muted-text">Bonus progress: {unlockedQuadrants}/4 quadrants unlocked</p>
      </div>

      {bonusUnlocked && bonusPicture ? (
        <div className="bonus-card-wrap">
          <PictureCard
            picture={bonusPicture}
            session={latestByPictureId[bonusPicture.id]}
            badge="Bonus"
            onSelect={() => openPicture(bonusPicture.id)}
          />
        </div>
      ) : null}

      <div className="picture-grid">
        {displayedPictures.map((picture) => (
          <PictureCard
            key={picture.id}
            picture={picture}
            session={latestByPictureId[picture.id]}
            onSelect={() => openPicture(picture.id)}
          />
        ))}
      </div>
    </section>
  );
};
