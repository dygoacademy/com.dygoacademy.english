'use client';

import { useTranslations } from 'next-intl';

import { referenceFixtures, type ReferenceName } from '@/components/garden/screens/fixtures';
import { MeScreen } from '@/components/garden/screens/MeScreen';
import { MissionCompleteScreen } from '@/components/garden/screens/MissionCompleteScreen';
import { ReviewScreen } from '@/components/garden/screens/ReviewScreen';
import { TodaysGardenScreen } from '@/components/garden/screens/TodaysGardenScreen';
import { TopicBedScreen } from '@/components/garden/screens/TopicBedScreen';
import { TopicsScreen } from '@/components/garden/screens/TopicsScreen';
import { WeeklyHarvestScreen } from '@/components/garden/screens/WeeklyHarvestScreen';
import { WelcomeBackScreen } from '@/components/garden/screens/WelcomeBackScreen';
import { GARDEN_ROUTES } from '@/constants/garden';
import type { AppLocale } from '@/i18n/config';

/**
 * The screen for one reference page. A client component so every garden
 * screen below reads the provider's messages and formats (the page's
 * `?locale=`), not the request's language, with that language's canvas
 * sample data (`referenceFixtures`).
 */
export function ReferenceScreen({ name, locale }: { name: ReferenceName; locale: AppLocale }) {
  const {
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
  } = referenceFixtures(locale);
  const review = useTranslations('screens.review');
  const topics = useTranslations('screens.topics');
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
