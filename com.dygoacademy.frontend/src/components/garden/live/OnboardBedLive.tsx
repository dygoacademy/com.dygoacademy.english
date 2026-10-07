'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useOnboarding, useUpdateOnboarding } from '@/hooks/useOnboarding';
import { useTopics } from '@/hooks/useTopics';

import { OnboardBedScreen, type OnboardBedPacket } from '../screens/OnboardBedScreen';
import { formatLevel, type GardenTopicSummary } from './data';
import { LiveError, LiveLoading } from './LiveState';

/** At most this many seed packets on OB3 (the rest are in Topics later). */
export const MAX_PACKETS = 8;

/**
 * The topics a new learner can start with, as seed packets: only beds with
 * words, library collections first, then the biggest.
 */
export function seedPackets(topics: readonly GardenTopicSummary[]): OnboardBedPacket[] {
  const rank = (topic: GardenTopicSummary) => (topic.kind === 'library' ? 0 : 1);
  return topics
    .map((topic) => ({ topic, words: Number(topic.word_count) || 0 }))
    .filter(({ words }) => words > 0)
    .sort((a, b) => rank(a.topic) - rank(b.topic) || b.words - a.words)
    .slice(0, MAX_PACKETS)
    .map(({ topic, words }) => ({
      id: topic.id,
      title: topic.title,
      words,
      level: formatLevel(topic.min_level ?? null, topic.max_level ?? null),
    }));
}

/**
 * /welcome/bed: OB3. The packets come from GET /topics (RLS: what this
 * learner can see). Continue saves `first_topic_id` and opens OB4; with no
 * topics at all it goes on without one.
 */
export function OnboardBedLive() {
  const router = useRouter();
  const topics = useTopics();
  const onboarding = useOnboarding();
  const save = useUpdateOnboarding();
  const [picked, setPicked] = React.useState<string | null>(null);

  if (topics.isPending) return <LiveLoading />;
  if (topics.isError || !topics.data) return <LiveError onRetry={() => void topics.refetch()} />;

  const packets = seedPackets(topics.data as GardenTopicSummary[]);
  const savedId = onboarding.data?.first_topic_id ?? null;
  const selectedId =
    picked ?? (savedId && packets.some((packet) => packet.id === savedId) ? savedId : null);
  const next = () => router.push(GARDEN_ROUTES.welcome.reminder);

  return (
    <OnboardBedScreen
      packets={packets}
      selectedId={selectedId}
      onSelect={setPicked}
      onContinue={() => {
        if (!selectedId) {
          next();
          return;
        }
        save.mutate({ first_topic_id: selectedId }, { onSuccess: next });
      }}
      back={GARDEN_ROUTES.welcome.goal}
      saving={save.isPending}
      error={save.isError}
    />
  );
}
