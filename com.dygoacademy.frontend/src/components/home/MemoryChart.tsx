import * as React from 'react';

/**
 * Home page · "Reviews spread out as a word grows" memory chart (canvas page
 * "Landing Page", 2026-10-10). Paths copied from the boards so the card draws
 * like the reference: memory of a word over a few weeks without review (grey,
 * dashed: it fades fast) and with Dygo (forest: each review, a blue dot, brings
 * it back, and it fades more slowly each time). An illustration, not data.
 */
const WITH_DYGO = 'M6.0 10.0 L8.5 16.8 L11.0 23.0 L13.6 28.9 L16.1 34.3 L18.6 39.3 L21.1 44.0 L23.6 48.3 L26.2 52.3 L26.2 10.0 L26.2 10.0 L28.6 14.6 L31.0 18.9 L33.4 23.0 L35.8 27.0 L38.2 30.7 L40.6 34.3 L43.0 37.7 L45.4 40.9 L47.8 44.0 L50.2 46.9 L52.6 49.7 L55.0 52.3 L55.0 10.0 L55.0 10.0 L57.4 13.1 L59.8 16.0 L62.2 18.9 L64.6 21.7 L67.0 24.4 L69.4 27.0 L71.8 29.5 L74.2 31.9 L76.6 34.3 L79.0 36.6 L81.4 38.8 L83.8 40.9 L86.2 43.0 L88.6 45.0 L91.0 46.9 L93.4 48.7 L95.8 50.6 L98.2 52.3 L98.2 10.0 L98.2 10.0 L100.6 11.9 L103.1 13.8 L105.6 15.6 L108.1 17.4 L110.6 19.2 L113.1 20.9 L115.5 22.6 L118.0 24.3 L120.5 25.9 L123.0 27.5 L125.5 29.1 L128.0 30.6 L130.4 32.1 L132.9 33.6 L135.4 35.0 L137.9 36.4 L140.4 37.8 L142.8 39.1 L145.3 40.5 L147.8 41.8 L150.3 43.0 L152.8 44.3 L155.3 45.5 L157.7 46.7 L160.2 47.9 L162.7 49.0 L165.2 50.1 L167.7 51.2 L170.2 52.3 L170.2 10.0 L170.2 10.0 L172.6 11.1 L175.0 12.2 L177.4 13.2 L179.9 14.3 L182.3 15.4 L184.7 16.4 L187.2 17.4 L189.6 18.4 L192.0 19.4 L194.4 20.4 L196.9 21.4 L199.3 22.3 L201.7 23.3 L204.2 24.2 L206.6 25.2 L209.0 26.1 L211.4 27.0 L213.9 27.9 L216.3 28.8 L218.7 29.6 L221.2 30.5 L223.6 31.4 L226.0 32.2 L228.4 33.1 L230.9 33.9 L233.3 34.7 L235.7 35.5 L238.2 36.3 L240.6 37.1 L243.0 37.9 L245.4 38.6 L247.9 39.4 L250.3 40.2 L252.7 40.9 L255.1 41.6 L257.6 42.4 L260.0 43.1 L262.4 43.8 L264.9 44.5 L267.3 45.2 L269.7 45.9 L272.1 46.5 L274.6 47.2 L277.0 47.9 L279.4 48.5 L281.9 49.2 L284.3 49.8 L286.7 50.4 L289.1 51.1 L291.6 51.7 L294.0 52.3 L294.0 10.0';
const WITHOUT_REVIEW = 'M6.0 10.0 L8.2 19.4 L10.3 27.8 L12.5 35.3 L14.6 42.1 L16.8 48.2 L19.0 53.7 L21.1 58.6 L23.3 63.0 L25.4 67.0 L27.6 70.6 L29.8 73.8 L31.9 76.7 L34.1 79.2 L36.2 81.6 L38.4 83.7 L40.6 85.5 L42.7 87.2 L44.9 88.7 L47.0 90.1 L49.2 91.3 L51.4 92.4 L53.5 93.4 L55.7 94.3 L57.8 95.1 L60.0 95.8 L62.2 96.4 L64.3 97.0 L66.5 97.5 L68.6 98.0 L70.8 98.4 L73.0 98.8 L75.1 99.1 L77.3 99.4 L79.4 99.7 L81.6 100.0 L83.8 100.2 L85.9 100.4 L88.1 100.5 L90.2 100.7 L92.4 100.9 L94.6 101.0 L96.7 101.1 L98.9 101.2 L101.0 101.3 L103.2 101.4 L105.4 101.5 L107.5 101.5 L109.7 101.6 L111.8 101.6 L114.0 101.7 L116.2 101.7 L118.3 101.8 L120.5 101.8 L122.6 101.8 L124.8 101.9 L127.0 101.9 L129.1 101.9 L131.3 101.9 L133.4 102.0 L135.6 102.0 L137.8 102.0 L139.9 102.0 L142.1 102.0 L144.2 102.0 L146.4 102.0 L148.6 102.0 L150.7 102.0 L152.9 102.1 L155.0 102.1 L157.2 102.1 L159.4 102.1 L161.5 102.1 L163.7 102.1 L165.8 102.1 L168.0 102.1 L170.2 102.1 L172.3 102.1 L174.5 102.1 L176.6 102.1 L178.8 102.1 L294.0 102.1';
/** Review dots (x in the 300-wide viewBox), all at full memory. */
const REVIEW_X = [6.0, 26.2, 55.0, 98.2, 170.2, 294.0];
const TOP_Y = 10.0;

export function MemoryChart({ label }: { label: string }) {
  return (
    <svg width="100%" viewBox="0 0 300 116" role="img" aria-label={label} className="block overflow-visible">
      <path d="M6 57.0 H294" stroke="#ECE7DC" strokeWidth={1} strokeDasharray="3 4" />
      <path d="M6 104 H294" stroke="#DCD5C6" strokeWidth={1.5} />
      <path d={WITHOUT_REVIEW} stroke="#C9BCA2" strokeWidth={2.5} fill="none" strokeDasharray="5 5" strokeLinecap="round" />
      <path d={WITH_DYGO} stroke="#24463A" strokeWidth={2.6} fill="none" strokeLinejoin="round" />
      {REVIEW_X.map((x) => (
        <circle key={x} cx={x} cy={TOP_Y} r={5} fill="#1D6A9A" stroke="#E3F0F8" strokeWidth={3} />
      ))}
    </svg>
  );
}

/** The key above the chart: With Dygo · Without review · A review. */
export function MemoryChartLegend({ withDygo, withoutReview, review }: { withDygo: string; withoutReview: string; review: string }) {
  return (
    <div aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-semibold text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-[3px] w-[18px] rounded-sm bg-[#24463A]" />
        {withDygo}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-[18px] border-t-[3px] border-dashed border-[#C9BCA2]" />
        {withoutReview}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-[#1D6A9A] shadow-[0_0_0_2px_#E3F0F8]" />
        {review}
      </span>
    </div>
  );
}
