interface ProgressMeterProps {
  filled: number;
  total: number;
  percent: number;
}

export const ProgressMeter = ({ filled, total, percent }: ProgressMeterProps): JSX.Element => (
  <div className="progress-meter" aria-live="polite">
    <div className="progress-meter__text">
      {filled} / {total} regions ({percent}%)
    </div>
    <div className="progress-meter__bar-wrap">
      <div className="progress-meter__bar" style={{ width: `${percent}%` }} />
    </div>
  </div>
);
