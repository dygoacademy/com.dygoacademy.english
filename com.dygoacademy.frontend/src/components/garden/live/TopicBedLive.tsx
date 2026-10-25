'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useSpeakingHarvest } from '@/hooks/useSpeakingHarvest';
import { useSpeakingSession } from '@/hooks/useSpeakingSession';
import { useStudySession } from '@/hooks/useStudySession';
import { useTopic } from '@/hooks/useTopic';
import { useAccent } from '@/lib/accent';
import { POND_SESSION_SIZE } from '@/lib/speaking/constants';
import { toLocalDateString } from '@/lib/timezone';

import { AddWordSheet } from '../AddWordSheet';
import { useGardenPreferences } from '../preferences';
import { TopicBedScreen } from '../screens/TopicBedScreen';
import { bedMeanings, beesCard, toBedWords, type GardenTopicWord } from './data';
import { LiveError, LiveLoading } from './LiveState';
import { useAddWordBeds, useBedTitle, useSaveToMyWords } from './useSaveToMyWords';
import { TopicBedsSidebar } from './SidebarLists';

/** How many seeds "Plant N new" sows at a time (as A1b's extra and A6b's Plant). */
const PLANT_COUNT = 5;

/**
 * /topics/[id]: a topic bed (A7) from GET /topics/:id and the
 * topic's due cards (POST /srs/sessions with the topic).
 *
 * U5-3: each word's plant stage, wilting and next watering come from the
 * caller's SRS state on GET /topics/:id (U5-1) via `toBedWords`, so the
 * stage tiles show real counts and filter the list, and words are sorted
 * by next watering. Meanings come from the due cards when they carry one:
 * the learner's meaning-language translation when `meaningLocale` is set
 * and that card has one (same source as the review card, design system
 * §14.8), English `definition_en` otherwise (2026-09-29 — previously
 * always English, ignoring the meaning-language preference).
 *
 * U5-4: "Water N due" opens watering scoped to this bed's due words
 * (/review?topic=…&due=1; 2026-10-15: seeds no longer count as due, so
 * the number matches A6's badge). "Plant N new" sows up to 5 of its seeds
 * (/review?new=5&topic=…), and takes Water's place when nothing is due; +
 * opens the garden Add word sheet (POST /words, then the bed refetches).
 * Options still opens the classic topic page. A7c (2026-10-11): the
 * search button opens /topics/[id]/search.
 *
 * U5-6: Quiz opens the garden quiz for this bed (/quiz?topic=…),
 * and wilting rows open the leech drill (…&mode=leech), which comes back
 * to this bed.
 *
 * Phase 13 SE2: "Speak · N sentences from this bed" opens this bed's Pond
 * (GET /speaking/session?topic_id=…; hidden when no word has a speaking
 * item). "Bees are waiting" (2026-10-11, was SE5 "Ready to harvest") lists
 * up to 3 ripe words with a speaking item and today's pollinated ones
 * (GET /speaking/harvest, `beesCard`); each mic opens Pronunciation (P1,
 * say one word; a pass pollinates it), "Say all" runs the waiting ones in
 * a row, and both come back here.
 */
export function TopicBedLive({ topicId }: { topicId: string }) {
  const t = useTranslations('screens.bed');
  const topic = useTopic(topicId);
  const { meaningLocale } = useGardenPreferences();
  // 100 is the API's cap (StartSessionDto @Max(100)); 200 was a 400, so the
  // bed never showed "Water N due".
  const due = useStudySession(topicId, 'STANDARD', 100);
  const [adding, setAdding] = useState(false);
  const speaking = useSpeakingSession(topicId);
  const harvests = useSpeakingHarvest(topicId);
  const accent = useAccent();
  const saveToMyWords = useSaveToMyWords(topicId);
  const bedTitle = useBedTitle(topicId, topic.data?.title ?? '');
  const addWordBeds = useAddWordBeds(topicId, bedTitle, t('addSheet.myWords'));

  if (topic.isPending) return <LiveLoading />;
  if (topic.isError || !topic.data) {
    return <LiveError message={t('notFound')} onRetry={() => void topic.refetch()} />;
  }

  const cards = due.data?.cards ?? [];
  const { words, stageCounts } = toBedWords(
    topic.data.words as GardenTopicWord[],
    bedMeanings(cards, meaningLocale),
    new Date(),
  );
  // Reviewed words due now, the same count as A6's badge; seeds (new
  // cards) are planted through "Plant N new" instead of counted as due.
  const dueCount = new Set(cards.filter((c) => !c.is_new).map((c) => c.topic_word_id)).size;
  const seedCount = new Set(cards.filter((c) => c.is_new).map((c) => c.topic_word_id)).size;
  const plantCount = Math.min(seedCount, PLANT_COUNT);
  const bedHref = GARDEN_ROUTES.topic(topicId);
  const speakCount = Math.min(speaking.data?.item_count ?? 0, POND_SESSION_SIZE);
  const bees = beesCard(
    words,
    harvests.data,
    toLocalDateString(new Date()),
    (id) => GARDEN_ROUTES.pronounce({ words: [id], topic: topicId, back: bedHref }),
    (ids) => GARDEN_ROUTES.pronounce({ words: ids, topic: topicId, back: bedHref }),
    accent,
  );

  return (
    <>
      <TopicBedScreen
        title={bedTitle}
        meta={{ collection: null, level: null, words: topic.data.words.length }}
        backHref={GARDEN_ROUTES.topics}
        stageCounts={stageCounts}
        words={words}
        water={
          dueCount > 0
            ? {
                count: dueCount,
                href: GARDEN_ROUTES.waterBed(topicId),
              }
            : null
        }
        plant={
          plantCount > 0
            ? { count: plantCount, href: GARDEN_ROUTES.plant(plantCount, topicId) }
            : null
        }
        quizHref={GARDEN_ROUTES.quiz(topicId)}
        searchHref={GARDEN_ROUTES.topicSearch(topicId)}
        addWordHref={bedHref}
        speak={
          speakCount > 0
            ? { count: speakCount, href: GARDEN_ROUTES.speak({ topic: topicId, back: bedHref }) }
            : null
        }
        bees={bees}
        onAddWord={() => setAdding(true)}
        wiltingHref={GARDEN_ROUTES.quiz(topicId, 'leech')}
        sidebar={<TopicBedsSidebar activeId={topicId} />}
      />
      <AddWordSheet
        topicId={topicId}
        topicTitle={bedTitle}
        saveToMyWords={saveToMyWords}
        beds={addWordBeds}
        open={adding}
        onOpenChange={setAdding}
      />
    </>
  );
}

