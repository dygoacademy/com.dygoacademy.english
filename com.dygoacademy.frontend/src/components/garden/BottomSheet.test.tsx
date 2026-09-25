import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
});
