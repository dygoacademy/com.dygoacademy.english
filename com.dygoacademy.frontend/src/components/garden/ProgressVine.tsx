import { gcn } from './cn';
import { LeafIcon } from './icons';

/**
 * Progress vine (canvas A2): a 10px track (radius 5) with a leaf-green
 * fill and a 22px leaf riding the end of the fill. A real progressbar
 * with a text equivalent (e.g. "15 of 18 words watered") as `valueText`.
 */
export function ProgressVine({
  value,
  max,
  valueText,
  className,
}: {
  value: number;
  max: number;
  /** Localised text equivalent, e.g. t('…', { done, total }). */
  valueText: string;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
      aria-valuetext={valueText}
      className={gcn('relative h-2.5 rounded-[5px] bg-track', className)}
    >
      <div
        className="h-2.5 rounded-[5px] bg-stage-tree-canopy transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
      <LeafIcon
        width={22}
        height={22}
        className="absolute top-[-9px]"
        style={{ left: `calc(${percent}% - 11px)` }}
      />
    </div>
  );
}
