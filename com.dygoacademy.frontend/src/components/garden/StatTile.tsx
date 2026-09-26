import { gcn } from './cn';

/**
 * Stat tile (canvas A3 / A8): white, 1px border, radius 16, the number in
 * Fraunces semibold and a 12px muted label. `size="md"` is the Mission
 * complete tile (24px number, 12px padding); `size="sm"` the Me tile
 * (22px number, 10px padding, tighter label). `tone` colours the number.
 * Pass the number already formatted for the learner's locale.
 */
const TONE = {
  default: '',
  success: 'text-garden-success',
  forest: 'text-garden-forest',
  gold: 'text-garden-gold-text',
} as const;

export function StatTile({
  value,
  label,
  size = 'md',
  tone = 'default',
  className,
}: {
  value: string;
  label: string;
  size?: 'md' | 'sm';
  tone?: keyof typeof TONE;
  className?: string;
}) {
  return (
    <div
      className={gcn(
        'flex flex-col gap-0.5 rounded-control border border-garden-border bg-garden-surface',
        size === 'md' ? 'p-3' : 'p-2.5',
        className,
      )}
    >
      <span
        className={gcn(
          'font-display font-semibold',
          size === 'md' ? 'text-[24px]' : 'text-[22px]',
          TONE[tone],
        )}
      >
        {value}
      </span>
      <span className={gcn('text-[12px] text-garden-muted', size === 'sm' && 'leading-[1.2]')}>
        {label}
      </span>
    </div>
  );
}
