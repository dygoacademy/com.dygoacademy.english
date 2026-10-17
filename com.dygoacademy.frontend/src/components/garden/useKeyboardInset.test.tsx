import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { keyboardInset, useKeyboardInset } from './useKeyboardInset';

class FakeViewport extends EventTarget {
  constructor(
    public height: number,
    public offsetTop = 0,
  ) {
    super();
  }
}

const original = window.visualViewport;

function setViewport(viewport: FakeViewport | null) {
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
}

describe('keyboardInset', () => {
  it('is the gap under the visible area, and its height', () => {
    expect(keyboardInset(844, { height: 844, offsetTop: 0 })).toEqual({ inset: 0, vh: 844 });
    expect(keyboardInset(844, { height: 470, offsetTop: 0 })).toEqual({ inset: 374, vh: 470 });
    // iOS scrolled the visual viewport down to show the field.
    expect(keyboardInset(844, { height: 470, offsetTop: 100 })).toEqual({ inset: 274, vh: 470 });
  });

  it('is never negative, and is nothing without a visual viewport', () => {
    expect(keyboardInset(844, { height: 900, offsetTop: 0 }).inset).toBe(0);
    expect(keyboardInset(844, null)).toEqual({ inset: 0, vh: 844 });
  });
});

describe('useKeyboardInset', () => {
  afterEach(() => setViewport(original as unknown as FakeViewport | null));

  it('follows the visual viewport while active', () => {
    const viewport = new FakeViewport(window.innerHeight);
    setViewport(viewport);
    const { result, rerender } = renderHook(({ active }) => useKeyboardInset(active), {
      initialProps: { active: true },
    });
    expect(result.current).toEqual({ inset: 0, vh: window.innerHeight });

    act(() => {
      viewport.height = window.innerHeight - 300;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toEqual({ inset: 300, vh: window.innerHeight - 300 });

    act(() => {
      viewport.offsetTop = 100;
      viewport.dispatchEvent(new Event('scroll'));
    });
    expect(result.current?.inset).toBe(200);

    rerender({ active: false });
    expect(result.current).toBeNull();
  });
});
