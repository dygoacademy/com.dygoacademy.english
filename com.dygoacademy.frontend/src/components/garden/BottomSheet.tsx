'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';

import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';

import { gcn } from './cn';
import { CloseIcon } from './icons';
import { IconButton } from './IconButton';

/**
 * Bottom sheet (design system §11) on the app's existing Radix dialog
 * (`components/ui/dialog.tsx`, unchanged), so focus trap, Escape,
 * outside-tap to close, focus restore, aria-modal and scroll lock all
 * come from there.
 *
 * - iPhone: pinned to the bottom, radius-xl top corners, a 36×5 grabber,
 *   at most 90% of the screen, padded for the home indicator. Dragging
 *   the grabber down moves the sheet; letting go past 96px closes it.
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
  className?: string;
}

const CLOSE_DISTANCE = 96;

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: BottomSheetProps) {
  const t = useTranslations('components.sheet');
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  const [dragY, setDragY] = React.useState(0);
  const dragStart = React.useRef<number | null>(null);

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
          style={dragging ? { transform: `translateY(${dragY}px)` } : undefined}
          className={gcn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] min-h-0 flex-col rounded-t-hero bg-garden-surface pb-safe text-garden-text outline-none',
            'duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'medium:inset-x-auto medium:bottom-auto medium:left-1/2 medium:top-1/2 medium:max-h-[85dvh] medium:w-[calc(100%-48px)] medium:max-w-[540px]',
            'medium:-translate-x-1/2 medium:-translate-y-1/2 medium:rounded-hero medium:pb-0',
            'medium:data-[state=closed]:slide-out-to-bottom-4 medium:data-[state=open]:slide-in-from-bottom-4',
            'medium:data-[state=closed]:fade-out-0 medium:data-[state=open]:fade-in-0',
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
            className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center medium:hidden"
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
            <span className="h-[5px] w-9 rounded-full bg-garden-disabled" />
          </div>

          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-1 medium:pt-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-display-s">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-body-s text-garden-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton aria-label={t('close')} className="-mr-1 -mt-1">
                <CloseIcon />
              </IconButton>
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-garden-border px-5 pb-4 pt-3">{footer}</div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
