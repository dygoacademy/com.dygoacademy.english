import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';

import {
  Button,
  Card,
  IconButton,
  PLANT_GLYPH_SIZES,
  PLANT_STAGES,
  PlantGlyph,
  StatTile,
  stageFromSrs,
  type GardenFsrsState,
} from '@/components/garden';
import { GARDEN_CONTENT_WIDTH } from '@/constants/layout';
import { GARDEN_ROUTES } from '@/constants/garden';

import {
  GalleryBloom,
  GalleryChips,
  GalleryRatingBar,
  GallerySwitches,
  GalleryVine,
} from './GalleryInteractive';

/** Rows for the stageFromSrs table: every state, plus mastered and leech overrides. */
const STAGE_MAP_ROWS: Array<{ state: GardenFsrsState; mastered: boolean; leech: boolean }> = [
  { state: 'New', mastered: false, leech: false },
  { state: 'Learning', mastered: false, leech: false },
  { state: 'Relearning', mastered: false, leech: false },
  { state: 'Review', mastered: false, leech: false },
  { state: 'Review', mastered: true, leech: false },
  { state: 'Relearning', mastered: true, leech: false },
  { state: 'Review', mastered: true, leech: true },
  { state: 'Learning', mastered: false, leech: true },
];

/**
 * /garden/_gallery — flag-only component gallery (rebuild plan UI-2).
 * Gate G1 compares this page to the mockups side by side at 390px.
 * Folder is `%5Fgallery` because `_gallery` would be a private folder.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('gallery');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-display-s">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StateLabel({ children }: { children: React.ReactNode }) {
  return <p className="overline-label mb-2 mt-5 text-label text-garden-muted">{children}</p>;
}

function ArrowLeft() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Close() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
function Speaker() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10v4h4l5 4V6L8 10H4z" strokeLinejoin="round" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" />
    </svg>
  );
}

export default async function GardenGalleryPage() {
  const t = await getTranslations('gallery');
  const plant = await getTranslations('components.plant');
  const format = await getFormatter();

  return (
    <main className="min-h-screen-dvh bg-garden-bg pb-safe pt-safe">
      <div className={`mx-auto ${GARDEN_CONTENT_WIDTH.wide} px-page-safe pb-10 pt-6`}>
        <h1 className="font-display text-display-l">{t('title')}</h1>
        <p className="mt-2 text-body-m text-garden-muted">{t('intro')}</p>
        <p className="mt-2 text-body-s text-garden-muted">{t('pending')}</p>

        <Section title={t('sections.buttons')}>
          <StateLabel>{t('states.default')}</StateLabel>
          <div className="flex flex-col gap-4">
            <Button variant="primary">{t('sample.water')}</Button>
            <Button variant="forest">{t('sample.showAnswer')}</Button>
            <Button variant="secondary">{t('sample.addWord')}</Button>
          </div>
          <StateLabel>{t('states.secondLine')}</StateLabel>
          <Button secondLine={t('sample.waterSecond')}>{t('sample.water')}</Button>
          <StateLabel>{t('states.loading')}</StateLabel>
          <div className="flex flex-col gap-4">
            <Button loading>{t('sample.water')}</Button>
            <Button variant="forest" loading>
              {t('sample.showAnswer')}
            </Button>
          </div>
          <StateLabel>{t('states.disabled')}</StateLabel>
          <div className="flex flex-col gap-4">
            <Button disabled>{t('sample.water')}</Button>
            <Button variant="forest" disabled>
              {t('sample.showAnswer')}
            </Button>
            <Button variant="secondary" disabled>
              {t('sample.addWord')}
            </Button>
          </div>
          <StateLabel>{t('states.long')}</StateLabel>
          <Button>{t('sample.longLabel')}</Button>
        </Section>

        <Section title={t('sections.iconButtons')}>
          <div className="flex gap-3">
            <IconButton aria-label={t('sample.back')}>
              <ArrowLeft />
            </IconButton>
            <IconButton aria-label={t('sample.close')}>
              <Close />
            </IconButton>
            <IconButton aria-label={t('sample.play')}>
              <Speaker />
            </IconButton>
            <IconButton aria-label={t('sample.play')} disabled>
              <Speaker />
            </IconButton>
          </div>
        </Section>

        <Section title={t('sections.chips')}>
          <GalleryChips />
        </Section>

        <Section title={t('sections.cards')}>
          <StateLabel>{t('states.static')}</StateLabel>
          <Card>
            <p className="font-display text-display-s">{t('sample.cardTitle')}</p>
            <p className="mt-1 text-body-s text-garden-muted">{t('sample.cardBody')}</p>
          </Card>
          <StateLabel>{t('states.tappable')}</StateLabel>
          <Card href={GARDEN_ROUTES.tokens}>
            <p className="font-display text-display-s">{t('sample.cardTitle')}</p>
            <p className="mt-1 text-body-s text-garden-muted">{t('sample.cardBody')}</p>
          </Card>
        </Section>

        <Section title={t('sections.stats')}>
          <div className="grid grid-cols-3 gap-2">
            <StatTile value={format.number(412)} label={t('sample.statGrowing')} />
            <StatTile value={format.number(27)} label={t('sample.statStreak')} />
            <StatTile value={format.number(1200)} label={t('sample.statMastered')} />
          </div>
        </Section>

        <Section title={t('sections.switches')}>
          <GallerySwitches />
        </Section>

        <Section title={t('sections.vine')}>
          <GalleryVine />
        </Section>

        <Section title={t('sections.plants')}>
          <StateLabel>{t('states.sizes')}</StateLabel>
          <div className="space-y-3 overflow-x-auto">
            {PLANT_STAGES.map((stage) => (
              <div key={stage} className="flex items-end gap-3">
                <span className="w-20 shrink-0 text-body-s text-garden-muted">
                  {plant(stage)}
                </span>
                {PLANT_GLYPH_SIZES.map((size) => (
                  <PlantGlyph key={size} stage={stage} size={size} />
                ))}
              </div>
            ))}
          </div>
          <StateLabel>{t('states.labelled')}</StateLabel>
          <div className="flex flex-wrap gap-4">
            {PLANT_STAGES.map((stage) => (
              <PlantGlyph key={stage} stage={stage} size={56} aria-label={plant(stage)} />
            ))}
          </div>
          <StateLabel>{t('states.drip')}</StateLabel>
          <div className="flex items-end gap-4">
            <PlantGlyph stage="thirsty" size={56} animate="drip" />
            <PlantGlyph stage="sprout" size={56} animate="drip" />
            <PlantGlyph stage="wilting" size={56} animate="drip" />
          </div>
          <StateLabel>{t('states.bloom')}</StateLabel>
          <GalleryBloom />
        </Section>

        <Section title={t('sections.stageMapping')}>
          <div className="overflow-x-auto rounded-card border border-garden-border bg-garden-surface">
            <table className="w-full text-left text-body-s">
              <thead className="text-label text-garden-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t('sample.mapState')}</th>
                  <th className="px-3 py-2 font-semibold">{t('sample.mapMastered')}</th>
                  <th className="px-3 py-2 font-semibold">{t('sample.mapLeech')}</th>
                  <th className="px-3 py-2 font-semibold">{t('sample.mapStage')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garden-border">
                {STAGE_MAP_ROWS.map((row, index) => {
                  const stage = stageFromSrs(
                    row.state,
                    row.mastered ? '2026-09-01T00:00:00Z' : null,
                    row.leech,
                  );
                  return (
                    <tr key={index}>
                      <td className="px-3 py-2 font-mono">{row.state}</td>
                      <td className="px-3 py-2">{row.mastered ? t('sample.set') : t('sample.null')}</td>
                      <td className="px-3 py-2">{row.leech ? t('sample.yes') : t('sample.no')}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          <PlantGlyph stage={stage} size={24} />
                          {plant(stage)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title={t('sections.ratingBar')}>
          <GalleryRatingBar />
        </Section>
      </div>
    </main>
  );
}
