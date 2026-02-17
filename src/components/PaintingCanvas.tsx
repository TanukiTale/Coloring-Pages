import { CSSProperties, PointerEvent, forwardRef, useRef, useState } from 'react';
import { RegionFillStates, SvgVariant } from '../models/domain';

interface PanPoint {
  x: number;
  y: number;
}

interface PaintingCanvasProps {
  variant: SvgVariant;
  fills: RegionFillStates;
  backgroundColor: string;
  zoom: number;
  pan: PanPoint;
  onPanChange: (pan: PanPoint) => void;
  onZoomAndPanChange: (zoom: number, pan: PanPoint) => void;
  minZoom: number;
  maxZoom: number;
  onFillRegion: (regionId: string) => void;
  onFillBackground: () => void;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  startPan: PanPoint;
}

interface PointerPosition {
  clientX: number;
  clientY: number;
}

interface PinchState {
  pointerAId: number;
  pointerBId: number;
  startDistance: number;
  startZoom: number;
  anchorContentPoint: PanPoint;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const getDistance = (pointA: PointerPosition, pointB: PointerPosition): number =>
  Math.hypot(pointB.clientX - pointA.clientX, pointB.clientY - pointA.clientY);

const clampPanForZoom = (nextPan: PanPoint, zoomLevel: number, container: HTMLDivElement): PanPoint => {
  if (zoomLevel <= 1) {
    return { x: 0, y: 0 };
  }

  const rect = container.getBoundingClientRect();
  const maxX = ((zoomLevel - 1) * rect.width) / 2;
  const maxY = ((zoomLevel - 1) * rect.height) / 2;

  return {
    x: clamp(nextPan.x, -maxX, maxX),
    y: clamp(nextPan.y, -maxY, maxY),
  };
};

export const PaintingCanvas = forwardRef<SVGSVGElement, PaintingCanvasProps>(
  (
    {
      variant,
      fills,
      backgroundColor,
      zoom,
      pan,
      onPanChange,
      onZoomAndPanChange,
      minZoom,
      maxZoom,
      onFillRegion,
      onFillBackground,
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isPinching, setIsPinching] = useState(false);
    const dragStateRef = useRef<DragState | null>(null);
    const activePointersRef = useRef<Map<number, PointerPosition>>(new Map());
    const pinchStateRef = useRef<PinchState | null>(null);
    const [, , rawWidth, rawHeight] = variant.viewBox.split(/\s+/).map(Number);
    const stageAspectRatio =
      Number.isFinite(rawWidth) && rawWidth > 0 && Number.isFinite(rawHeight) && rawHeight > 0
        ? `${rawWidth} / ${rawHeight}`
        : '300 / 220';

    const createPinchState = (container: HTMLDivElement): PinchState | null => {
      const pointerEntries = Array.from(activePointersRef.current.entries());
      if (pointerEntries.length < 2) {
        return null;
      }

      const [first, second] = pointerEntries;
      const firstPoint = first[1];
      const secondPoint = second[1];
      const startDistance = getDistance(firstPoint, secondPoint);
      if (startDistance <= 0) {
        return null;
      }

      const rect = container.getBoundingClientRect();
      const midpoint = {
        x: (firstPoint.clientX + secondPoint.clientX) / 2 - rect.left,
        y: (firstPoint.clientY + secondPoint.clientY) / 2 - rect.top,
      };
      const startZoom = zoom > 0 ? zoom : 1;

      return {
        pointerAId: first[0],
        pointerBId: second[0],
        startDistance,
        startZoom,
        anchorContentPoint: {
          x: (midpoint.x - pan.x) / startZoom,
          y: (midpoint.y - pan.y) / startZoom,
        },
      };
    };

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
      activePointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });

      if (activePointersRef.current.size >= 2) {
        for (const pointerId of activePointersRef.current.keys()) {
          if (!event.currentTarget.hasPointerCapture(pointerId)) {
            event.currentTarget.setPointerCapture(pointerId);
          }
        }

        const pinchState = createPinchState(event.currentTarget);
        if (pinchState) {
          pinchStateRef.current = pinchState;
          dragStateRef.current = null;
          setIsDragging(false);
          setIsPinching(true);
        }
        return;
      }

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
      const activePointers = activePointersRef.current;
      if (activePointers.has(event.pointerId)) {
        activePointers.set(event.pointerId, {
          clientX: event.clientX,
          clientY: event.clientY,
        });
      }

      const pinchState = pinchStateRef.current;
      if (pinchState) {
        const pointA = activePointers.get(pinchState.pointerAId);
        const pointB = activePointers.get(pinchState.pointerBId);
        if (!pointA || !pointB) {
          return;
        }

        const currentDistance = getDistance(pointA, pointB);
        if (currentDistance <= 0) {
          return;
        }

        const scaleRatio = currentDistance / pinchState.startDistance;
        const nextZoom = clamp(pinchState.startZoom * scaleRatio, minZoom, maxZoom);
        const rect = event.currentTarget.getBoundingClientRect();
        const midpoint = {
          x: (pointA.clientX + pointB.clientX) / 2 - rect.left,
          y: (pointA.clientY + pointB.clientY) / 2 - rect.top,
        };
        const nextPan = {
          x: midpoint.x - pinchState.anchorContentPoint.x * nextZoom,
          y: midpoint.y - pinchState.anchorContentPoint.y * nextZoom,
        };

        onZoomAndPanChange(nextZoom, clampPanForZoom(nextPan, nextZoom, event.currentTarget));
        return;
      }

      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      onPanChange(
        clampPanForZoom(
          {
            x: dragState.startPan.x + dx,
            y: dragState.startPan.y + dy,
          },
          zoom,
          event.currentTarget
        )
      );
    };

    const stopDragging = (event: PointerEvent<HTMLDivElement>): void => {
      const activePointers = activePointersRef.current;
      activePointers.delete(event.pointerId);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const pinchState = pinchStateRef.current;
      if (
        pinchState &&
        (pinchState.pointerAId === event.pointerId || pinchState.pointerBId === event.pointerId)
      ) {
        pinchStateRef.current = null;
        setIsPinching(false);

        if (activePointers.size >= 2) {
          const nextPinchState = createPinchState(event.currentTarget);
          if (nextPinchState) {
            pinchStateRef.current = nextPinchState;
            setIsPinching(true);
          }
        }
      }

      const dragState = dragStateRef.current;
      if (dragState && dragState.pointerId === event.pointerId) {
        dragStateRef.current = null;
        setIsDragging(false);
      }

      if (activePointers.size === 0) {
        setIsDragging(false);
        setIsPinching(false);
      }
    };

    return (
      <div
        className={`paint-stage ${zoom > 1 ? 'can-pan' : ''} ${isDragging ? 'is-dragging' : ''} ${
          isPinching ? 'is-pinching' : ''
        }`}
        style={{ '--stage-aspect-ratio': stageAspectRatio } as CSSProperties}
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
        </svg>
      </div>
    );
  }
);

PaintingCanvas.displayName = 'PaintingCanvas';
