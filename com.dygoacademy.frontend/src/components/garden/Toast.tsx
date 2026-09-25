'use client';

import * as React from 'react';

import { gcn } from './cn';
import { CheckIcon, InfoIcon } from './icons';

/**
 * Toast (design system §11): forest background, white `body-m`,
 * radius-md, gone after 3s. `info` or `success`.
 *
 * Bottom-centre on iPhone, above the tab bar; top-centre from `medium`.
 * The live region is always in the DOM (role="status"), and only its
 * content changes, so VoiceOver announces each message. Controlled:
 * the timer calls `onOpenChange(false)` after `duration` ms.
 * `position="inline"` renders it in the flow (gallery).
 */
export interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  variant?: 'info' | 'success';
  duration?: number;
  position?: 'fixed' | 'inline';
  className?: string;
}

export function Toast({
  open,
  onOpenChange,
  message,
  variant = 'info',
  duration = 3000,
  position = 'fixed',
  className,
}: ToastProps) {
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  React.useEffect(() => {
    if (!open || duration <= 0 || !Number.isFinite(duration)) return;
    const timer = window.setTimeout(() => onOpenChangeRef.current(false), duration);
    return () => window.clearTimeout(timer);
  }, [open, duration, message]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={gcn(
        'pointer-events-none flex justify-center',
        position === 'fixed' &&
          'fixed inset-x-0 bottom-[calc(72px+var(--safe-bottom))] z-50 px-page-safe medium:bottom-auto medium:top-[calc(16px+var(--safe-top))]',
        className,
      )}
    >
      {open ? (
        <div
          data-variant={variant}
          className="garden-rise pointer-events-auto flex min-h-12 w-full max-w-[400px] items-center gap-3 rounded-control bg-garden-forest px-4 py-3 text-body-m text-white"
        >
          <span
            aria-hidden="true"
            className={gcn(
              'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full [&_svg]:h-4 [&_svg]:w-4',
              variant === 'success' ? 'bg-garden-success' : 'bg-garden-forest-deep',
            )}
          >
            {variant === 'success' ? <CheckIcon /> : <InfoIcon />}
          </span>
          <span className="min-w-0">{message}</span>
        </div>
      ) : null}
    </div>
  );
}
