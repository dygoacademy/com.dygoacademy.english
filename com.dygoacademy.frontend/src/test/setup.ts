import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount everything rendered by the previous test (Vitest runs without
// globals, so Testing Library can't register this itself).
afterEach(() => {
  cleanup();
});

// jsdom has no PointerEvent, so fireEvent.pointer* would drop clientY and
// pointerType. A MouseEvent subclass is enough for the garden components.
if (typeof window !== 'undefined' && !('PointerEvent' in window)) {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
}
