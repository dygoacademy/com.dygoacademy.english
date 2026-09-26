import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { GARDEN_CONTENT_WIDTH } from '@/constants/layout';

/**
 * /garden/_tokens — flag-only token and type test page (rebuild plan
 * UI-1, "done when": every token, text style and font renders correctly
 * in English, Chinese and Vietnamese). The folder is `%5Ftokens` because
 * a plain `_tokens` folder is private (non-routable) in the App Router.
 *
 * The hex values below are copied from dygo_academy_ui_ux_design_system.md
 * on purpose: each swatch paints the CSS variable, so a swatch that
 * doesn't match its printed hex means globals.css drifted from the spec.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('tokens');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/**
 * Language fixtures, not UI copy: these are the spec's §4.3 test strings
 * and must stay in their own languages whatever the app language is, so
 * they deliberately don't go through t().
 */
const TEST_STRINGS = [
  { lang: 'en', text: 'English — mitigate, sustainable, drought, ecosystem' },
  { lang: 'zh-Hans', text: '简体中文 — 减轻，可持续的，干旱，生态系统' },
  { lang: 'vi', text: 'Tiếng Việt — giảm nhẹ, bền vững, hạn hán, nghiên cứu' },
] as const;
/** The same overline in the three scripts (test strings, see above). */
const OVERLINE_SAMPLES = [
  { lang: 'en', text: "Today's missions" },
  { lang: 'zh-Hans', text: '今日任务' },
  { lang: 'vi', text: 'Nhiệm vụ hôm nay' },
] as const;

const MIXED_STRING = 'Colour / color · Friday, 25 September · 9月25日 星期五 · mitigate 减轻';

const COLOURS = [
  ['--color-bg', '#F4F1EA', 'bg-garden-bg'],
  ['--color-surface', '#FFFFFF', 'bg-garden-surface'],
  ['--color-surface-sunken', '#F7F4EC', 'bg-garden-surface-sunken'],
  ['--color-border', '#E3DDD0', 'bg-garden-border'],
  ['--color-text', '#1C2B24', 'bg-garden-text'],
  ['--color-text-muted', '#5E6A62', 'bg-garden-muted'],
  ['--color-forest', '#24463A', 'bg-garden-forest'],
  ['--color-forest-deep', '#1B372D', 'bg-garden-forest-deep'],
  ['--color-forest-shadow', '#142A21', 'bg-garden-forest-shadow'],
  ['--color-primary', '#B4552E', 'bg-garden-primary'],
  ['--color-primary-shadow', '#7E3719', 'bg-garden-primary-shadow'],
  ['--color-primary-text', '#8A3E20', 'bg-garden-primary-text'],
  ['--color-water', '#4A8FBF', 'bg-garden-water'],
  ['--color-water-soft', '#E3F0F8', 'bg-garden-water-soft'],
  ['--color-water-text', '#1D4A68', 'bg-garden-water-text'],
  ['--color-gold', '#C8962B', 'bg-garden-gold'],
  ['--color-gold-text', '#9A6E14', 'bg-garden-gold-text'],
  ['--color-gold-soft', '#FBF4E4', 'bg-garden-gold-soft'],
  ['--color-gold-soft-text', '#6B5215', 'bg-garden-gold-soft-text'],
  ['--color-success', '#3E7F5A', 'bg-garden-success'],
  ['--color-disabled', '#CFC8B8', 'bg-garden-disabled'],
  ['--color-card-lift', '#E8E1D2', 'bg-garden-card-lift'],
] as const;

const STAGES = [
  ['--stage-seed', '#6B5040', 'bg-stage-seed'],
  ['--stage-sprout', '#B7D6AE', 'bg-stage-sprout'],
  ['--stage-sprout-leaf', '#9CC39A', 'bg-stage-sprout-leaf'],
  ['--stage-flower', '#E8A87C', 'bg-stage-flower'],
  ['--stage-tree', '#3E7F5A', 'bg-stage-tree'],
  ['--stage-tree-canopy', '#7FA487', 'bg-stage-tree-canopy'],
  ['--stage-tree-fruit', '#E0B04A', 'bg-stage-tree-fruit'],
  ['--stage-wilt', '#A89F6B', 'bg-stage-wilt'],
  ['--stage-due', '#8EC5E8', 'bg-stage-due'],
] as const;

const RATINGS = [
  ['Again', 'bg-rating-again text-rating-again-text'],
  ['Hard', 'bg-rating-hard text-rating-hard-text'],
  ['Good', 'bg-rating-good text-rating-good-text'],
  ['Easy', 'bg-rating-easy text-rating-easy-text'],
] as const;

const TYPE_STYLES = [
  ['display-xl', 'font-display text-display-xl'],
  ['display-l', 'font-display text-display-l'],
  ['display-m', 'font-display text-display-m tabular-nums-stat'],
  ['display-s', 'font-display text-display-s'],
  ['body-l', 'text-body-l'],
  ['body-m', 'text-body-m'],
  ['body-s', 'text-body-s'],
  ['label', 'text-label'],
] as const;

/** Font check: Fraunces opsz at the canvas sizes, DM Sans weights, the Vietnamese fallback. */
const FONT_SAMPLES = [
  [
    'Fraunces 600 · 40px (opsz)',
    'font-display font-semibold text-[40px] leading-[1.05]',
    'mitigate',
  ],
  [
    'Fraunces 600 · 28px (opsz)',
    'font-display font-semibold text-[28px] leading-[1.1]',
    'Good evening, Minh',
  ],
  ['Fraunces 500 · 22px (opsz)', 'font-display font-medium text-[22px]', '412 words growing'],
  ['DM Sans 400 · 15px', 'text-[15px] font-normal', 'Say the meaning out loud, then check.'],
  ['DM Sans 500 · 13px', 'text-[13px] font-medium', 'Friday, 25 September'],
  ['DM Sans 600 · 14px', 'text-[14px] font-semibold', 'mitigate the impact'],
  ['DM Sans 700 · 17px', 'text-[17px] font-bold', 'Continue mission'],
  ['DM Sans + Be Vietnam Pro · 15px', 'text-[15px]', 'giảm nhẹ, làm dịu bớt · đa dạng sinh học'],
] as const;

const SPACING = [
  ['space-1', 'w-1'],
  ['space-2', 'w-2'],
  ['space-3', 'w-3'],
  ['space-4', 'w-4'],
  ['space-5', 'w-5'],
  ['space-6', 'w-6'],
  ['space-8', 'w-8'],
  ['space-10', 'w-10'],
  ['page-margin', 'w-page'],
] as const;

const RADII = [
  ['tile · 12', 'rounded-tile'],
  ['control · 16', 'rounded-control'],
  ['card · 20', 'rounded-card'],
  ['hero · 26', 'rounded-hero'],
  ['full', 'rounded-full'],
] as const;

const MOTION = [
  ['press · 80ms', 'duration-press ease-garden'],
  ['quick · 220ms', 'duration-quick ease-garden'],
  ['bloom · 700ms', 'duration-bloom ease-bloom'],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-display-s">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Swatches({ items }: { items: readonly (readonly [string, string, string])[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2 medium:grid-cols-2 expanded:grid-cols-3">
      {items.map(([name, hex, cls]) => (
        <li
          key={name}
          className="flex items-center gap-3 rounded-tile border border-garden-border bg-garden-surface p-2"
        >
          <span
            aria-hidden="true"
            className={`h-10 w-10 shrink-0 rounded-tile border border-garden-border ${cls}`}
          />
          <span className="min-w-0">
            <code className="block truncate text-body-s">{name}</code>
            <span className="text-body-s text-garden-muted">{hex}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function GardenTokensPage() {
  const t = await getTranslations('tokens');

  return (
    <main className="min-h-screen-dvh bg-garden-bg">
      <div aria-hidden="true" className="h-[var(--safe-top)] bg-garden-water-soft" />
      <div className={`mx-auto ${GARDEN_CONTENT_WIDTH.wide} px-page-safe pb-10 pt-6`}>
        <h1 className="font-display text-display-l">{t('title')}</h1>
        <p className="mt-2 text-body-m text-garden-muted">{t('intro')}</p>

        <p className="mt-4 inline-flex flex-wrap gap-2 rounded-full bg-garden-forest px-3 py-1 text-label text-white">
          <span className="overline-label">{t('sizeClass.label')}</span>
          <span className="medium:hidden">{t('sizeClass.compact')}</span>
          <span className="hidden medium:inline expanded:hidden">{t('sizeClass.medium')}</span>
          <span className="hidden expanded:inline">{t('sizeClass.expanded')}</span>
          <span className="hidden short:inline">· {t('sizeClass.short')}</span>
        </p>

        <Section title={t('sections.colour')}>
          <p className="mb-3 text-body-s text-garden-muted">{t('notes.swatch')}</p>
          <Swatches items={COLOURS} />
        </Section>

        <Section title={t('sections.stages')}>
          <Swatches items={STAGES} />
        </Section>

        <Section title={t('sections.ratings')}>
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map(([label, cls]) => (
              <span
                key={label}
                className={`flex h-[68px] items-center justify-center rounded-control text-body-l ${cls}`}
              >
                {label}
              </span>
            ))}
          </div>
        </Section>

        <Section title={t('sections.fonts')}>
          <p className="text-body-s text-garden-muted">{t('notes.fonts')}</p>
          <ul className="mt-3 space-y-3">
            {FONT_SAMPLES.map(([name, cls, text]) => (
              <li
                key={name}
                className="rounded-card border border-garden-border bg-garden-surface p-4"
              >
                <code className="text-body-s text-garden-muted">{name}</code>
                <p lang={name.includes('Vietnam') ? 'vi' : 'en'} className={`mt-1 ${cls}`}>
                  {text}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('sections.type')}>
          <ul className="space-y-6">
            {TYPE_STYLES.map(([name, cls]) => (
              <li
                key={name}
                className="rounded-card border border-garden-border bg-garden-surface p-4"
              >
                <code className="text-body-s text-garden-muted">{name}</code>
                {TEST_STRINGS.map(({ lang, text }) => (
                  <p key={lang} lang={lang} className={`mt-1 ${cls}`}>
                    {name === 'display-m' ? `412 · ${text}` : text}
                  </p>
                ))}
              </li>
            ))}
            <li className="rounded-card border border-garden-border bg-garden-surface-sunken p-4">
              <p className="text-body-m">{MIXED_STRING}</p>
            </li>
          </ul>
        </Section>

        <Section title={t('sections.overline')}>
          <p className="mb-3 text-body-s text-garden-muted">{t('notes.overline')}</p>
          {OVERLINE_SAMPLES.map((sample, index) => (
            <p
              key={sample.lang}
              lang={sample.lang}
              className={`overline-label text-label text-garden-muted${index > 0 ? ' mt-1' : ''}`}
            >
              {sample.text}
            </p>
          ))}
        </Section>

        <Section title={t('sections.spacing')}>
          <ul className="space-y-2">
            {SPACING.map(([name, cls]) => (
              <li key={name} className="flex items-center gap-3">
                <code className="w-28 text-body-s">{name}</code>
                <span aria-hidden="true" className={`h-4 bg-garden-water ${cls}`} />
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('sections.radius')}>
          <div className="flex flex-wrap gap-3">
            {RADII.map(([name, cls]) => (
              <div
                key={name}
                className={`flex h-20 w-28 items-end border border-garden-border bg-garden-surface p-2 text-body-s ${cls}`}
              >
                {name}
              </div>
            ))}
          </div>
        </Section>

        <Section title={t('sections.elevation')}>
          <div className="flex flex-wrap items-start gap-4">
            <button
              type="button"
              className="h-14 rounded-control bg-garden-primary px-6 text-body-l font-bold text-white shadow-press-primary transition duration-press ease-garden active:translate-y-[2px] active:shadow-press-primary-down"
            >
              {t('sample.button')}
            </button>
            <button
              type="button"
              className="h-[60px] rounded-control bg-garden-forest px-6 text-body-l font-bold text-white shadow-press-forest transition duration-press ease-garden active:translate-y-[2px] active:shadow-press-forest-down"
            >
              {t('sample.pressMe')}
            </button>
            <div className="h-24 w-40 rounded-hero border border-garden-border bg-garden-surface shadow-card-lift" />
          </div>
        </Section>

        <Section title={t('sections.motion')}>
          <p className="mb-3 text-body-s text-garden-muted">{t('notes.motion')}</p>
          <div className="flex flex-wrap gap-3">
            {MOTION.map(([name, cls]) => (
              <button
                key={name}
                type="button"
                className={`h-16 w-32 rounded-control border border-garden-border bg-garden-surface text-body-s transition-transform hover:scale-105 focus-visible:scale-105 ${cls}`}
              >
                {name}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('sections.safeArea')}>
          <p className="text-body-s text-garden-muted">{t('notes.safeArea')}</p>
        </Section>

        <Section title={t('sections.widths')}>
          <p className="mb-3 text-body-s text-garden-muted">{t('notes.widths')}</p>
          <div className="space-y-2">
            {(Object.keys(GARDEN_CONTENT_WIDTH) as (keyof typeof GARDEN_CONTENT_WIDTH)[]).map(
              (tier) => (
                <div
                  key={tier}
                  className={`${GARDEN_CONTENT_WIDTH[tier]} rounded-tile bg-garden-forest px-3 py-2 text-body-s text-white`}
                >
                  {tier}
                </div>
              ),
            )}
          </div>
        </Section>
      </div>
      <div aria-hidden="true" className="h-[var(--safe-bottom)] bg-garden-water-soft" />
    </main>
  );
}
