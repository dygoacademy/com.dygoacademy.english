'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';

import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';

import { gcn } from './cn';
import { CloseIcon } from './icons';
import { IconButton } from './IconButton';
import { useKeyboardInset } from './useKeyboardInset';

/**
 * Bottom sheet (design system §11) on the app's existing Radix dialog
 * (`components/ui/dialog.tsx`, unchanged), so focus trap, Escape,
 * outside-tap to close, focus restore, aria-modal and scroll lock all
 * come from there.
 *
 * - iPhone: pinned to the bottom, radius-xl top corners, a 36×5 grabber,
 *   at most 90% of the screen, padded for the home indicator. Dragging
 *   the grabber down moves the sheet; letting go past 96px closes it.
 *   With the keyboard open (A7b, 2026-10-17) it sits on top of the
 *   keyboard and fits the visible area, so the title and ✕ stay on
 *   screen and the body scrolls (`useKeyboardInset`).
 * - iPad (`medium`+): a centred sheet with all corners rounded, no grabber.
 *
 * It portals into the page's `[data-ui="garden"]` root rather than
 * <body>, so the garden tokens and fonts still apply inside it.
 */
export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  /** Actions pinned under the scrolling body, e.g. a primary Button. */
  footer?: React.ReactNode;
  /**
   * The ✕ in the header (default on). Off for a sheet whose own buttons
   * close it, as the A8 Account sheet's Cancel (canvas: no ✕).
   */
  closeButton?: boolean;
  /**
   * A field to focus once the sheet has slid in (A7b, 2026-10-17), instead
   * of `autoFocus`: focusing during the slide-in opens the iPhone keyboard
   * while the field is still moving, and iOS scrolls the header away.
   */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  /** Header overrides for a sheet drawn bigger on its board (A7b). */
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  bodyClassName?: string;
}

const CLOSE_DISTANCE = 96;
/** The slide-in (`duration-200`), plus a frame. */
const SLIDE_IN_MS = 220;

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeButton = true,
  initialFocusRef,
  className,
  headerClassName,
  titleClassName,
  descriptionClassName,
  bodyClassName,
}: BottomSheetProps) {
  const t = useTranslations('components.sheet');
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  const [dragY, setDragY] = React.useState(0);
  const dragStart = React.useRef<number | null>(null);
  const focusTimer = React.useRef<number | undefined>(undefined);
  const keyboard = useKeyboardInset(open);

  React.useEffect(() => {
    if (!open) window.clearTimeout(focusTimer.current);
    return () => window.clearTimeout(focusTimer.current);
  }, [open]);

  function focusAfterSlideIn(event: Event) {
    if (!initialFocusRef?.current) return;
    // Keep focus in the dialog (on the sheet itself) until the field takes it.
    event.preventDefault();
    (event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    focusTimer.current = window.setTimeout(
      () => initialFocusRef.current?.focus({ preventScroll: true }),
      reduced ? 0 : SLIDE_IN_MS,
    );
  }

  React.useEffect(() => {
    setContainer(document.querySelector<HTMLElement>('[data-ui="garden"]'));
  }, []);

  function endDrag() {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (dragY > CLOSE_DISTANCE) onOpenChange(false);
    setDragY(0);
  }

  const dragging = dragY > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal container={container ?? undefined}>
        <DialogOverlay />
        <DialogPrimitive.Content
          // Outside the garden root (shouldn't happen), carry the tokens along.
          data-ui={container ? undefined : 'garden'}
          data-dragging={dragging || undefined}
          style={
            {
              ...(dragging ? { transform: `translateY(${dragY}px)` } : null),
              ...(keyboard
                ? { '--sheet-bottom': `${keyboard.inset}px`, '--sheet-max-h': `${keyboard.vh - 8}px` }
                : null),
            } as React.CSSProperties
          }
          onOpenAutoFocus={focusAfterSlideIn}
          className={gcn(
            'fixed inset-x-0 bottom-[var(--sheet-bottom,0px)] z-50 flex max-h-[min(90dvh,var(--sheet-max-h,90dvh))] min-h-0 flex-col rounded-t-hero bg-surface pb-safe text-text outline-none',
            'duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[85dvh] md:w-[calc(100%-48px)] md:max-w-[540px]',
            'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-hero md:pb-0',
            'md:data-[state=closed]:slide-out-to-bottom-4 md:data-[state=open]:slide-in-from-bottom-4',
            'md:data-[state=closed]:fade-out-0 md:data-[state=open]:fade-in-0',
            'motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none',
            dragging ? 'transition-none' : 'transition-transform duration-quick ease-garden',
            className,
          )}
          // No description: tell Radix so it doesn't warn about a missing one.
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div
            aria-hidden="true"
            data-testid="sheet-grabber"
            className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center md:hidden"
            onPointerDown={(event) => {
              dragStart.current = event.clientY;
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (dragStart.current === null) return;
              setDragY(Math.max(0, event.clientY - dragStart.current));
            }}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <span className="h-[5px] w-9 rounded-full bg-disabled" />
          </div>

          <div
            className={gcn(
              'flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-1 md:pt-5',
              headerClassName,
            )}
          >
            <div className="min-w-0">
              <DialogPrimitive.Title className={gcn('font-display text-display-s', titleClassName)}>
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description
                  className={gcn('mt-1 text-body-s text-muted-foreground', descriptionClassName)}
                >
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            {closeButton ? (
              <DialogPrimitive.Close asChild>
                <IconButton aria-label={t('close')} className="-mr-1 -mt-1">
                  <CloseIcon width={20} height={20} />
                </IconButton>
              </DialogPrimitive.Close>
            ) : null}
          </div>

          <div
            className={gcn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4',
              bodyClassName,
            )}
          >
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-border px-5 pb-4 pt-3">{footer}</div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
