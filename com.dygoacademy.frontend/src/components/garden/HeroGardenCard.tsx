import * as React from 'react';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';
import { PlantGlyph } from './PlantGlyph';
import type { PlantStage } from './plantStage';

/**
 * Hero garden card (design system §11, screen A1 / A5): forest card,
 * radius-xl, with the heading, a garden illustration and a legend row.
 *
 * - `normal`: forest background.
 * - `comeback` (Welcome back, A5): muted `forest-muted` background, a
 *   rain cloud, and desaturated plants.
 *
 * The illustration is decorative (aria-hidden) and text-free (§14.5); the
 * legend carries the same information as text. It scales by width: six
 * plants on iPhone, up to twelve and larger from `medium` (600px).
 */
export interface HeroLegendItem {
  stage: PlantStage;
  /** Already formatted for the locale. */
  count: string;
  label: string;
}

export interface HeroGardenCardProps {
  variant?: 'normal' | 'comeback';
  overline?: string;
  title: string;
  subtitle?: string;
  /** The plants drawn in the illustration, left to right. */
  plants: readonly PlantStage[];
  legend: readonly HeroLegendItem[];
  /** Usually the primary Button. */
  action?: React.ReactNode;
  /** Heading level for the title. Defaults to h2. */
  headingLevel?: 'h1' | 'h2' | 'h3';
  className?: string;
}

const COMPACT_PLANTS = 6;
const MAX_PLANTS = 12;

function RainCloud() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 96 64"
      className="absolute right-4 top-2 h-16 w-24 medium:h-20 medium:w-[120px]"
    >
      <path
        d="M24 38a14 14 0 0 1 2.4-27.8A18 18 0 0 1 60 8a15 15 0 0 1 13.6 8.8A11 11 0 0 1 74 38z"
        fill="var(--color-disabled)"
        fillOpacity="0.9"
      />
      <g stroke="var(--stage-due)" strokeWidth="2.5" strokeLinecap="round">
        <path d="M32 45l-3 7" />
        <path d="M48 45l-3 7" />
        <path d="M64 45l-3 7" />
        <path d="M40 54l-2 5" />
        <path d="M56 54l-2 5" />
      </g>
    </svg>
  );
}

export function HeroGardenCard({
  variant = 'normal',
  overline,
  title,
  subtitle,
  plants,
  legend,
  action,
  headingLevel = 'h2',
  className,
}: HeroGardenCardProps) {
  const t = useTranslations('components.hero');
  const Heading = headingLevel;
  const comeback = variant === 'comeback';
  const drawn = plants.slice(0, MAX_PLANTS);

  return (
    <section
      data-variant={variant}
      className={gcn(
        'overflow-hidden rounded-hero text-white',
        comeback ? 'bg-garden-forest-muted' : 'bg-garden-forest',
        className,
      )}
    >
      <div className="px-5 pt-5">
        {overline ? <p className="overline-label text-label text-white/80">{overline}</p> : null}
        <Heading className="mt-1 font-display text-display-m">{title}</Heading>
        {subtitle ? <p className="mt-1 text-body-s text-white/85">{subtitle}</p> : null}
      </div>

      <div aria-hidden="true" className="relative mt-2 h-[112px] medium:h-[150px]">
        {comeback ? <RainCloud /> : null}
        <div
          className={gcn(
            'absolute inset-x-4 bottom-4 flex items-end justify-around',
            comeback && 'opacity-90 saturate-[0.55]',
          )}
        >
          {drawn.map((stage, index) => (
            <PlantGlyph
              key={index}
              stage={stage}
              size={40}
              className={gcn(
                'medium:h-14 medium:w-14',
                index >= COMPACT_PLANTS && 'hidden medium:block',
              )}
            />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-5 bg-garden-forest-deep" />
      </div>

      <div className="bg-garden-forest-deep px-5 pb-5 pt-2">
        <ul aria-label={t('legend')} className="flex flex-wrap gap-x-4 gap-y-2">
          {legend.map((item) => (
            <li key={item.stage} className="inline-flex items-center gap-1.5 text-body-s">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                <PlantGlyph stage={item.stage} size={24} />
              </span>
              <span className="tabular-nums-stat font-bold">{item.count}</span>
              <span className="text-white/80">{item.label}</span>
            </li>
          ))}
        </ul>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </section>
  );
}
