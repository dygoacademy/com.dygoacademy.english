import type { SpeakingStage } from '@/types';

/**
 * One plant per speaking stage, drawn as in SpeakDone.dc.html (the SP4
 * garden) and used small on SP3's stage score: seed · sprout · bloom ·
 * fruit. The seed isn't in the design files; it's a seed on a small mound.
 */
const C = {
  stem: 'var(--stage-sprout-leaf)', // #9CC39A
  leaf2: 'var(--stage-sprout)', // #B7D6AE
  petal: 'var(--stage-flower)', // #E8A87C
  heart: 'var(--color-gold-light)', // #F2D28B
  canopy: 'var(--stage-tree-canopy)', // #7FA487
  trunk: 'var(--stage-trunk)', // #8A6A4F
  seed: 'var(--stage-seed)', // #6B5040
  fruit: 'var(--stage-tree-fruit)', // #E0B04A
} as const;

function Art({ stage }: { stage: SpeakingStage }) {
  switch (stage) {
    case 'fruit':
      return (
        <>
          <rect x={18} y={100} width={4} height={30} fill={C.trunk} />
          <circle cx={20} cy={88} r={18} fill={C.canopy} />
          <circle cx={8} cy={99} r={11} fill={C.canopy} />
          <circle cx={32} cy={99} r={11} fill={C.canopy} />
          <circle cx={13} cy={86} r={2.5} fill={C.fruit} />
          <circle cx={27} cy={90} r={2.5} fill={C.fruit} />
          <circle cx={19} cy={100} r={2.5} fill={C.fruit} />
        </>
      );
    case 'bloom':
      return (
        <>
          <path d="M20 130 V94" stroke={C.stem} strokeWidth={2.5} />
          <path d="M20 118 C13 117 9 112 11 107 C17 107 20 112 20 118 Z" fill={C.stem} />
          {[
            [20, 82],
            [26, 87],
            [24, 94],
            [16, 94],
            [14, 87],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={C.petal} />
          ))}
          <circle cx={20} cy={89} r={4} fill={C.heart} />
        </>
      );
    case 'sprout':
      return (
        <>
          <path d="M20 130 V110" stroke={C.stem} strokeWidth={2.5} />
          <path d="M20 118 C13 117 9 112 11 107 C17 107 20 112 20 118 Z" fill={C.stem} />
          <path d="M20 114 C27 113 31 108 29 103 C23 103 20 108 20 114 Z" fill={C.leaf2} />
        </>
      );
    default:
      return (
        <>
          <ellipse cx={20} cy={130} rx={12} ry={5} fill={C.trunk} opacity={0.5} />
          <ellipse cx={20} cy={123} rx={4.5} ry={6} fill={C.seed} transform="rotate(-20 20 123)" />
        </>
      );
  }
}

export function SpeakingPlant({ stage, size = 40 }: { stage: SpeakingStage; size?: number }) {
  return (
    <svg
      data-stage={stage}
      width={size}
      height={size * 1.5}
      viewBox="0 70 40 60"
      aria-hidden="true"
      className="overflow-visible"
    >
      <Art stage={stage} />
    </svg>
  );
}
