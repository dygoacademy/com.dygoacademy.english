'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';
import { CloseIcon } from './icons';
import { IconButton } from './IconButton';

/**
 * The bottom sheet of the group screens (canvas GR5 invite, GR7 start a
 * garden): page-coloured, 26px top corners, a grabber, a 22px Fraunces
 * title with a muted line under it and a 46px close button, then the body
 * with 14px between blocks. Different from the generic `BottomSheet`
 * (white, 19px title), so the canvas values live here.
 *
 * - Live pages: `GroupSheet` is a Radix dialog (focus trap, Escape,
 *   scroll lock) portalled into the garden root, over a scrim.
 * - Reference pages: `GroupSheetFrame` draws the same panel in the flow of
 *   a fixed frame, over `SheetBackdrop` (the canvas's greyed-out page),
 *   because a portal renders nothing on the server.
 */
const PANEL =
  'flex flex-col gap-[14px] rounded-t-hero bg-bg px-4 pb-[max(34px,var(--safe-bottom))] pt-2.5 text-text';

function Grabber() {
  return <span aria-hidden="true" className="h-[5px] w-9 self-center rounded-[3px] bg-disabled" />;
}

function SheetHeader({
  title,
  subtitle,
  close,
  titleId,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  close: React.ReactNode;
  titleId?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-grow flex-col">
        <span id={titleId} className="font-display text-[22px] font-semibold">
          {title}
        </span>
        {subtitle ? <span className="text-[13px] text-muted-foreground">{subtitle}</span> : null}
      </div>
      {close}
    </div>
  );
}

export interface GroupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function GroupSheet({ open, onOpenChange, title, subtitle, children }: GroupSheetProps) {
  const t = useTranslations('components.sheet');
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    setContainer(document.querySelector<HTMLElement>('[data-ui="garden"]'));
  }, []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={container ?? undefined}>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-ui={container ? undefined : 'garden'}
          aria-describedby={undefined}
          className={gcn(
            PANEL,
            'fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] w-full max-w-[560px] overflow-y-auto overscroll-contain outline-none',
            'duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none',
          )}
        >
          <Grabber />
          <SheetHeader
            title={<DialogPrimitive.Title asChild><span>{title}</span></DialogPrimitive.Title>}
            subtitle={subtitle}
            close={
              <DialogPrimitive.Close asChild>
                <IconButton aria-label={t('close')} className="box-content">
                  <CloseIcon width={20} height={20} />
                </IconButton>
              </DialogPrimitive.Close>
            }
          />
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * The canvas's page behind a sheet: the page header and three grey
 * blocks, not the real page (reference pages only; GR5, GR7).
 */
export function SheetBackdrop({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex flex-col gap-[14px] pt-[22px]">
      <div className="flex flex-col px-5">
        <span className="text-[13px] text-muted-foreground">{eyebrow}</span>
        <span className="font-display text-[28px] font-semibold">{title}</span>
      </div>
      <div className="mx-4 h-[150px] rounded-[24px] bg-forest" />
      <div className="mx-4 h-20 rounded-[20px] border border-border bg-surface" />
      <div className="mx-4 h-20 rounded-[20px] border border-border bg-surface" />
    </div>
  );
}

/** A sheet drawn in place, at the bottom of a `relative` frame (reference pages). */
export function GroupSheetFrame({
  title,
  subtitle,
  closeHref,
  children,
}: {
  title: string;
  subtitle?: string;
  closeHref: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('components.sheet');
  const titleId = React.useId();
  return (
    <>
      <div className="absolute inset-0 bg-scrim" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={gcn(PANEL, 'absolute inset-x-0 bottom-0')}
      >
        <Grabber />
        <SheetHeader
          titleId={titleId}
          title={title}
          subtitle={subtitle}
          close={
            <IconButton asChild aria-label={t('close')}>
              <a href={closeHref}>
                <CloseIcon width={20} height={20} />
              </a>
            </IconButton>
          }
        />
        {children}
      </div>
    </>
  );
}
