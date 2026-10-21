import { type RefObject, useLayoutEffect, useState } from 'react';

const MIN_HEIGHT = 160;

export function remainingViewportHeight(
  top: number,
  viewportHeight: number,
  paddingBottom: number,
  minHeight = MIN_HEIGHT,
): number {
  return Math.max(minHeight, Math.floor(viewportHeight - top - paddingBottom));
}

export function useRemainingHeight(
  frameRef: RefObject<HTMLElement | null>,
  captionRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): { maxHeight?: number; headerOffset: number } {
  const [maxHeight, setMaxHeight] = useState<number>();
  const [headerOffset, setHeaderOffset] = useState(0);

  useLayoutEffect(() => {
    if (!enabled) {
      setMaxHeight(undefined);
      setHeaderOffset(0);
      return;
    }
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const top = frame.getBoundingClientRect().top;
      const main = frame.closest('main');
      const paddingBottom = main
        ? Number.parseFloat(getComputedStyle(main).paddingBottom) || 0
        : 0;
      const nextHeight = remainingViewportHeight(
        top,
        window.innerHeight,
        paddingBottom,
      );
      const nextOffset = captionRef.current?.offsetHeight ?? 0;
      setMaxHeight((current) =>
        current === nextHeight ? current : nextHeight,
      );
      setHeaderOffset((current) =>
        current === nextOffset ? current : nextOffset,
      );
    };

    measure();
    window.addEventListener('resize', measure);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(measure);
    const header = document.querySelector('header');
    if (header) observer?.observe(header);
    let sibling = frame.previousElementSibling;
    while (sibling) {
      observer?.observe(sibling);
      sibling = sibling.previousElementSibling;
    }
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [captionRef, enabled, frameRef]);

  return { maxHeight, headerOffset };
}
