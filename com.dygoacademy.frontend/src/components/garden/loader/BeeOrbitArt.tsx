import { BeeShape } from '../Bee';

const ORBIT =
  'M195 82 C 280 80, 322 112, 322 150 C 322 190, 280 220, 195 218 C 110 220, 68 190, 68 150 C 68 112, 110 84, 195 82';

/** Pollen dots at the top, right, bottom and left of the orbit, with when the bee passes each. */
const POLLEN = [
  { cx: 195, cy: 82, delay: '-0.5s' },
  { cx: 322, cy: 150, delay: '-3.65s' },
  { cx: 195, cy: 218, delay: '-2.6s' },
  { cx: 68, cy: 150, delay: '-1.55s' },
] as const;

/**
 * LD3 "Bee's flight" art (canvas `LoadingBee`, `reference/LD3-loading-bee.png`):
 * a dotted orbit around "dygo", four pollen dots that glow as the bee
 * passes, and the bee flying the path in 4.2 s (it faces left on the lower
 * half). The base styles are the still frame (bee near the top). Decorative.
 */
export function BeeOrbitArt() {
  return (
    <svg
      width="390"
      height="320"
      viewBox="0 0 390 320"
      aria-hidden="true"
      focusable="false"
      className="overflow-visible"
    >
      <path
        className="dg-ld-trail"
        d={ORBIT}
        fill="none"
        stroke="#C9BFA8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 7"
      />
      {POLLEN.map((p) => (
        <circle
          key={`${p.cx}-${p.cy}`}
          className="dg-ld-pol"
          cx={p.cx}
          cy={p.cy}
          r="3"
          fill="#F2C744"
          style={{ animationDelay: p.delay }}
        />
      ))}
      <text
        x="195"
        y="164"
        textAnchor="middle"
        className="font-display"
        style={{ fontWeight: 600, fontSize: 40, fill: '#24463A' }}
      >
        {'dygo'}
      </text>
      <g className="dg-ld-beeC">
        <g className="dg-ld-face">
          <g transform="translate(-16 -17)">
            <BeeShape flap />
          </g>
        </g>
      </g>
    </svg>
  );
}
