import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import {
  BED,
  COMEBACK,
  COMPLETE,
  HARVEST,
  HOME,
  ME,
  REVIEW,
  TOPICS,
  TOPICS_ACADEMIC_FILTER,
  TOPICS_LOCKED_PACK,
  isReferenceName,
  type ReferenceName,
} from '@/components/garden/screens/fixtures';
import { MeScreen } from '@/components/garden/screens/MeScreen';
import { MissionCompleteScreen } from '@/components/garden/screens/MissionCompleteScreen';
import { ReviewScreen } from '@/components/garden/screens/ReviewScreen';
import { TodaysGardenScreen } from '@/components/garden/screens/TodaysGardenScreen';
import { TopicBedScreen } from '@/components/garden/screens/TopicBedScreen';
import { TopicsScreen } from '@/components/garden/screens/TopicsScreen';
import { WeeklyHarvestScreen } from '@/components/garden/screens/WeeklyHarvestScreen';
import { WelcomeBackScreen } from '@/components/garden/screens/WelcomeBackScreen';
import { GARDEN_ROUTES } from '@/constants/garden';

/**
 * /garden/_reference/<name>: one canvas screen with the canvas sample
 * data (screens/fixtures.ts), for `npm run garden:diff`. Dev only; see the
 * route group's layout for the gates. The tab bar sits in the flow, as in
 * the fixed-height canvas frame.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const t = await getTranslations('screens.reference');
  return { title: t('metaTitle', { name }), robots: { index: false, follow: false } };
}

export default async function GardenReferencePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { name } = await params;
  if (!isReferenceName(name)) notFound();
  return <Reference name={name} />;
}

async function Reference({ name }: { name: ReferenceName }) {
  const review = await getTranslations('screens.review');
  const topics = await getTranslations('screens.topics');
  const home = GARDEN_ROUTES.home;

  switch (name) {
    case 'A1-todays-garden':
      return (
        <TodaysGardenScreen
          {...HOME}
          action={{ ...HOME.action, href: GARDEN_ROUTES.review }}
          stickyNav={false}
        />
      );
    case 'A2-review-question':
    case 'A2-review-answer':
    case 'A2-review-finished': {
      const finished = name === 'A2-review-finished';
      return (
        <ReviewScreen
          state={name === 'A2-review-question' ? 'question' : finished ? 'finished' : 'answer'}
          missionTitle={review('title', { count: REVIEW.total })}
          done={finished ? REVIEW.total : REVIEW.done}
          total={REVIEW.total}
          closeHref={home}
          card={REVIEW.card}
          intervals={REVIEW.intervals}
          bloomHref={GARDEN_ROUTES.reviewDone}
          secondaryAction={{
            label: review('replayDemo'),
            href: GARDEN_ROUTES.reference('A2-review-question'),
          }}
        />
      );
    }
    case 'A3-mission-complete':
      return (
        <MissionCompleteScreen
          {...COMPLETE}
          closeHref={home}
          backHref={home}
          missions={{
            ...COMPLETE.missions,
            next: { ...COMPLETE.missions.next, href: GARDEN_ROUTES.review },
          }}
        />
      );
    case 'A4-weekly-harvest':
      return <WeeklyHarvestScreen {...HARVEST} stickyNav={false} />;
    case 'A5-welcome-back':
      return (
        <WelcomeBackScreen
          {...COMEBACK}
          revive={{ ...COMEBACK.revive, href: GARDEN_ROUTES.review }}
          waterAll={{ ...COMEBACK.waterAll, href: GARDEN_ROUTES.review }}
          stickyNav={false}
        />
      );
    case 'A6-topics':
      return (
        <TopicsScreen
          topics={TOPICS}
          filters={[
            TOPICS_ACADEMIC_FILTER,
            { id: 'mine', label: topics('mine') },
            { id: 'group', label: topics('group') },
          ]}
          lockedPack={TOPICS_LOCKED_PACK}
          searchHref="/search"
          newBedHref={GARDEN_ROUTES.topics}
          stickyNav={false}
        />
      );
    case 'A7-topic-bed':
    case 'A7-topic-bed-filter-sprouts':
      return (
        <TopicBedScreen
          {...BED}
          initialStage={name === 'A7-topic-bed' ? null : 'sprout'}
          backHref={GARDEN_ROUTES.reference('A6-topics')}
          water={{ ...BED.water, href: GARDEN_ROUTES.review }}
          quizHref={GARDEN_ROUTES.review}
          addWordHref={GARDEN_ROUTES.topics}
          optionsHref={GARDEN_ROUTES.topics}
        />
      );
    case 'A8-me':
      return (
        <MeScreen
          {...ME}
          dailyGoal={{ ...ME.dailyGoal, href: GARDEN_ROUTES.missions }}
          family={{ ...ME.family, href: '/' }}
          stickyNav={false}
        />
      );
  }
}
