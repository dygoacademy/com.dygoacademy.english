'use client';

import * as React from 'react';

/**
 * Garden keyboard shortcuts (design system §10, iPad with a keyboard):
 * one window `keydown` listener per caller, mapping `event.key` to a
 * handler. Letter keys match either case ("p" and "P").
 *
 * Ignored, so the browser's own behaviour wins:
 * - presses in text fields (input, textarea, select, contenteditable),
 * - Alt / Ctrl / Cmd chords and held-down repeats,
 * - anything while a dialog or sheet is open (its own Esc closes it),
 * - Space on a focused button or link (Space already presses it).
 *
 * A handler set to `null`/`undefined` turns that key off for now, e.g.
 * Space once the answer is showing. `keyboardUsed` turns true on any key
 * press and false on the next tap or click, so key hints only show to
 * keyboard users.
 */
export type GardenShortcuts = Partial<Record<string, (() => void) | null | undefined>>;

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function pressesOnSpace(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('button, a[href], summary, [role="button"], [role="link"]') !== null
  );
}

function dialogOpen(): boolean {
  return document.querySelector('dialog[open], [role="dialog"], [role="alertdialog"]') !== null;
}

export function useGardenShortcuts(
  shortcuts: GardenShortcuts,
  { enabled = true }: { enabled?: boolean } = {},
): { keyboardUsed: boolean } {
  const [keyboardUsed, setKeyboardUsed] = React.useState(false);

  // Keep the latest handlers in a ref so the listener is attached once.
  const shortcutsRef = React.useRef(shortcuts);
  React.useEffect(() => {
    shortcutsRef.current = shortcuts;
  });

  React.useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      setKeyboardUsed(true);
      if (event.defaultPrevented) return;
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const handler = shortcutsRef.current[key];
      if (!handler) return;
      if (key === ' ' && pressesOnSpace(event.target)) return;
      if (dialogOpen()) return;
      event.preventDefault();
      handler();
    }
    function onPointerDown() {
      // A tap or click means the learner isn't on a keyboard (any more).
      setKeyboardUsed(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [enabled]);

  return { keyboardUsed };
}
