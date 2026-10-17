import type { MissionClient } from './missions.store';
import { readWeek, recordRescue, settleWeek, weeklySafely } from './weekly.store';

interface Week {
  row?: { sound: string; goals: Record<string, number>; rescued: number; rewarded_at: Date | null };
  bees?: Array<{ ipa_uk: string; pollinated?: boolean; pollinated_before?: boolean }>;
  leeches?: number;
  water?: number;
  sentences?: number;
  harvests?: string[];
  freezes?: number;
}

/** A pg client answering by SQL shape; the week's row appears once inserted. */
function clientFor(week: Week): MissionClient & { query: jest.Mock } {
  let row = week.row ?? null;
  const query = jest.fn((sql: string, params: unknown[] = []): { rows: unknown[] } => {
    if (sql.startsWith('savepoint') || sql.startsWith('release') || sql.startsWith('rollback'))
      return { rows: [] };
    if (sql.includes('from public.weekly_missions')) return { rows: row ? [row] : [] };
    if (sql.includes('insert into public.weekly_missions')) {
      row = {
        sound: params[2] as string,
        goals: JSON.parse(params[3] as string),
        rescued: 0,
        rewarded_at: null,
      };
      return { rows: [] };
    }
    if (sql.includes('with beds as'))
      return {
        rows: (week.bees ?? []).map((b, i) => ({
          topic_word_id: `tw-${i}`,
          word: `w${i}`,
          ipa_uk: b.ipa_uk,
          ipa_us: null,
          pollinated: b.pollinated ?? false,
          pollinated_before: b.pollinated_before ?? false,
        })),
      };
    if (sql.includes('is_leech')) return { rows: [{ n: String(week.leeches ?? 0) }] };
    if (sql.includes("source = 'flashcard'")) return { rows: [{ n: String(week.water ?? 0) }] };
    if (sql.includes('from public.speaking_attempts'))
      return { rows: [{ n: String(week.sentences ?? 0) }] };
    if (sql.includes('from public.speaking_harvests h'))
      return { rows: (week.harvests ?? []).map((ipa) => ({ ipa_uk: ipa, ipa_us: null })) };
    if (sql.includes('set rewarded_at = now()')) {
      if (!row || row.rewarded_at) return { rows: [] };
      row = { ...row, rewarded_at: new Date() };
      return { rows: [{ week_start: params[1] }] };
    }
    if (sql.includes('update public.profiles')) return { rows: [] };
    if (sql.includes('rescued_word_ids = array_append')) return { rows: [] };
    if (sql.includes('from public.review_logs rl')) return { rows: [{ id: 'tw-9' }] };
    if (sql.includes('streak_freezes_available from public.profiles'))
      return { rows: [{ streak_freezes_available: week.freezes ?? 2 }] };
    throw new Error(`unexpected SQL: ${sql}`);
  });
  return { query } as unknown as MissionClient & { query: jest.Mock };
}

const sqlOf = (query: jest.Mock, part: string): unknown[][] =>
  (query.mock.calls as unknown[][]).filter(([sql]) => String(sql).includes(part));

const TZ = 'Asia/Ho_Chi_Minh';
// Friday 16 October 2026, 12:00 in Ho Chi Minh.
const NOW = new Date('2026-10-16T05:00:00Z');
const TH = ['/θɪŋk/', '/θriː/', '/ɡrəʊθ/', '/pɑːθ/', '/mʌnθ/', '/bɑːθ/'];

describe('weekly missions store (A4 This week)', () => {
  it("creates the week's row on the first read: th, Rescue 3, sentence 3, sound 5", async () => {
    const client = clientFor({ bees: TH.map((ipa_uk) => ({ ipa_uk })), leeches: 4 });
    const week = await readWeek(client, 'u', TZ, NOW);
    const insert = sqlOf(client.query, 'insert into public.weekly_missions')[0][1] as unknown[];
    expect(insert.slice(0, 3)).toEqual(['u', '2026-10-12', 'th_think']);
    expect(JSON.parse(insert[3] as string)).toEqual({ rescue: 3, sentence: 3, sound: 5 });
    expect(week).toMatchObject({
      weekStart: '2026-10-12',
      daysLeft: 2,
      sound: { key: 'th_think', label: 'th', examples: ['w0', 'w1', 'w2'] },
      missions: [
        { key: 'rescue', goal: 3, count: 0, done: false },
        { key: 'sentence', goal: 3, count: 0, done: false },
        { key: 'sound', goal: 5, count: 0, done: false },
      ],
      rewardEarned: false,
      wilting: 4,
      sentenceWords: ['tw-9'],
      soundWords: ['tw-0', 'tw-1', 'tw-2'],
    });
  });

  it('no wilting words: Water 20 words, counted from flashcard reviews this week', async () => {
    const client = clientFor({ bees: TH.map((ipa_uk) => ({ ipa_uk })), leeches: 0, water: 7 });
    const week = await readWeek(client, 'u', TZ, NOW);
    expect(week.missions[0]).toEqual({ key: 'water', goal: 20, count: 7, done: false });
  });

  it('fewer wilting words than 3: Rescue asks for that many', async () => {
    const client = clientFor({ bees: TH.map((ipa_uk) => ({ ipa_uk })), leeches: 1 });
    const week = await readWeek(client, 'u', TZ, NOW);
    expect(week.missions[0]).toMatchObject({ key: 'rescue', goal: 1 });
  });

  it('words pollinated before this week do not count toward the sound goal', async () => {
    const bees = TH.slice(0, 4).map((ipa_uk, i) => ({ ipa_uk, pollinated_before: i < 2 }));
    const client = clientFor({ bees });
    await readWeek(client, 'u', TZ, NOW);
    const insert = sqlOf(client.query, 'insert into public.weekly_missions')[0][1] as unknown[];
    // Only 2 th words are left, so th is skipped for the next sound with 3 (none: rotation's, 3).
    expect(JSON.parse(insert[3] as string).sound).toBe(3);
  });

  it('sound counts only pollinated words with the sound, capped at the goal', async () => {
    const client = clientFor({
      row: {
        sound: 'th_think',
        goals: { rescue: 3, sentence: 3, sound: 5 },
        rescued: 2,
        rewarded_at: null,
      },
      sentences: 4,
      harvests: ['/θɪŋk/', '/ðɪs/', '/θriː/'],
    });
    const { missions } = await settleWeek(client, 'u', TZ, NOW);
    expect(missions).toEqual([
      { key: 'rescue', goal: 3, count: 2, done: false },
      { key: 'sentence', goal: 3, count: 3, done: true },
      { key: 'sound', goal: 5, count: 2, done: false },
    ]);
  });

  it('all 3 done: +1 rain barrel once a week, max 3, keeping a stale Monday refill', async () => {
    const client = clientFor({
      row: {
        sound: 'th_think',
        goals: { rescue: 3, sentence: 3, sound: 3 },
        rescued: 3,
        rewarded_at: null,
      },
      sentences: 3,
      harvests: TH.slice(0, 3),
    });
    await settleWeek(client, 'u', TZ, NOW);
    await settleWeek(client, 'u', TZ, NOW);
    const grants = sqlOf(client.query, 'update public.profiles');
    expect(grants).toHaveLength(1);
    expect(grants[0][0]).toMatch(/least\(\$3::int/);
    expect(grants[0][0]).toMatch(/greatest\(streak_freezes_available, \$4::int\)/);
    expect(grants[0][1]).toEqual(['u', '2026-10-12', 3, 2]);
  });

  it('not all done: no reward', async () => {
    const client = clientFor({
      row: {
        sound: 'th_think',
        goals: { rescue: 3, sentence: 3, sound: 3 },
        rescued: 3,
        rewarded_at: null,
      },
      sentences: 2,
      harvests: TH.slice(0, 3),
    });
    await settleWeek(client, 'u', TZ, NOW);
    expect(sqlOf(client.query, 'set rewarded_at')).toHaveLength(0);
  });

  it('a rescued word is added once (no duplicates)', async () => {
    const client = clientFor({
      row: {
        sound: 'th_think',
        goals: { rescue: 3, sentence: 3, sound: 3 },
        rescued: 0,
        rewarded_at: null,
      },
    });
    await recordRescue(client, 'u', TZ, NOW, 'tw-1');
    const [sql, params] = sqlOf(client.query, 'array_append')[0];
    expect(sql).toMatch(/not \(\$3::uuid = any\(rescued_word_ids\)\)/);
    expect(params).toEqual(['u', '2026-10-12', 'tw-1']);
  });

  it('weeklySafely rolls back to its savepoint and swallows the error', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const onError = jest.fn();
    const ok = await weeklySafely(client, () => Promise.reject(new Error('no table')), onError);
    expect(ok).toBe(false);
    expect((client.query.mock.calls as unknown[][]).map(([sql]) => sql)).toEqual([
      'savepoint weekly_missions',
      'rollback to savepoint weekly_missions',
    ]);
    expect(onError).toHaveBeenCalled();
  });
});
