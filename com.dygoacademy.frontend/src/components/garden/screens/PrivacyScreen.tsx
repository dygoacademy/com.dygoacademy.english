'use client';

import * as React from 'react';
import Link from 'next/link';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useLocale, useTimeZone, useTranslations } from 'next-intl';

import { VOICE_DONATION_REGIONS, type VoiceDonationRegion } from '@/lib/voice-donation';

import { gcn } from '../cn';
import { BackIcon, CheckIcon, ChevronRightIcon } from '../icons';
import { IconButton } from '../IconButton';
import { Switch } from '../Switch';
import { SCREEN_CLASSES } from './GardenTabBar';

/**
 * A8e · Privacy & data (canvas `reference/A8e-privacy*`, voice donation,
 * 2026-10-11). "Your voice": the donate switch (off by default). Turning
 * it on opens the confirm sheet (four lines, the optional "Where did you
 * grow up?", Not now / Yes, donate with equal weight); on shows the count
 * and date, three promises and "Delete my donated recordings", which asks
 * first. "Your data": download, the two policies, delete account.
 *
 * Props only (`live/PrivacyLive` saves). `framed` draws the sheet and the
 * dialog inside the screen's own frame (reference pages); otherwise they
 * are Radix dialogs portalled into the garden root (focus trap, Escape).
 */
export type PrivacyOverlay = 'confirm' | 'delete' | null;

export interface PrivacyScreenProps {
  backHref: string;
  /** null while loading (the switch shows off, disabled). */
  status: { donating: boolean; count: number; since: Date | null } | null;
  overlay: PrivacyOverlay;
  /** The confirm sheet's region answer; null = none picked / prefer not to say. */
  region: VoiceDonationRegion | 'none' | null;
  onRegionChange: (region: VoiceDonationRegion | 'none') => void;
  /** The switch: on asks first (the caller opens `confirm`), off saves at once. */
  onSwitch: (on: boolean) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  onAskDelete: () => void;
  onDelete: () => void;
  busy?: boolean;
  /** Line at the bottom (after a delete, or an error). */
  toast?: string | null;
  links: { how: string; download: string; privacy: string; terms: string; deleteAccount: string };
  framed?: boolean;
}

const SECTION_LABEL =
  'mx-1 -mb-1.5 mt-1 text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground';
const DATA_ROW =
  'box-content flex h-[52px] items-center gap-3 border-b border-divider px-[14px] text-text no-underline last:border-b-0';

export function PrivacyScreen({
  backHref,
  status,
  overlay,
  region,
  onRegionChange,
  onSwitch,
  onConfirm,
  onDismiss,
  onAskDelete,
  onDelete,
  busy = false,
  toast = null,
  links,
  framed = false,
}: PrivacyScreenProps) {
  const t = useTranslations('screens.privacy');
  const locale = useLocale();
  const timeZone = useTimeZone();
  const on = status?.donating ?? false;
  const count = status?.count ?? 0;
  const titleId = React.useId();

  return (
    <div
      className={gcn(
        SCREEN_CLASSES,
        'relative gap-[14px] px-4 pb-7 pt-[22px]',
        framed && 'h-[844px] min-h-0 overflow-hidden',
      )}
    >
      <header className="flex items-center gap-3">
        <IconButton asChild aria-label={t('back')}>
          <Link href={backHref}>
            <BackIcon width={20} height={20} />
          </Link>
        </IconButton>
        <h1 className="font-display text-[24px] font-semibold">{t('title')}</h1>
      </header>

      <h2 className={SECTION_LABEL}>{t('voiceHeading')}</h2>
      <section
        className={gcn(
          'flex flex-col gap-2.5 rounded-[20px] border bg-surface px-4 py-[14px]',
          on ? 'border-stage-sprout-leaf' : 'border-border',
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex flex-grow flex-col gap-1">
            <span id={titleId} className="text-[15px] font-bold leading-[1.35]">
              {t('donate.title')}
            </span>
            <span className="text-[13px] leading-[1.45] text-muted-foreground">
              {t('donate.body')}
            </span>
          </div>
          <Switch
            size="sm"
            checked={on}
            disabled={!status || busy}
            aria-label={t('donate.switchLabel')}
            onCheckedChange={onSwitch}
          />
        </div>
        {on ? (
          <>
            <p className="m-0 rounded-[14px] bg-[#EEF4EC] px-3 py-2.5 text-[14px] text-forest">
              {t.rich('donate.donated', {
                count,
                date: status?.since ? formatSince(status.since, locale, timeZone) : '',
                b: (chunks) => <b>{chunks}</b>,
              })}
            </p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {(['pointCode', 'pointListen', 'pointKept'] as const).map((key) => (
                <li key={key} className="flex gap-2 text-[13px] leading-[1.4] text-soft-text">
                  <CheckIcon
                    width={16}
                    height={16}
                    stroke="var(--color-success)"
                    strokeWidth="2.6"
                    className="mt-0.5 shrink-0"
                  />
                  <span>{t(`donate.${key}`)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <span className="text-[13px] text-muted-foreground">{t('donate.off')}</span>
        )}
        {count > 0 ? (
          <button
            type="button"
            onClick={onAskDelete}
            disabled={busy}
            className="h-[46px] rounded-[14px] border-[1.5px] border-primary bg-surface text-[14px] font-bold text-primary-text disabled:opacity-60"
          >
            {t('donate.delete')}
          </button>
        ) : null}
        <Link href={links.how} className="text-[13px] font-bold text-forest underline">
          {t('donate.how')}
        </Link>
      </section>

      <h2 className={SECTION_LABEL}>{t('dataHeading')}</h2>
      <nav className="flex flex-col rounded-[20px] border border-border bg-surface">
        {(
          [
            ['download', links.download],
            ['privacy', links.privacy],
            ['terms', links.terms],
            ['deleteAccount', links.deleteAccount],
          ] as const
        ).map(([key, href]) => (
          <Link key={key} href={href} className={DATA_ROW}>
            <span
              className={gcn(
                'flex-grow text-[15px] font-semibold',
                key === 'deleteAccount' && 'text-primary-text',
              )}
            >
              {t(`data.${key}`)}
            </span>
            <ChevronRightIcon width={16} height={16} stroke="var(--color-text-muted)" />
          </Link>
        ))}
      </nav>

      <div role="status" aria-live="polite" className="mt-auto">
        {toast ? (
          <div className="rounded-[14px] bg-text px-[14px] py-3 text-[14px] text-white">{toast}</div>
        ) : null}
      </div>

      <Overlay
        open={overlay === 'confirm'}
        onDismiss={onDismiss}
        framed={framed}
        kind="sheet"
        label={t('confirm.title')}
      >
        <ConfirmSheet
          region={region}
          onRegionChange={onRegionChange}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
          busy={busy}
        />
      </Overlay>
      <Overlay
        open={overlay === 'delete'}
        onDismiss={onDismiss}
        framed={framed}
        kind="alert"
        label={t('deleteDialog.title', { count })}
      >
        <div className="flex flex-col gap-3 rounded-[24px] bg-surface p-5">
          <span className="font-display text-[22px] font-semibold leading-[1.2]">
            {t('deleteDialog.title', { count })}
          </span>
          <span className="text-[14px] leading-[1.5] text-soft-text">{t('deleteDialog.body')}</span>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="h-[50px] rounded-[14px] bg-primary text-[15px] font-bold text-white disabled:opacity-60"
          >
            {t('deleteDialog.confirm')}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="h-11 text-[15px] font-semibold text-forest"
          >
            {t('deleteDialog.cancel')}
          </button>
        </div>
      </Overlay>
    </div>
  );
}

/** "12 Oct 2026" · "12/10/2026" · "2026年10月12日" (English day first, as the canvas). */
export function formatSince(date: Date, locale: string, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = locale.startsWith('vi')
    ? { day: '2-digit', month: '2-digit', year: 'numeric' }
    : locale.startsWith('zh')
      ? { dateStyle: 'long' }
      : { day: 'numeric', month: 'short', year: 'numeric' };
  const tag = locale.startsWith('en') ? 'en-GB' : locale;
  return new Intl.DateTimeFormat(tag, { ...options, timeZone }).format(date);
}

function ConfirmSheet({
  region,
  onRegionChange,
  onConfirm,
  onDismiss,
  busy,
}: {
  region: VoiceDonationRegion | 'none' | null;
  onRegionChange: (region: VoiceDonationRegion | 'none') => void;
  onConfirm: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  const t = useTranslations('screens.privacy.confirm');
  const regionLabelId = React.useId();
  return (
    <div className="flex flex-col gap-[14px] rounded-t-[28px] bg-bg px-5 pb-7 pt-2.5">
      <span aria-hidden="true" className="h-[5px] w-10 self-center rounded-[3px] bg-disabled" />
      <span className="font-display text-[24px] font-semibold leading-[1.15]">{t('title')}</span>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {(['line1', 'line2', 'line3', 'line4'] as const).map((key, index) => (
          <li key={key} className="flex gap-2.5 text-[14px] leading-[1.45] text-text">
            <span
              aria-hidden="true"
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-rating-good text-[12px] font-bold text-forest"
            >
              {index + 1}
            </span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2">
        <span id={regionLabelId} className="text-[13px] font-bold text-muted-foreground">
          {t('regionQuestion')}
        </span>
        <div role="radiogroup" aria-labelledby={regionLabelId} className="flex flex-wrap gap-1.5">
          {[...VOICE_DONATION_REGIONS, 'none' as const].map((key) => {
            const picked = region === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={picked}
                onClick={() => onRegionChange(key)}
                className={gcn(
                  'h-9 rounded-[18px] border px-3 text-[13px] font-semibold text-text',
                  picked ? 'border-forest bg-rating-good' : 'border-border bg-surface',
                )}
              >
                {t(`regions.${key}`)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-2.5">
        <button
          type="button"
          onClick={onDismiss}
          className="h-[54px] flex-1 rounded-2xl border border-disabled bg-surface text-[16px] font-bold text-text"
        >
          {t('notNow')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="h-[54px] flex-1 rounded-2xl bg-forest text-[16px] font-bold text-white disabled:opacity-60"
        >
          {t('yes')}
        </button>
      </div>
    </div>
  );
}

/**
 * The scrim and the panel: the sheet at the bottom, the alert in the
 * middle. Framed (reference pages): drawn inside the screen. Live: a
 * Radix dialog in the garden root, so focus, Escape and the scroll lock
 * work; a tap on the scrim is "Not now" / Cancel.
 */
function Overlay({
  open,
  onDismiss,
  framed,
  kind,
  label,
  children,
}: {
  open: boolean;
  onDismiss: () => void;
  framed: boolean;
  kind: 'sheet' | 'alert';
  label: string;
  children: React.ReactNode;
}) {
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!framed) setContainer(document.querySelector<HTMLElement>('[data-ui="garden"]'));
  }, [framed]);

  const place =
    kind === 'sheet'
      ? 'inset-x-0 bottom-0 mx-auto w-full max-w-[560px]'
      : 'inset-x-5 top-1/2 mx-auto max-w-[400px] -translate-y-1/2';

  if (framed) {
    if (!open) return null;
    return (
      <>
        <div aria-hidden="true" className="absolute inset-0 bg-scrim" />
        <div
          role={kind === 'alert' ? 'alertdialog' : 'dialog'}
          aria-modal="true"
          aria-label={label}
          className={gcn('absolute', place)}
        >
          {children}
        </div>
      </>
    );
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? undefined : onDismiss())}>
      <DialogPrimitive.Portal container={container ?? undefined}>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-ui={container ? undefined : 'garden'}
          role={kind === 'alert' ? 'alertdialog' : 'dialog'}
          aria-describedby={undefined}
          className={gcn(
            'fixed z-50 text-text outline-none',
            place,
            kind === 'sheet' &&
              'pb-safe data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom motion-reduce:animate-none',
          )}
        >
          <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
