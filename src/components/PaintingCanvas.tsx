import { PointerEvent, forwardRef, useRef, useState } from 'react';
import { RegionFillStates, SvgVariant } from '../models/domain';

interface PanPoint {
  x: number;
  y: number;
}

interface PaintingCanvasProps {
  variant: SvgVariant;
  fills: RegionFillStates;
  backgroundColor: string;
  selectedColor: string;
  zoom: number;
  pan: PanPoint;
  onPanChange: (pan: PanPoint) => void;
  onFillRegion: (regionId: string) => void;
  onFillBackground: () => void;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  startPan: PanPoint;
}

export const PaintingCanvas = forwardRef<SVGSVGElement, PaintingCanvasProps>(
  (
    {
      variant,
      fills,
      backgroundColor,
      selectedColor,
      zoom,
      pan,
      onPanChange,
      onFillRegion,
      onFillBackground,
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragStateRef = useRef<DragState | null>(null);

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
      if (zoom <= 1) {
        return;
      }

      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPan: pan,
      };

      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      onPanChange({
        x: dragState.startPan.x + dx,
        y: dragState.startPan.y + dy,
      });
    };

    const stopDragging = (event: PointerEvent<HTMLDivElement>): void => {
      const dragState = dragStateRef.current;
      if (dragState && dragState.pointerId === event.pointerId) {
        dragStateRef.current = null;
        setIsDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };

    return (
      <div
        className={`paint-stage ${zoom > 1 ? 'can-pan' : ''} ${isDragging ? 'is-dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <svg
          ref={ref}
          viewBox={variant.viewBox}
          className="paint-stage__svg"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <rect
            width="100%"
            height="100%"
            fill={backgroundColor}
            onClick={(event) => {
              event.stopPropagation();
              onFillBackground();
            }}
          />

          {variant.regions.map((region) => (
            <path
              key={region.id}
              d={region.path}
              fill={fills[region.id] ?? '#ffffff'}
              stroke="#24324c"
              strokeWidth={1.6}
              onClick={(event) => {
                event.stopPropagation();
                onFillRegion(region.id);
              }}
            />
          ))}

          {/* Current brush indicator for quick color context while painting. */}
          <circle cx="20" cy="20" r="10" fill={selectedColor} stroke="#1d2535" strokeWidth={2} />
        </svg>
      </div>
    );
  }
);

PaintingCanvas.displayName = 'PaintingCanvas';
