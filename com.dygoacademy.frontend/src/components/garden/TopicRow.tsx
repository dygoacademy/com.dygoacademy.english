import type * as React from 'react';
import Link from 'next/link';

import { gcn } from './cn';
import { LockIcon, SeedPackIcon } from './icons';
import { PlantGlyph } from './PlantGlyph';
import type { PlantStage } from './plantStage';

/**
 * Topic row (canvas A6): a 76px card link. A 56px forest tile with the
 * topic's leading plant, the title (16px bold) with the due badge (or
 * "All watered"), the meta line (12px), and a 6px bar split into fruiting
 * / flowering / sprouting shares.
 *
 * `shares` are percentages of the topic's words (0–100). Leave `due` out
 * when the count isn't known; nothing is shown then.
 */
export interface TopicRowProps {
  href: string;
  /** Text, or a node (A6b highlights the matched letters). */
  title: React.ReactNode;
  meta: string;
  /** Leading plant on the tile: the stage most words are in. */
  stage: PlantStage;
  due?: { text: string; tone: 'due' | 'watered' } | null;
  shares?: { tree: number; flower: number; sprout: number } | null;
  className?: string;
}

export function TopicRow({ href, title, meta, stage, due, shares, className }: TopicRowProps) {
  return (
    <Link
      href={href}
      className={gcn(
        'flex h-[76px] items-center gap-3 rounded-card border border-border bg-surface pl-2.5 pr-[14px] text-text',
        'transition-colors duration-quick ease-garden hover:border-muted-foreground active:bg-surface-sunken',
        className,
      )}
    >
      <span className="flex h-14 w-14 shrink-0 items-end justify-center overflow-hidden rounded-control bg-forest">
        <PlantGlyph stage={stage} variant="topic" />
      </span>
      <span className="flex min-w-0 flex-grow flex-col gap-[5px]">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[16px] font-bold">{title}</span>
          {due ? (
            due.tone === 'due' ? (
              <span className="shrink-0 rounded-[10px] bg-water-soft px-2 py-[3px] text-[12px] font-bold text-water-text">
                {due.text}
              </span>
            ) : (
              <span className="shrink-0 text-[12px] font-semibold text-success">
                {due.text}
              </span>
            )
          ) : null}
        </span>
        <span className="text-[12px] text-muted-foreground">{meta}</span>
        <span
          aria-hidden="true"
          className="flex h-1.5 overflow-hidden rounded-[3px] bg-track"
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
        'flex h-[76px] items-center gap-3 rounded-card border border-dashed border-locked-border bg-locked-bg pl-2.5 pr-[14px]',
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
