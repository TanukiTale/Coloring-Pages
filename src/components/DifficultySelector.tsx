import { Difficulty } from '../models/domain';
import { difficultyLabels } from '../data/library';

interface DifficultySelectorProps {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
}

const difficultyDetails: Record<Difficulty, string> = {
  easy: 'Large regions, quick and relaxing.',
  medium: 'Balanced region count and detail.',
  challenge: 'Dense segmentation for precision painters.',
};

const difficultyOrder: Difficulty[] = ['easy', 'medium', 'challenge'];

export const DifficultySelector = ({ value, onChange }: DifficultySelectorProps): JSX.Element => (
  <div className="difficulty-selector">
    {difficultyOrder.map((difficulty) => (
      <button
        key={difficulty}
        className={`difficulty-pill ${value === difficulty ? 'is-selected' : ''}`}
        onClick={() => onChange(difficulty)}
      >
        <span className="difficulty-pill__title">{difficultyLabels[difficulty]}</span>
        <span className="difficulty-pill__detail">{difficultyDetails[difficulty]}</span>
      </button>
    ))}
  </div>
);
