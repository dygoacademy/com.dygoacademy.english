import { gcn } from './cn';

/**
 * Stat tile (design system §11): radius-md, number in `display-m` with
 * tabular figures (§4.2) + a `label`. Pass the number already formatted
 * with Intl.NumberFormat for the learner's locale (§14.4).
 */
export function StatTile({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={gcn(
        'flex flex-col gap-1 rounded-control border border-garden-border bg-garden-surface p-3',
        className,
      )}
    >
      <span className="tabular-nums-stat font-display text-display-m">{value}</span>
      <span className="text-label text-garden-muted">{label}</span>
    </div>
  );
}
