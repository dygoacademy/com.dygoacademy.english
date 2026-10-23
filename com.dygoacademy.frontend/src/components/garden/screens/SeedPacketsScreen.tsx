'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { SeedPacketKind } from '@/types';

import { buttonClassName } from '../buttonStyles';
import { gcn } from '../cn';
import { BackIcon } from '../icons';
import { IconButton } from '../IconButton';

/**
 * S3 Pick a seed packet (canvas "Adult · Seeds & Harvest", values from
 * docs/design/garden/reference/S3-seed-packets.html and -goal.html).
 *
 * Back · Fraunces 24 title → intro → up to 3 packets as a radio group
 * (packet art in the kind's colour, kind overline, Fraunces 20 name, the
 * collection · level · words line, the "why" pill); the picked one gets
 * the forest border and wash → "Plant <bed>" and Browse all topics.
 *
 * Props only; SeedPacketsLive owns the data and the planting.
 */
export interface SeedPacketView {
  id: string;
  kind: SeedPacketKind;
  name: string;
  /** "IELTS Academic · B2 · 32 words". */
  meta: string;
  /** "6 words already growing", "Next on your Road to Band 7", "A new interest". */
  why: string;
}

export interface SeedPacketsScreenProps {
  backHref: string;
  browseHref: string;
  packets: ReadonlyArray<SeedPacketView>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlant: () => void;
  planting?: boolean;
  /** Planting failed: shown under the button. */
  error?: string | null;
}

const KIND: Record<SeedPacketKind, { band: string; text: string }> = {
  bee: { band: 'var(--stage-tree-fruit)', text: 'text-gold-soft-text' },
  goal: { band: 'var(--color-water)', text: 'text-water-deep' },
  new: { band: 'var(--color-primary)', text: 'text-primary-text' },
};

export function SeedPacketsScreen({
  backHref,
  browseHref,
  packets,
  selectedId,
  onSelect,
  onPlant,
  planting = false,
  error,
}: SeedPacketsScreenProps) {
  const t = useTranslations('screens.seedPackets');
  const selected = packets.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] overflow-hidden bg-bg px-[18px] pb-[26px] pt-5 text-text">
      <div className="flex items-center gap-3">
        <IconButton asChild aria-label={t('back')}>
          <Link href={backHref}>
            <BackIcon width={20} height={20} />
          </Link>
        </IconButton>
        <h1 className="grow font-display text-[24px] font-semibold leading-[1.15]">{t('title')}</h1>
      </div>
      <p className="text-[15px] leading-[1.4] text-muted-foreground">{t('intro')}</p>

      <div role="radiogroup" aria-label={t('groupLabel')} className="flex flex-col gap-2.5">
        {packets.map((p) => {
          const checked = p.id === selectedId;
          const kind = KIND[p.kind];
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onSelect(p.id)}
              className={gcn(
                'packet-rise flex items-center gap-[14px] rounded-[22px] border-2 py-3 pl-3 pr-[14px] text-left text-text',
                checked ? 'border-forest bg-forest-wash' : 'border-border bg-surface',
              )}
            >
              <PacketArt band={kind.band} />
              <span className="flex min-w-0 grow flex-col gap-[3px]">
                <span className={gcn('overline-label text-[11px] font-extrabold', kind.text)}>
                  {t(`kind.${p.kind}`)}
                </span>
                <span className="font-display text-[20px] font-semibold leading-[1.15]">
                  {p.name}
                </span>
                <span className="text-[13px] text-muted-foreground">{p.meta}</span>
                <span className="mt-[3px] self-start rounded-lg bg-forest-wash px-2 py-[3px] text-[12px] font-bold text-forest">
                  {p.why}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onPlant}
          disabled={!selected || planting}
          className={buttonClassName('primary', {
            className: 'h-[56px] text-[16px] md:max-w-none',
          })}
        >
          {selected ? t('plant', { bed: selected.name }) : t('pick')}
        </button>
        {error ? (
          <p role="alert" className="text-center text-[13px] text-primary-text">
            {error}
          </p>
        ) : null}
        <Link
          href={browseHref}
          className="self-center p-2 text-[14px] font-semibold text-muted-foreground underline"
        >
          {t('browse')}
        </Link>
      </div>
    </div>
  );
}

/** The canvas seed packet (56 × 70), its band and sprout in the kind's colour. */
function PacketArt({ band }: { band: string }) {
  return (
    <svg width="56" height="70" viewBox="0 0 56 70" aria-hidden="true" className="shrink-0">
      <path d="M4 10 L8 3 H48 L52 10 Z" fill="var(--color-track)" />
      <path
        d="M4 10 H52 L50 66 H6 Z"
        fill="var(--color-surface)"
        stroke="var(--color-border)"
        strokeWidth="1.5"
      />
      <rect x="4" y="10" width="48" height="14" fill={band} />
      <path d="M28 58 V40" stroke={band} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M28 46 C22 46 19 42 20 37 C25 37 28 41 28 46 Z" fill={band} />
      <path d="M28 43 C34 43 37 39 36 34 C31 34 28 38 28 43 Z" fill={band} opacity=".6" />
    </svg>
  );
}
