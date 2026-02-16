interface PaintToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onResetZoom: () => void;
  disableUndo: boolean;
  disableRedo: boolean;
  zoom: number;
}

export const PaintToolbar = ({
  onUndo,
  onRedo,
  onZoomOut,
  onZoomIn,
  onResetZoom,
  disableUndo,
  disableRedo,
  zoom,
}: PaintToolbarProps): JSX.Element => (
  <div className="paint-toolbar" role="toolbar" aria-label="Painting actions">
    <button className="action-btn" onClick={onUndo} disabled={disableUndo}>
      Undo
    </button>
    <button className="action-btn" onClick={onRedo} disabled={disableRedo}>
      Redo
    </button>
    <button className="action-btn" onClick={onZoomOut}>
      -
    </button>
    <button className="action-btn" onClick={onResetZoom}>
      {Math.round(zoom * 100)}%
    </button>
    <button className="action-btn" onClick={onZoomIn}>
      +
    </button>
  </div>
);
