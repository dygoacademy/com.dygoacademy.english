import fixture from '../../../../public/audio/speaking-fixture/fixture-mitigate.json';
import type { SpeakingSession, SpeakingSessionItem, SpeakingTimings } from '@/types';

/**
 * Phase 13 screen fixtures: the handover's "mitigate" sentence with the
 * local dev clips (macOS say, `public/audio/speaking-fixture/`), plus four
 * more words for a full five-sentence Pond. Used by tests, the gallery and
 * the reference pages; never shown to learners.
 */
const BASE = '/audio/speaking-fixture/';

export const SPEAK_FIXTURE_ITEM: SpeakingSessionItem = {
  id: 'fixture-mitigate',
  lexicon_id: 'fixture-lexicon-mitigate',
  topic_word_id: 'fixture-tw-mitigate',
  word: 'mitigate',
  part_of_speech: 'verb',
  cefr_level: 'C1',
  ipa_uk: fixture.ipa_uk,
  ipa_us: fixture.ipa_us,
  definition_en: 'to make something bad less harmful or serious',
  meaning_locale: null,
  meaning_translation: null,
  sentence: fixture.sentence,
  target_index: fixture.target_index,
  audio_uk_url: `${BASE}fixture-mitigate-uk.m4a`,
  audio_us_url: `${BASE}fixture-mitigate-us.m4a`,
  timings_uk: fixture.timings_uk as SpeakingTimings,
  timings_us: fixture.timings_us as SpeakingTimings,
  is_due: true,
};

/** The same sentence with a Vietnamese meaning first (vi meaning language). */
export const SPEAK_FIXTURE_ITEM_VI: SpeakingSessionItem = {
  ...SPEAK_FIXTURE_ITEM,
  meaning_locale: 'vi-VN',
  meaning_translation: 'giảm nhẹ, làm dịu bớt',
};

const OTHERS: Array<
  Pick<SpeakingSessionItem, 'word' | 'ipa_uk' | 'cefr_level' | 'part_of_speech'>
> = [
  { word: 'drought', ipa_uk: '/draʊt/', cefr_level: 'B2', part_of_speech: 'noun' },
  {
    word: 'biodiversity',
    ipa_uk: '/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/',
    cefr_level: 'C1',
    part_of_speech: 'noun',
  },
  {
    word: 'sustainable',
    ipa_uk: '/səˈsteɪ.nə.bəl/',
    cefr_level: 'B2',
    part_of_speech: 'adjective',
  },
  { word: 'deteriorate', ipa_uk: '/dɪˈtɪə.ri.ə.reɪt/', cefr_level: 'C1', part_of_speech: 'verb' },
];

/** Five sentences (the four extra words reuse the mitigate clip and timings). */
export const SPEAK_FIXTURE_SESSION: SpeakingSession = {
  item_count: 5,
  default_accent: 'US',
  items: [
    SPEAK_FIXTURE_ITEM,
    ...OTHERS.map((o, i) => ({
      ...SPEAK_FIXTURE_ITEM,
      ...o,
      ipa_us: o.ipa_uk,
      id: `fixture-${o.word}`,
      topic_word_id: `fixture-tw-${o.word}`,
      is_due: i < 2,
    })),
  ],
};
