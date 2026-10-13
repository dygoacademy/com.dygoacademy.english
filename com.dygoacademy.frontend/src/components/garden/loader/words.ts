/**
 * The "While you wait" words on the slow loading screen (LD3,
 * docs/plans/Loading screen implementation plan.md §3). The word, IPA and
 * example stay English in every language; the meaning is
 * `screens.loader.words.<key>` and the part of speech is
 * `components.partOfSpeech.<pos>`.
 */
export type WaitPos = 'verb' | 'noun' | 'adjective';

export type WaitKey =
  'bloom' | 'sprout' | 'thrive' | 'nurture' | 'harvest' | 'flourish' | 'cultivate' | 'resilient';

export interface WaitWord {
  key: WaitKey;
  word: string;
  ipa: string;
  pos: WaitPos;
  example: string;
}

export const WAIT_WORDS: readonly WaitWord[] = [
  {
    key: 'bloom',
    word: 'bloom',
    ipa: '/bluːm/',
    pos: 'verb',
    example: 'Her English bloomed in a year.',
  },
  {
    key: 'sprout',
    word: 'sprout',
    ipa: '/spraʊt/',
    pos: 'verb',
    example: 'New ideas sprout when you read widely.',
  },
  {
    key: 'thrive',
    word: 'thrive',
    ipa: '/θraɪv/',
    pos: 'verb',
    example: 'Plants thrive with regular water.',
  },
  {
    key: 'nurture',
    word: 'nurture',
    ipa: '/ˈnɜːtʃə/',
    pos: 'verb',
    example: 'Good teachers nurture curiosity.',
  },
  {
    key: 'harvest',
    word: 'harvest',
    ipa: '/ˈhɑːvɪst/',
    pos: 'noun',
    example: 'This year’s harvest was excellent.',
  },
  {
    key: 'flourish',
    word: 'flourish',
    ipa: '/ˈflʌrɪʃ/',
    pos: 'verb',
    example: 'Small businesses flourish here.',
  },
  {
    key: 'cultivate',
    word: 'cultivate',
    ipa: '/ˈkʌltɪveɪt/',
    pos: 'verb',
    example: 'Cultivate a habit of daily reading.',
  },
  {
    key: 'resilient',
    word: 'resilient',
    ipa: '/rɪˈzɪliənt/',
    pos: 'adjective',
    example: 'Resilient learners keep going after mistakes.',
  },
];
