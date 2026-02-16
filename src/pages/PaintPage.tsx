import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BonusRevealEvent, PaintingSession } from '../models/domain';
import { getPictureById, getThemeById } from '../data/library';
import {
  createPaintingSession,
  fillBackground,
  fillRegion,
  getSessionById,
  markSessionCompleted,
  redoPaint,
  undoPaint,
} from '../services/storage';
import { exportSvgAsPng } from '../services/exportPng';
import { getPaintProgress } from '../utils/sessionProgress';
import { Palette } from '../components/Palette';
import { PaintToolbar } from '../components/PaintToolbar';
import { PaintingCanvas } from '../components/PaintingCanvas';
import { ProgressMeter } from '../components/ProgressMeter';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { BonusRevealModal } from '../components/BonusRevealModal';

const paletteColors = [
  '#ff595e',
  '#ff924c',
  '#ffca3a',
  '#8ac926',
  '#1dd3b0',
  '#1982c4',
  '#6a4c93',
  '#f15bb5',
  '#6f4e37',
  '#f8f9fa',
  '#343a40',
];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const PaintPage = (): JSX.Element => {
  // TODO: Add a selectable music system per theme with mute/volume controls.
  // TODO: Add a time-lapse replay mode by storing region-fill events with timestamps.
  // TODO: Add seasonal events (limited palettes/challenges) injected from config.
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<PaintingSession | undefined>();
  const [selectedColor, setSelectedColor] = useState<string>(paletteColors[0]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showCelebration, setShowCelebration] = useState(false);
  const [bonusReveal, setBonusReveal] = useState<BonusRevealEvent | undefined>();

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    setSession(getSessionById(sessionId));
  }, [sessionId]);

  const picture = useMemo(() => (session ? getPictureById(session.pictureId) : undefined), [session]);
  const theme = useMemo(() => (picture ? getThemeById(picture.themeId) : undefined), [picture]);

  const variant = picture && session ? picture.variants[session.difficulty] : undefined;
  const progress = session && variant ? getPaintProgress(session, variant) : undefined;

  useEffect(() => {
    if (!session || !progress || !theme || !picture) {
      return;
    }

    if (session.completed || progress.totalCount === 0 || progress.filledCount < progress.totalCount) {
      return;
    }

    const result = markSessionCompleted({
      sessionId: session.id,
      isBonusPicture: picture.isBonus,
      themeName: theme.name,
      bonusPictureId: theme.bonusPictureId,
    });

    if (result.session) {
      setSession(result.session);
      setShowCelebration(true);
      setBonusReveal(result.reveal);
    }
  }, [picture, progress, session, theme]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!session) {
        return;
      }

      const usesMeta = event.metaKey || event.ctrlKey;

      if (usesMeta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          const updated = redoPaint(session.id);
          if (updated) {
            setSession(updated);
          }
          return;
        }

        const updated = undoPaint(session.id);
        if (updated) {
          setSession(updated);
        }
        return;
      }

      if (usesMeta && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        const updated = redoPaint(session.id);
        if (updated) {
          setSession(updated);
        }
        return;
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom((current) => clamp(current + 0.2, 0.6, 3));
      }

      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        setZoom((current) => {
          const next = clamp(current - 0.2, 0.6, 3);
          if (next <= 1) {
            setPan({ x: 0, y: 0 });
          }
          return next;
        });
      }

      if (event.key === '0') {
        event.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session]);

  if (!sessionId || !session || !picture || !theme || !variant || !progress) {
    return (
      <section className="screen">
        <p>Painting session not found.</p>
        <Link className="inline-link" to="/">
          Return to themes
        </Link>
      </section>
    );
  }

  const updateZoom = (nextZoom: number): void => {
    const clamped = clamp(nextZoom, 0.6, 3);
    setZoom(clamped);
    if (clamped <= 1) {
      setPan({ x: 0, y: 0 });
    }
  };

  const handleFillRegion = (regionId: string): void => {
    const updated = fillRegion(session.id, regionId, selectedColor);
    if (updated) {
      setSession(updated);
    }
  };

  const handleFillBackground = (): void => {
    const updated = fillBackground(session.id, selectedColor);
    if (updated) {
      setSession(updated);
    }
  };

  const handleUndo = (): void => {
    const updated = undoPaint(session.id);
    if (updated) {
      setSession(updated);
    }
  };

  const handleRedo = (): void => {
    const updated = redoPaint(session.id);
    if (updated) {
      setSession(updated);
    }
  };

  const handleSavePng = async (): Promise<void> => {
    if (!svgRef.current) {
      return;
    }

    const safeTitle = picture.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await exportSvgAsPng(svgRef.current, `${safeTitle}.png`);
  };

  const handleReturnAfterCompletion = (): void => {
    setShowCelebration(false);

    if (bonusReveal) {
      return;
    }

    navigate(`/theme/${theme.id}`);
  };

  const startBonusPainting = (): void => {
    const bonusPicture = getPictureById(theme.bonusPictureId);
    if (!bonusPicture) {
      navigate(`/theme/${theme.id}`);
      return;
    }

    // TODO: Route through bonus-specific difficulty + storybook/flipbook intro once that feature lands.
    const bonusSession = createPaintingSession({
      themeId: theme.id,
      pictureId: bonusPicture.id,
      difficulty: 'medium',
      initialBackground: session.backgroundColor,
    });

    setBonusReveal(undefined);
    navigate(`/paint/${bonusSession.id}`);
  };

  return (
    <section className="screen paint-screen">
      <div className="paint-screen__head">
        <div>
          <h1>{picture.title}</h1>
          <p>
            Theme: {theme.name} | Difficulty: {session.difficulty}
          </p>
        </div>
        <ProgressMeter filled={progress.filledCount} total={progress.totalCount} percent={progress.percent} />
      </div>

      <div className="paint-layout">
        <aside className="paint-layout__left">
          <h2>Palette</h2>
          <Palette colors={paletteColors} selectedColor={selectedColor} onSelect={setSelectedColor} />

          <PaintToolbar
            onUndo={handleUndo}
            onRedo={handleRedo}
            onZoomOut={() => updateZoom(zoom - 0.2)}
            onZoomIn={() => updateZoom(zoom + 0.2)}
            onResetZoom={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            disableUndo={session.undoStack.length === 0 || session.completed}
            disableRedo={session.redoStack.length === 0 || session.completed}
            zoom={zoom}
          />

          <div className="keyboard-help">
            <p>Shortcuts:</p>
            <p>Undo: Ctrl/Cmd + Z</p>
            <p>Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y</p>
            <p>Zoom: + / - / 0</p>
          </div>

          <Link className="inline-link" to={`/theme/${theme.id}`}>
            Exit Painting
          </Link>
        </aside>

        <div className="paint-layout__canvas">
          <PaintingCanvas
            ref={svgRef}
            variant={variant}
            fills={session.fills}
            backgroundColor={session.backgroundColor}
            selectedColor={selectedColor}
            zoom={zoom}
            pan={pan}
            onPanChange={setPan}
            onFillRegion={handleFillRegion}
            onFillBackground={handleFillBackground}
          />
        </div>
      </div>

      {showCelebration ? (
        <CelebrationOverlay
          pictureTitle={picture.title}
          onSavePng={() => {
            void handleSavePng();
          }}
          onReturn={handleReturnAfterCompletion}
        />
      ) : null}

      {!showCelebration && bonusReveal ? (
        <BonusRevealModal
          reveal={bonusReveal}
          bonusVariant={getPictureById(theme.bonusPictureId)?.variants.medium}
          onContinue={() => {
            setBonusReveal(undefined);
            navigate(`/theme/${theme.id}`);
          }}
          onStartBonus={startBonusPainting}
        />
      ) : null}
    </section>
  );
};
