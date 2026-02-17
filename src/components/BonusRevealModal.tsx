import { BonusRevealEvent, SvgVariant } from '../models/domain';
import { SvgThumbnail } from './SvgThumbnail';

interface BonusRevealModalProps {
  reveal?: BonusRevealEvent;
  bonusVariant?: SvgVariant;
  onContinue: () => void;
  onStartBonus: () => void;
}

const quadrants = [1, 2, 3, 4];

export const BonusRevealModal = ({
  reveal,
  bonusVariant,
  onContinue,
  onStartBonus,
}: BonusRevealModalProps): JSX.Element | null => {
  if (!reveal || !bonusVariant) {
    return null;
  }

  const message = reveal.bonusUnlocked
    ? 'BONUS UNLOCKED! Start painting your bonus masterpiece!'
    : `Bonus reveal: ${reveal.unlockedQuadrants}/4 unlocked - finish ${reveal.remainingToUnlock} more ${reveal.themeName} painting${
        reveal.remainingToUnlock === 1 ? '' : 's'
      } to unlock the bonus canvas!`;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Bonus reveal">
      <div className="overlay__panel bonus-modal">
        <h2>Bonus Quadrant Reveal</h2>
        <p>{message}</p>
        <div className="bonus-modal__preview-wrap">
          <SvgThumbnail
            variant={bonusVariant}
            className="bonus-modal__preview"
            backgroundColor="#ffffff"
            colorfulUnfilled={false}
          />
          <div className="bonus-modal__grid">
            {quadrants.map((quadrant) => {
              const isRevealed = quadrant <= reveal.unlockedQuadrants;
              const isNew = quadrant === reveal.newlyUnlockedQuadrant;

              return (
                <div
                  key={quadrant}
                  className={`bonus-modal__quadrant ${isRevealed ? 'is-revealed' : ''} ${isNew ? 'is-new' : ''}`}
                >
                  {isRevealed ? '' : '?'}
                </div>
              );
            })}
          </div>
        </div>

        <div className="overlay__actions">
          <button className="ghost-btn" onClick={onContinue}>
            Continue
          </button>
          {reveal.bonusUnlocked ? (
            <button className="primary-btn" onClick={onStartBonus}>
              Start Bonus Painting
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
