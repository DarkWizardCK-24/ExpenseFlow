'use client';

import { useState, useRef, useCallback } from 'react';

interface SwipeToDeleteOptions {
  onDelete: () => void;
  threshold?: number; // percentage or px, e.g. 100px
}

export function useSwipeToDelete({ onDelete, threshold = 90 }: SwipeToDeleteOptions) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only capture left click / touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    startX.current = e.clientX;
    currentX.current = e.clientX;
    setIsSwiping(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isSwiping) return;
    currentX.current = e.clientX;
    const diff = currentX.current - startX.current;
    // Only swipe to the left
    if (diff < 0) {
      setOffsetX(Math.max(diff, -140));
    } else {
      setOffsetX(0);
    }
  }, [isSwiping]);

  const onPointerUp = useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);
    if (offsetX < -threshold) {
      // Trigger delete confirmation
      onDelete();
    }
    setOffsetX(0);
  }, [isSwiping, offsetX, threshold, onDelete]);

  const onPointerCancel = useCallback(() => {
    setIsSwiping(false);
    setOffsetX(0);
  }, []);

  return {
    offsetX,
    isSwiping,
    dragProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      style: {
        transform: `translateX(${offsetX}px)`,
        transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        touchAction: 'pan-y' as const,
      },
    },
    resetSwipe: () => setOffsetX(0),
  };
}
