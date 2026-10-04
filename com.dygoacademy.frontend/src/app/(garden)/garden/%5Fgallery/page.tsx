import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';

import {
  AudioButton,
  BottomTabBar,
  Button,
  Card,
  GardenRail,
  GardenSidebar,
  GardenTabIcon,
  HeroGardenCard,
  IconButton,
  MeTabIcon,
  MissionRow,
  MissionsTabIcon,
  MoonIcon,
  PlantIcon,
  StarIcon,
  WaterIcon,
  WordRow,
  PLANT_GLYPH_SIZES,
  PLANT_STAGES,
  PlantGlyph,
  ReviewCard,
  StatTile,
  TopicsTabIcon,
  stageFromSrs,
  type GardenFsrsState,
} from '@/components/garden';
import { CONTENT_WIDTH } from '@/constants/layout';
import { GARDEN_ROUTES } from '@/constants/garden';

import { BROKEN_AUDIO, TEST_TONE } from './galleryAudio';
import {
  GalleryBloom,
  GalleryChips,
  GalleryRatingBar,
  GallerySheets,
  GalleryStaticToast,
  GalleryToasts,
  GalleryReviewToggle,
  GalleryStageTiles,
  GallerySwitches,
  GalleryVine,
} from './GalleryInteractive';
import { GroupsGallery } from './GroupsGallery';
import { SpeakingGallery } from './SpeakingGallery';

/** Gallery-only English title until S6 adds the speaking strings (phase notes S4-b). */
const SPEAKING_SECTION_TITLE = 'Speaking · waveforms';

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
  return <p className="overline-label mb-2 mt-5 text-label text-muted-foreground">{children}</p>;
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
  const tab = await getTranslations('components.tabBar');
  const tabs = [
    {
      key: 'garden',
      href: `${GARDEN_ROUTES.gallery}#tab-garden`,
      label: tab('garden'),
      icon: <GardenTabIcon />,
    },
    {
      key: 'missions',
      href: `${GARDEN_ROUTES.gallery}#tab-missions`,
      label: tab('missions'),
      icon: <MissionsTabIcon />,
    },
    {
      key: 'topics',
      href: `${GARDEN_ROUTES.gallery}#tab-topics`,
      label: tab('topics'),
      icon: <TopicsTabIcon />,
    },
    { key: 'me', href: `${GARDEN_ROUTES.gallery}#tab-me`, label: tab('me'), icon: <MeTabIcon /> },
  ];
  const format = await getFormatter();

  return (
    <main className="min-h-screen-dvh bg-bg pb-safe pt-safe">
      <div className={`mx-auto ${CONTENT_WIDTH.wide} px-page-safe pb-10 pt-6`}>
        <h1 className="font-display text-display-l">{t('title')}</h1>
        <p className="mt-2 text-body-m text-muted-foreground">{t('intro')}</p>
        <p className="mt-2 text-body-s text-muted-foreground">{t('pending')}</p>

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
            <p className="mt-1 text-body-s text-muted-foreground">{t('sample.cardBody')}</p>
          </Card>
          <StateLabel>{t('states.tappable')}</StateLabel>
          <Card href={GARDEN_ROUTES.tokens}>
            <p className="font-display text-display-s">{t('sample.cardTitle')}</p>
            <p className="mt-1 text-body-s text-muted-foreground">{t('sample.cardBody')}</p>
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
                <span className="w-20 shrink-0 text-body-s text-muted-foreground">{plant(stage)}</span>
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
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full text-left text-body-s">
              <thead className="text-label text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t('sample.mapState')}</th>
                  <th className="px-3 py-2 font-semibold">{t('sample.mapMastered')}</th>
                  <th className="px-3 py-2 font-semibold">{t('sample.mapLeech')}</th>
                  <th className="px-3 py-2 font-semibold">{t('sample.mapStage')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {STAGE_MAP_ROWS.map((row, index) => {
                  const stage = stageFromSrs(
                    row.state,
                    row.mastered ? '2026-09-01T00:00:00Z' : null,
                    row.leech,
                  );
                  return (
                    <tr key={index}>
                      <td className="px-3 py-2 font-mono">{row.state}</td>
                      <td className="px-3 py-2">
                        {row.mastered ? t('sample.set') : t('sample.null')}
                      </td>
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

        <Section title={t('sections.audio')}>
          <StateLabel>{t('states.idle')}</StateLabel>
          <AudioButton src={TEST_TONE} />
          <StateLabel>{t('states.audioError')}</StateLabel>
          <AudioButton src={TEST_TONE} initialStatus="error" />
          <StateLabel>{t('states.audioFails')}</StateLabel>
          <AudioButton src={BROKEN_AUDIO} />
          <StateLabel>{t('states.noAudio')}</StateLabel>
          <AudioButton src={null} />
        </Section>

        <Section title={t('sections.reviewCard')}>
          <StateLabel>{t('states.hidden')}</StateLabel>
          <ReviewCard
            word={t('sample.reviewWord')}
            ipa={t('sample.reviewIpa')}
            audioSrc={TEST_TONE}
            level={t('sample.reviewLevel')}
            topic={t('sample.reviewTopic')}
            partOfSpeech={t('sample.reviewPos')}
            revealed={false}
            meaning={t('sample.reviewMeaning')}
          />
          <StateLabel>{t('states.shown')}</StateLabel>
          <ReviewCard
            word={t('sample.reviewWord')}
            ipa={t('sample.reviewIpa')}
            audioSrc={TEST_TONE}
            level={t('sample.reviewLevel')}
            topic={t('sample.reviewTopic')}
            partOfSpeech={t('sample.reviewPos')}
            revealed
            meaning={t('sample.reviewMeaning')}
            meaningTranslation={{ text: t('sample.reviewTranslation'), lang: 'vi' }}
            example={t('sample.reviewExample')}
            collocations={[
              t('sample.reviewCollocation1'),
              t('sample.reviewCollocation2'),
              t('sample.reviewCollocation3'),
            ]}
          />
          <StateLabel>{t('states.longContent')}</StateLabel>
          <ReviewCard
            word={t('sample.longWord')}
            ipa={t('sample.longIpa')}
            audioSrc={null}
            level={t('sample.longLevel')}
            topic={t('sample.longTopic')}
            partOfSpeech={t('sample.longPos')}
            revealed
            meaning={t('sample.longMeaning')}
            meaningTranslation={{ text: t('sample.longTranslation'), lang: 'vi' }}
            example={t('sample.longExample')}
          />
          <StateLabel>{t('states.toggle')}</StateLabel>
          <GalleryReviewToggle />
        </Section>

        <Section title={t('sections.missionRow')}>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface px-4">
            <li>
              <MissionRow
                icon={<WaterIcon />}
                title={t('sample.missionWater')}
                value={0}
                max={18}
                valueLabel={`${format.number(0)}/${format.number(18)}`}
                progressText={t('sample.missionWaterProgress', { done: 0, total: 18 })}
                status="todo"
              />
            </li>
            <li>
              <MissionRow
                icon={<StarIcon />}
                title={t('sample.missionChallenge')}
                value={1}
                max={3}
                valueLabel={`${format.number(1)}/${format.number(3)}`}
                progressText={t('sample.missionChallengeProgress', { done: 1, total: 3 })}
                status="inProgress"
              />
            </li>
            <li>
              <MissionRow
                icon={<PlantIcon />}
                title={t('sample.missionPlant')}
                value={3}
                max={3}
                valueLabel={`${format.number(3)}/${format.number(3)}`}
                progressText={t('sample.missionPlantProgress', { done: 3, total: 3 })}
                status="done"
              />
            </li>
          </ul>
        </Section>

        <Section title={t('sections.hero')}>
          <StateLabel>{t('states.normal')}</StateLabel>
          <HeroGardenCard
            overline={t('sample.heroOverline')}
            title={t('sample.heroTitle')}
            trailing={<MoonIcon width={30} height={30} />}
            plants={[
              'tree',
              { stage: 'flower', thirsty: true },
              'sprout',
              'tree',
              'flower',
              { stage: 'sprout', thirsty: true },
              'wilting',
              { stage: 'flower', thirsty: true },
              'seed',
            ]}
            legend={[
              { stage: 'thirsty', label: `${format.number(46)} ${t('sample.stageThirsty')}` },
              { stage: 'tree', label: `${format.number(1204)} ${t('sample.stageRipe')}` },
              { stage: 'wilting', label: `${format.number(3)} ${t('sample.stageWilting')}` },
            ]}
          />
          <StateLabel>{t('states.comeback')}</StateLabel>
          <HeroGardenCard
            variant="comeback"
            plants={[
              'tree',
              'wilting',
              'wilting',
              'flower',
              'wilting',
              'tree',
              'wilting',
              'sprout',
            ]}
            legend={[
              { stage: 'thirsty', label: `${format.number(46)} ${t('sample.stageThirsty')}` },
              { stage: 'wilting', label: `${format.number(3)} ${t('sample.stageWilting')}` },
              { stage: 'tree', label: `${format.number(1204)} ${t('sample.stageRipe')}` },
            ]}
          />
        </Section>

        <Section title={t('sections.stageTile')}>
          <GalleryStageTiles />
        </Section>

        <Section title={t('sections.wordRow')}>
          <StateLabel>{t('states.normal')}</StateLabel>
          <WordRow
            word={t('sample.reviewWord')}
            meaning={t('sample.wordMeaning')}
            dueText={t('sample.wordInDays')}
            stage="flower"
          />
          <StateLabel>{t('states.dueNow')}</StateLabel>
          <WordRow
            word={t('sample.word2')}
            meaning={t('sample.word2Meaning')}
            dueText={t('sample.wordDueNow')}
            stage="sprout"
            variant="due"
          />
          <StateLabel>{t('states.wilting')}</StateLabel>
          <WordRow
            word={t('sample.word3')}
            meaning={t('sample.word3Meaning')}
            dueText={t('sample.wordWilting')}
            stage="wilting"
            variant="wilting"
          />
          <StateLabel>{t('states.link')}</StateLabel>
          <WordRow
            href={GARDEN_ROUTES.tokens}
            word={t('sample.reviewWord')}
            meaning={t('sample.reviewTranslation')}
            meaningLang="vi"
            dueText={t('sample.wordInDays')}
            stage="tree"
          />
        </Section>

        <Section title={t('sections.tabBar')}>
          <StateLabel>{t('states.activeGarden')}</StateLabel>
          <BottomTabBar fixed={false} items={tabs} activeKey="garden" />
          <StateLabel>{t('states.activeTopics')}</StateLabel>
          <BottomTabBar fixed={false} items={tabs} activeKey="topics" />
        </Section>

        <Section title={t('sections.ipadNav')}>
          <div className="flex flex-wrap items-start gap-6">
            <div>
              <StateLabel>{t('states.rail')}</StateLabel>
              <GardenRail inline items={tabs} activeKey="garden" />
            </div>
            <div>
              <StateLabel>{t('states.sidebar')}</StateLabel>
              <GardenSidebar inline items={tabs} activeKey="topics" />
            </div>
          </div>
        </Section>

        <Section title={t('sections.sheet')}>
          <p className="mb-3 text-body-s text-muted-foreground">{t('states.sheetHint')}</p>
          <GallerySheets />
        </Section>

        <Section title={t('sections.groups')}>
          <GroupsGallery />
        </Section>

        {/* Phase 13 waveforms (S4); the title moves to the message files in S6. */}
        <Section title={SPEAKING_SECTION_TITLE}>
          <SpeakingGallery />
        </Section>

        <Section title={t('sections.toast')}>
          <StateLabel>{t('states.info')}</StateLabel>
          <GalleryStaticToast variant="info" />
          <StateLabel>{t('states.success')}</StateLabel>
          <GalleryStaticToast variant="success" />
          <StateLabel>{t('states.toastLive')}</StateLabel>
          <GalleryToasts />
        </Section>
      </div>
    </main>
  );
}
