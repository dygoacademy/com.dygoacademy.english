'use client';

import { GARDEN_ROUTES } from '@/constants/garden';
import { ROUTES } from '@/constants/routes';
import { useTopics } from '@/hooks/useTopics';

import { TopicsScreen } from '../screens/TopicsScreen';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /garden/topics: the beds (A6) from GET /topics.
 *
 * Real: title, word count, and mastered words as "fruiting" (the bar's
 * green share). Not available yet (UI-5): flowering / sprouting counts,
 * per-topic due counts and topic groups, so there is only the "All" chip,
 * no due badge, and no locked seed pack. Search and "Plant a new bed" use
 * the classic topics page until those flows are rebuilt.
 */
export function TopicsLive() {
  const topics = useTopics();
  if (topics.isPending) return <LiveLoading />;
  if (topics.isError || !topics.data) return <LiveError onRetry={() => void topics.refetch()} />;

  return (
    <TopicsScreen
      topics={topics.data.map((topic) => {
        const words = Number(topic.word_count) || 0;
        const mastered = Number(topic.mastered_count) || 0;
        return {
          id: topic.id,
          href: GARDEN_ROUTES.topic(topic.id),
          title: topic.title,
          group: 'all',
          level: null,
          words,
          stages: { tree: mastered, flower: 0, sprout: 0 },
          due: null,
        };
      })}
      filters={[]}
      lockedPack={null}
      newBedHref={ROUTES.topics}
    />
  );
}
