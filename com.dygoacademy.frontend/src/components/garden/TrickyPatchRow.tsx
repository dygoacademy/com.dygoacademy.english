import { gcn } from './cn';
import { WiltSprout } from './groupArt';

/**
 * One tricky patch (canvas GR3): a word the garden missed often, with the
 * group's totals ("14 misses · 4 gardeners") and a bar scaled to the most
 * missed word. Aggregate only: never one person's answers (FR-1.2).
 */
export interface TrickyPatchRowProps {
  word: string;
  /** Pre-formatted totals line. */
  meta: string;
  /** 0–100, relative to the most-missed word. */
  share: number;
  className?: string;
}

export function TrickyPatchRow({ word, meta, share, className }: TrickyPatchRowProps) {
  return (
    <li className={gcn('flex items-center gap-2.5 py-2', className)}>
      <WiltSprout width={26} height={26} />
      <div className="flex flex-grow flex-col gap-1">
        <div className="flex justify-between">
          <span className="text-[15px] font-bold" lang="en">
            {word}
          </span>
          <span className="text-[13px] text-muted-foreground">{meta}</span>
        </div>
        <div aria-hidden="true" className="h-1.5 rounded-[3px] bg-track">
          <div
            className="h-1.5 rounded-[3px] bg-[var(--color-locked-seed)]"
            style={{ width: `${Math.max(0, Math.min(100, Math.round(share)))}%` }}
          />
        </div>
      </div>
    </li>
  );
}
