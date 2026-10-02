import { gcn } from './cn';

/**
 * Stat tile (canvas A3 / A8): white, 1px border, radius 16, the number in
 * Fraunces semibold and a 12px muted label. `size="md"` is the Mission
 * complete tile (24px number, 12px padding); `size="sm"` the Me tile
 * (22px number, 10px padding, tighter label); `size="lg"` the quiz result
 * tile (Q6–Q8: 26px number, 12/14px padding, 13px label). `tone` colours
 * the number (`muted` for a zero count).
 * Pass the number already formatted for the learner's locale.
 */
const TONE = {
  default: '',
  success: 'text-success',
  forest: 'text-forest',
  gold: 'text-gold-text',
  muted: 'text-placeholder',
} as const;

const PADDING = { md: 'p-3', sm: 'p-2.5', lg: 'px-[14px] py-3' } as const;
const NUMBER = { md: 'text-[24px]', sm: 'text-[22px]', lg: 'text-[26px]' } as const;
const LABEL = { md: 'text-[12px]', sm: 'text-[12px] leading-[1.2]', lg: 'text-[13px]' } as const;

export function StatTile({
  value,
  label,
  size = 'md',
  tone = 'default',
  className,
}: {
  value: string;
  label: string;
  size?: 'md' | 'sm' | 'lg';
  tone?: keyof typeof TONE;
  className?: string;
}) {
  return (
    <div
      className={gcn(
        'flex flex-col gap-0.5 rounded-control border border-border bg-surface',
        PADDING[size],
        className,
      )}
    >
      <span
        className={gcn(
          'font-display font-semibold',
          NUMBER[size],
          TONE[tone],
        )}
      >
        {value}
      </span>
      <span className={gcn('text-muted-foreground', LABEL[size])}>
        {label}
      </span>
    </div>
  );
}
