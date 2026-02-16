import { ConfettiOverlay } from './ConfettiOverlay';

interface CelebrationOverlayProps {
  pictureTitle: string;
  onSavePng: () => void;
  onReturn: () => void;
}

export const CelebrationOverlay = ({ pictureTitle, onSavePng, onReturn }: CelebrationOverlayProps): JSX.Element => (
  <div className="overlay celebration-overlay" role="dialog" aria-modal="true">
    <ConfettiOverlay />
    <div className="overlay__panel celebration-overlay__panel">
      <h2>Masterpiece Complete!</h2>
      <p>
        You finished <strong>{pictureTitle}</strong>. Your progress is saved.
      </p>
      <div className="overlay__actions">
        <button className="primary-btn" onClick={onSavePng}>
          Save PNG
        </button>
        <button className="ghost-btn" onClick={onReturn}>
          Return to Gallery
        </button>
      </div>
    </div>
  </div>
);
