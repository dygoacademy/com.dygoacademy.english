'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';
import { Switch } from './Switch';

/**
 * Body of "Start a garden" (canvas GR7), also used to edit a garden's
 * name, description and visibility (the classic GroupSettingsPanel): the
 * name field, an optional "About", the Open-garden switch, a note, and the
 * primary button. Controlled: the live sheet owns the values.
 */
export interface CreateGardenBodyProps {
  name: string;
  about: string;
  open: boolean;
  onNameChange?: (value: string) => void;
  onAboutChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: () => void;
  /** Example text in the empty fields. */
  namePlaceholder?: string;
  aboutPlaceholder: string;
  /** Button label: "Create garden" / "Save changes". */
  submitLabel: string;
  /** The note above the button; omit to hide it. */
  note?: string;
  busy?: boolean;
  error?: string | null;
  /** Extra actions under the button (edit mode: delete). */
  footer?: React.ReactNode;
}

const FIELD =
  'box-border min-h-12 w-full rounded-[14px] border bg-garden-surface px-[14px] py-3 text-[16px] leading-[1.4] text-garden-text outline-none placeholder:text-garden-placeholder focus:border-garden-forest';

export function CreateGardenBody({
  name,
  about,
  open,
  onNameChange,
  onAboutChange,
  onOpenChange,
  onSubmit,
  namePlaceholder,
  aboutPlaceholder,
  submitLabel,
  note,
  busy = false,
  error,
  footer,
}: CreateGardenBodyProps) {
  const t = useTranslations('screens.groups.create');
  const nameId = React.useId();
  const aboutId = React.useId();
  const canSubmit = name.trim().length > 0 && !busy;

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit?.();
      }}
    >
      <label htmlFor={nameId} className="flex flex-col gap-1.5">
        <span className="text-[12px] font-bold uppercase tracking-[.08em] text-garden-muted">
          {t('name')}
        </span>
        <input
          id={nameId}
          value={name}
          maxLength={120}
          required
          placeholder={namePlaceholder}
          onChange={(event) => onNameChange?.(event.target.value)}
          className={gcn(FIELD, name ? 'border-garden-forest' : 'border-garden-border')}
        />
      </label>
      <label htmlFor={aboutId} className="flex flex-col gap-1.5">
        <span className="text-[12px] font-bold uppercase tracking-[.08em] text-garden-muted">
          {t('about')}
        </span>
        <textarea
          id={aboutId}
          value={about}
          rows={1}
          maxLength={500}
          placeholder={aboutPlaceholder}
          onChange={(event) => onAboutChange?.(event.target.value)}
          className={gcn(FIELD, 'block resize-none border-garden-border [field-sizing:content]')}
        />
      </label>
      <div className="flex items-center gap-3 rounded-control border border-garden-border bg-garden-surface px-[14px] py-3">
        <div className="flex flex-grow flex-col">
          <span className="text-[14px] font-bold">{t('openTitle')}</span>
          <span className="text-[12px] text-garden-muted">{open ? t('openOn') : t('openOff')}</span>
        </div>
        <Switch checked={open} onCheckedChange={onOpenChange} aria-label={t('openTitle')} />
      </div>
      {note ? <span className="px-1 text-[13px] text-garden-muted">{note}</span> : null}
      {error ? (
        <p role="alert" className="px-1 text-[13px] text-garden-primary-text">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!canSubmit && Boolean(onSubmit)}
        className="flex h-14 items-center justify-center rounded-[18px] bg-garden-primary text-[17px] font-bold text-white shadow-press-primary transition-transform duration-press ease-garden active:translate-y-[2px] disabled:bg-garden-disabled disabled:text-garden-text disabled:shadow-none"
      >
        {submitLabel}
      </button>
      {footer}
    </form>
  );
}
