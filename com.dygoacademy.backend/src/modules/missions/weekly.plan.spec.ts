import { applyStreakFreezes } from '../srs/srs.service';
import { localDateOf } from './missions.store';
import {
  WEEKLY_SOUNDS,
  cleanIpa,
  daysLeftInWeek,
  hasSound,
  pickSound,
  soundByKey,
  soundIndexFor,
  weekStartOf,
  weeklyGoals,
} from './weekly.plan';

const sound = (key: string) => soundByKey(key);
const word = (ipa: string) => ({ ipa_uk: ipa, ipa_us: null });

describe('weekly missions plan (A4 This week)', () => {
  describe('week boundaries', () => {
    // 16:30Z Sunday = 23:30 Sunday in Ho Chi Minh (UTC+7), 00:30 Monday in Singapore (UTC+8).
    const SUNDAY_NIGHT = new Date('2026-10-18T16:30:00Z');

    it('Asia/Ho_Chi_Minh: still the week of Monday 12 October, last day', () => {
      const local = localDateOf(SUNDAY_NIGHT, 'Asia/Ho_Chi_Minh');
      expect(weekStartOf(local)).toBe('2026-10-12');
      expect(daysLeftInWeek(local)).toBe(0);
    });

    it('Asia/Singapore: already the next week (Monday 19 October), 6 days left', () => {
      const local = localDateOf(SUNDAY_NIGHT, 'Asia/Singapore');
      expect(weekStartOf(local)).toBe('2026-10-19');
      expect(daysLeftInWeek(local)).toBe(6);
    });

    it('Friday has 2 days left; Monday starts its own week', () => {
      expect(weekStartOf('2026-10-16')).toBe('2026-10-12');
      expect(daysLeftInWeek('2026-10-16')).toBe(2);
      expect(weekStartOf('2026-10-12')).toBe('2026-10-12');
    });
  });

  describe('sound of the week', () => {
    it('rotates one sound a week, th (think) first, and wraps', () => {
      expect(WEEKLY_SOUNDS[soundIndexFor('2026-10-12')].key).toBe('th_think');
      expect(WEEKLY_SOUNDS[soundIndexFor('2026-10-19')].key).toBe('th_this');
      expect(WEEKLY_SOUNDS[soundIndexFor('2026-10-26')].key).toBe('final_t_d');
      expect(soundIndexFor('2026-12-07')).toBe(0); // 8 weeks later
      expect(soundIndexFor('2026-10-05')).toBe(WEEKLY_SOUNDS.length - 1);
    });

    it('cleans IPA: slashes, stress, length, dots, first of several, syllabic marks', () => {
      expect(cleanIpa('/ˈθɪŋk/')).toBe('θɪŋk');
      expect(cleanIpa('/ɪˈfem.ər.əl/')).toBe('ɪfemərəl');
      expect(cleanIpa('/fiːl/, /fil/')).toBe('fil');
      expect(cleanIpa('/ˈbɒt.l̩/')).toBe('bɒtl');
      expect(cleanIpa(null)).toBe('');
    });

    it.each([
      ['th_think', '/θɪŋk/', true],
      ['th_think', '/ðɪs/', false],
      ['th_this', '/ðɪs/', true],
      ['final_t_d', '/wɒnt/', true],
      ['final_t_d', '/wɜːld/', true],
      ['final_t_d', '/ˈtɑːɡɪt/', true],
      ['final_t_d', '/ˈteɪbl̩/', false],
      ['final_s_z', '/kæts/', true],
      ['final_s_z', '/dɒɡz/', true],
      ['sh', '/ʃiː/', true],
      ['sh', '/tʃɜːtʃ/', false],
      ['v', '/ˈveri/', true],
      ['r', '/raɪt/', true],
      ['r', '/ɹaɪt/', true],
      ['final_l', '/fiːl/', true],
      ['final_l', '/ˈlʌki/', false],
    ])('%s matches %s: %s', (key, ipa, expected) => {
      expect(hasSound(sound(key), [ipa])).toBe(expected);
    });

    it('matches on either accent', () => {
      expect(hasSound(sound('r'), ['/kɑː/', '/kɑr/'])).toBe(true);
    });

    it('goal is 5 when 5+ words have the sound, else the number that do', () => {
      const th = ['/θɪŋk/', '/θriː/', '/ɡrəʊθ/', '/pɑːθ/', '/mʌnθ/', '/bɑːθ/'].map(word);
      expect(pickSound('2026-10-12', th)).toEqual({ sound: sound('th_think'), goal: 5 });
      expect(pickSound('2026-10-12', th.slice(0, 4)).goal).toBe(4);
      expect(pickSound('2026-10-12', th.slice(0, 3)).goal).toBe(3);
    });

    it('fewer than 3 words with the sound: the next sound in the list', () => {
      const words = ['/θɪŋk/', '/ðɪs/', '/ðæt/', '/ðeə/'].map(word);
      expect(pickSound('2026-10-12', words)).toEqual({ sound: sound('th_this'), goal: 3 });
    });

    it('no sound has 3 words: the rotation sound with a goal of 3', () => {
      expect(pickSound('2026-10-19', [word('/θɪŋk/')])).toEqual({
        sound: sound('th_this'),
        goal: 3,
      });
    });
  });

  it('no wilting words: Water 20 words instead of Rescue', () => {
    expect(weeklyGoals(4, 5)).toEqual({ rescue: 3, sentence: 3, sound: 5 });
    expect(weeklyGoals(0, 5)).toEqual({ water: 20, sentence: 3, sound: 5 });
  });

  describe('rain barrels (applyStreakFreezes)', () => {
    const base = { studyDates: ['2026-10-19'], frozenDates: [], today: '2026-10-19' };

    it("Monday's refill keeps an earned 3rd barrel", () => {
      const r = applyStreakFreezes({ ...base, available: 3, refilledOn: '2026-10-12' });
      expect(r.available).toBe(3);
      expect(r.refilledOn).toBe('2026-10-19');
    });

    it('Monday refills to 2 from fewer', () => {
      const r = applyStreakFreezes({ ...base, available: 0, refilledOn: '2026-10-12' });
      expect(r.available).toBe(2);
    });

    it('never holds more than 3', () => {
      const r = applyStreakFreezes({ ...base, available: 5, refilledOn: '2026-10-19' });
      expect(r.available).toBe(3);
    });
  });
});
