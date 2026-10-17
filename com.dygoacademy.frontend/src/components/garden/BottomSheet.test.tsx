import * as React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { BottomSheet } from './BottomSheet';

describe('BottomSheet', () => {
  it('renders a modal dialog named by its title, inside the garden root', () => {
    renderWithIntl(
      <div data-ui="garden">
        <BottomSheet open onOpenChange={() => {}} title="Add a word" description="In Environment">
          <p>Body</p>
        </BottomSheet>
      </div>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Add a word' });
    expect(dialog.closest('[data-ui="garden"]')).not.toBeNull();
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('closes from the close button', () => {
    const onOpenChange = vi.fn();
    renderWithIntl(
      <div data-ui="garden">
        <BottomSheet open onOpenChange={onOpenChange} title="Add a word" />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes when the grabber is dragged down far enough', () => {
    const onOpenChange = vi.fn();
    renderWithIntl(
      <div data-ui="garden">
        <BottomSheet open onOpenChange={onOpenChange} title="Add a word" />
      </div>,
    );
    const grabber = screen.getByTestId('sheet-grabber');
    fireEvent.pointerDown(grabber, { clientY: 100 });
    fireEvent.pointerMove(grabber, { clientY: 150 });
    fireEvent.pointerUp(grabber, { clientY: 150 });
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.pointerDown(grabber, { clientY: 100 });
    fireEvent.pointerMove(grabber, { clientY: 260 });
    fireEvent.pointerUp(grabber, { clientY: 260 });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  describe('with the keyboard open (A7b)', () => {
    const original = window.visualViewport;
    afterEach(() => {
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: original });
      vi.useRealTimers();
    });

    it('sits on the keyboard and fits the visible area', () => {
      const viewport = Object.assign(new EventTarget(), {
        height: window.innerHeight,
        offsetTop: 0,
      });
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
      renderWithIntl(
        <div data-ui="garden">
          <BottomSheet open onOpenChange={() => {}} title="Add a word" />
        </div>,
      );
      const dialog = screen.getByRole('dialog', { name: 'Add a word' });
      expect(dialog.style.getPropertyValue('--sheet-bottom')).toBe('0px');

      act(() => {
        viewport.height = window.innerHeight - 320;
        viewport.dispatchEvent(new Event('resize'));
      });
      expect(dialog.style.getPropertyValue('--sheet-bottom')).toBe('320px');
      expect(dialog.style.getPropertyValue('--sheet-max-h')).toBe(`${window.innerHeight - 328}px`);
      expect(dialog.className).toContain('bottom-[var(--sheet-bottom,0px)]');
    });

    it('focuses initialFocusRef after the slide-in; Escape closes', () => {
      vi.useFakeTimers();
      const onOpenChange = vi.fn();
      function Sheet() {
        const ref = React.useRef<HTMLInputElement>(null);
        return (
          <div data-ui="garden">
            <BottomSheet open onOpenChange={onOpenChange} title="Add a word" initialFocusRef={ref}>
              <input ref={ref} aria-label="Word" />
            </BottomSheet>
          </div>
        );
      }
      renderWithIntl(<Sheet />);
      const field = screen.getByLabelText('Word');
      expect(document.activeElement).toBe(screen.getByRole('dialog'));
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(document.activeElement).toBe(field);
      fireEvent.keyDown(field, { key: 'Escape' });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
