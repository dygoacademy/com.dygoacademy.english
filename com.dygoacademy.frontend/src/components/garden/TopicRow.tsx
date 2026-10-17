import type * as React from 'react';
import Link from 'next/link';

import { gcn } from './cn';
import { LockIcon, SeedPackIcon } from './icons';
import { PlantGlyph } from './PlantGlyph';
import type { PlantStage } from './plantStage';

/**
 * Topic row (canvas A6): a card link, 76px or taller. A 56px forest tile
 * with the topic's leading plant, the title (16px bold, up to 2 lines then
 * "…", 2026-10-17) with the due badge (or "All watered") top-right on one
 * line, the meta line (12px, one line), and a 6px bar split into fruiting
 * / flowering / sprouting shares.
 *
 * `shares` are percentages of the topic's words (0–100). Leave `due` out
 * when the count isn't known; nothing is shown then.
 */
export interface TopicRowProps {
  href: string;
  /** Text, or a node (A6b highlights the matched letters). */
  title: React.ReactNode;
  /** The full name as text, shown on hover when the title is cut (defaults to `title` when it's a string). */
  titleText?: string;
  meta: string;
  /** Leading plant on the tile: the stage most words are in. */
  stage: PlantStage;
  due?: { text: string; tone: 'due' | 'watered' } | null;
  shares?: { tree: number; flower: number; sprout: number } | null;
  className?: string;
}

export function TopicRow({
  href,
  title,
  titleText,
  meta,
  stage,
  due,
  shares,
  className,
}: TopicRowProps) {
  return (
    <Link
      href={href}
      className={gcn(
        'flex min-h-[76px] shrink-0 items-center gap-3 rounded-card border border-border bg-surface py-2.5 pl-2.5 pr-[14px] text-text',
        'transition-colors duration-quick ease-garden hover:border-muted-foreground active:bg-surface-sunken',
        className,
      )}
    >
      <span className="flex h-14 w-14 shrink-0 items-end justify-center overflow-hidden rounded-control bg-forest">
        <PlantGlyph stage={stage} variant="topic" />
      </span>
      <span className="flex min-w-0 flex-grow flex-col gap-[5px]">
        <span className="flex items-start justify-between gap-2">
          <span
            title={titleText ?? (typeof title === 'string' ? title : undefined)}
            className="line-clamp-2 min-w-0 break-words text-[16px] font-bold leading-[1.25]"
          >
            {title}
          </span>
          {due ? (
            due.tone === 'due' ? (
              <span className="mt-px shrink-0 whitespace-nowrap rounded-[10px] bg-water-soft px-2 py-[3px] text-[12px] font-bold text-water-text">
                {due.text}
              </span>
            ) : (
              <span className="mt-0.5 shrink-0 whitespace-nowrap text-[12px] font-semibold text-success">
                {due.text}
              </span>
            )
          ) : null}
        </span>
        <span className="truncate text-[12px] text-muted-foreground">{meta}</span>
        <span
          aria-hidden="true"
          className="flex h-1.5 shrink-0 overflow-hidden rounded-[3px] bg-track"
        >
          {shares ? (
            <>
              <span className="bg-success" style={{ width: `${shares.tree}%` }} />
              <span className="bg-stage-flower" style={{ width: `${shares.flower}%` }} />
              <span className="bg-stage-sprout" style={{ width: `${shares.sprout}%` }} />
            </>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

/**
 * Locked seed pack (canvas A6): dashed, sunk, with the pale seed, the pack
 * name and what unlocks it, and a padlock labelled for VoiceOver.
 */
export function LockedTopicRow({
  title,
  hint,
  lockedLabel,
  className,
}: {
  title: string;
  hint: string;
  lockedLabel: string;
  className?: string;
}) {
  return (
    <div
      className={gcn(
        'flex h-[76px] shrink-0 items-center gap-3 rounded-card border border-dashed border-locked-border bg-locked-bg pl-2.5 pr-[14px]',
        className,
      )}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control bg-border">
        <SeedPackIcon width={30} height={30} seed="var(--color-locked-seed)" sprout={false} />
      </span>
      <span className="flex flex-grow flex-col gap-[3px]">
        <span className="text-[16px] font-bold text-locked-text">{title}</span>
        <span className="text-[12px] text-muted-foreground">{hint}</span>
      </span>
      <LockIcon
        width={20}
        height={20}
        stroke="var(--color-text-muted)"
        role="img"
        aria-hidden={undefined}
        aria-label={lockedLabel}
      />
    </div>
  );
}
