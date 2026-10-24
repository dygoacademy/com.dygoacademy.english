/**
 * S7 Harvest share card (canvas `reference/S7-harvest-share-card`, board
 * 360 × 450): drawn on a <canvas> at 3× (1080 × 1350, 4:5) and handed to the
 * share sheet as a PNG. Coordinates are the board's, measured from the
 * reference HTML; colours are the garden tokens' values.
 */

export interface HarvestCardText {
  brand: string;
  overline: string;
  title: string;
  stats: Array<{ value: string; label: string; tone?: 'flower' }>;
  /** The first words of the basket, joined with " · " and an ellipsis. */
  words: string;
  site: string;
}

const W = 360;
const H = 450;
const SCALE = 3;

const C = {
  forest: '#24463A',
  soil: '#1B372D',
  onForest: '#F4F1EA',
  sprout: '#B7D6AE',
  muted: '#DDE7DA',
  gold: '#F2D28B',
  flower: '#E8A87C',
  fruit: '#E0B04A',
  leaf: '#9CC39A',
  clay: '#B4552E',
  clayDark: '#8A3E20',
};

/** The garden font stacks, resolved from the page (next/font names). */
function fontStacks(): { display: string; body: string } {
  const root = document.querySelector('[data-ui="garden"]') ?? document.documentElement;
  const css = getComputedStyle(root);
  return {
    display: css.getPropertyValue('--font-stack-display').trim() || 'serif',
    body: css.getPropertyValue('--font-stack-body').trim() || 'sans-serif',
  };
}

function spaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  em: number,
  align: 'left' | 'right' | 'center',
) {
  const size = parseFloat(ctx.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? '12');
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${em * size}px`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';
}

/** Draws the card; resolves to a PNG blob. */
export async function drawHarvestCard(text: HarvestCardText): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas');
  ctx.scale(SCALE, SCALE);
  const { display, body } = fontStacks();
  // Each text is placed by the middle of its box on the board.
  ctx.textBaseline = 'middle';

  ctx.fillStyle = C.forest;
  ctx.fillRect(0, 0, W, H);

  // Header: dygo · WORD GARDEN
  ctx.fillStyle = C.onForest;
  ctx.font = `700 22px ${display}`;
  ctx.textAlign = 'left';
  ctx.fillText('dygo', 22, 36);
  ctx.fillStyle = C.sprout;
  ctx.font = `700 11px ${body}`;
  spaced(ctx, text.brand.toUpperCase(), 338, 36, 0.1, 'right');

  // Basket (viewBox 316 × 132 at 22, 62)
  ctx.save();
  ctx.translate(22, 62);
  const dot = (x: number, y: number, r: number, fill: string) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  dot(40, 26, 3, C.gold);
  dot(276, 20, 2.5, C.gold);
  dot(252, 52, 2, C.gold);
  dot(64, 60, 2, C.gold);
  dot(120, 58, 18, C.flower);
  dot(158, 50, 20, C.flower);
  dot(196, 60, 16, C.fruit);
  dot(138, 72, 14, C.fruit);
  dot(178, 74, 13, C.leaf);
  ctx.fillStyle = C.clay;
  ctx.fill(new Path2D('M86 76 H232 L218 128 H100 Z'));
  ctx.strokeStyle = C.clayDark;
  ctx.lineWidth = 2;
  ctx.stroke(new Path2D('M94 96 H224 M98 114 H220'));
  ctx.fillStyle = C.clayDark;
  ctx.fill(new Path2D('M86 70 H232 A6 6 0 0 1 232 82 H86 A6 6 0 0 1 86 70 Z'));
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke(new Path2D('M100 72 C100 22 218 22 218 72'));
  ctx.restore();

  // Overline and title, centred
  ctx.fillStyle = C.sprout;
  ctx.font = `700 12px ${body}`;
  spaced(ctx, text.overline.toUpperCase(), W / 2, 214, 0.1, 'center');
  ctx.fillStyle = C.onForest;
  ctx.font = `600 26px ${display}`;
  ctx.textAlign = 'center';
  ctx.fillText(text.title, W / 2, 239, W - 44);

  // Three tiles (gap 8, radius 14)
  const tileW = (W - 44 - 16) / 3;
  text.stats.slice(0, 3).forEach((stat, i) => {
    const x = 22 + i * (tileW + 8);
    ctx.fillStyle = C.soil;
    ctx.beginPath();
    ctx.roundRect(x, 265, tileW, 60, 14);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = stat.tone === 'flower' ? C.flower : C.onForest;
    ctx.font = `600 22px ${display}`;
    ctx.fillText(stat.value, x + tileW / 2, 288);
    ctx.fillStyle = C.muted;
    ctx.font = `400 11px ${body}`;
    ctx.fillText(stat.label, x + tileW / 2, 309, tileW - 8);
  });

  // Footer: the words, the site
  ctx.font = `400 12px ${body}`;
  ctx.fillStyle = C.muted;
  ctx.textAlign = 'left';
  ctx.fillText(text.words, 22, 422, 200);
  ctx.font = `700 12px ${body}`;
  ctx.fillStyle = C.gold;
  ctx.textAlign = 'right';
  ctx.fillText(text.site, 338, 422);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No PNG'))), 'image/png'),
  );
}

/** "mitigate · habitat · emission…": the first words that fit the footer. */
export function basketLine(words: readonly string[], max = 3): string {
  const head = words.slice(0, max).join(' · ');
  return words.length > max ? `${head}…` : head;
}
