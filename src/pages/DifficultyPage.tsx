import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { difficultyLabels, getPictureById, getThemeById } from '../data/library';
import { Difficulty } from '../models/domain';
import { createPaintingSession } from '../services/storage';
import { DifficultySelector } from '../components/DifficultySelector';
import { SvgThumbnail } from '../components/SvgThumbnail';

const themeBackgrounds: Record<string, string> = {
  nature: '#edf8ec',
  space: '#e8ecff',
  pirates: '#fff2de',
};

export const DifficultyPage = (): JSX.Element => {
  const { themeId } = useParams<{ themeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pictureId = searchParams.get('pictureId') ?? '';
  const picture = useMemo(() => getPictureById(pictureId), [pictureId]);
  const theme = useMemo(() => (themeId ? getThemeById(themeId) : undefined), [themeId]);

  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  if (!theme || !picture) {
    return (
      <section className="screen">
        <p>Picture not found.</p>
        <Link className="inline-link" to={themeId ? `/theme/${themeId}` : '/'}>
          Back
        </Link>
      </section>
    );
  }

  const startPainting = (): void => {
    const session = createPaintingSession({
      themeId: theme.id,
      pictureId: picture.id,
      difficulty,
      initialBackground: themeBackgrounds[theme.id] ?? '#f4f7ff',
    });

    navigate(`/paint/${session.id}`);
  };

  return (
    <section className="screen">
      <div className="screen__head">
        <h1>{picture.title}</h1>
        <p>{picture.description}</p>
      </div>

      <div className="difficulty-layout">
        <div className="difficulty-layout__left">
          <h2>Difficulty</h2>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />

          <button className="primary-btn" onClick={startPainting}>
            Start Painting ({difficultyLabels[difficulty]})
          </button>

          <Link className="inline-link" to={`/theme/${theme.id}`}>
            Back to {theme.name}
          </Link>
        </div>

        <div className="difficulty-layout__right">
          <SvgThumbnail variant={picture.variants[difficulty]} className="difficulty-preview" colorfulUnfilled />
          <p className="muted-text">Preview updates as segmentation changes.</p>
        </div>
      </div>
    </section>
  );
};
