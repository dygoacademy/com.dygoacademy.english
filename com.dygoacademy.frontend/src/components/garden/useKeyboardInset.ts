'use client';

import * as React from 'react';

export interface KeyboardInset {
  /** Pixels between the bottom of the layout viewport and the visible area (the keyboard). */
  inset: number;
  /** Height of the visible area. */
  vh: number;
}

/** The keyboard inset for a visual viewport (or none without one). */
export function keyboardInset(
  innerHeight: number,
  viewport: Pick<VisualViewport, 'height' | 'offsetTop'> | null | undefined,
): KeyboardInset {
  if (!viewport) return { inset: 0, vh: innerHeight };
  return {
    inset: Math.max(0, Math.round(innerHeight - viewport.height - viewport.offsetTop)),
    vh: Math.round(viewport.height),
  };
}

/**
 * A7b (2026-10-17): how much of the screen the on-screen keyboard covers,
 * from `window.visualViewport`. On iPhone the keyboard doesn't resize the
 * page: it shrinks (and may scroll) the visual viewport, so a sheet pinned
 * to `bottom: 0` keeps its field under the keyboard and iOS scrolls the
 * sheet's top (title, ✕) off screen to show it. `BottomSheet` sits on
 * `inset` and is at most `vh` tall instead. Listens only while `active`.
 */
export function useKeyboardInset(active: boolean): KeyboardInset | null {
  const [value, setValue] = React.useState<KeyboardInset | null>(null);

  React.useEffect(() => {
    if (!active) {
      setValue(null);
      return;
    }
    const viewport = window.visualViewport;
    const update = () => {
      const next = keyboardInset(window.innerHeight, viewport);
      setValue((prev) => (prev && prev.inset === next.inset && prev.vh === next.vh ? prev : next));
    };
    update();
    if (!viewport) return;
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [active]);

  return value;
}
