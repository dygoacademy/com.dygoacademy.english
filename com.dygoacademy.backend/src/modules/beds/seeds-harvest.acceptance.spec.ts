/**
 * Seeds & Harvest acceptance runs (plan section 6), against a real seeded
 * database. Skipped unless SEEDS_HARVEST_TEST_DATABASE_URL points at a
 * throwaway database built from the schema, migrations and the seeds
 * 01_core_fixtures + 07_seeds_harvest_fixture. Everything runs in one
 * transaction as the fixture learner Alex and is rolled back.
 *
 *   SEEDS_HARVEST_TEST_DATABASE_URL=postgres://… npx jest seeds-harvest.acceptance
 */
import { Client } from 'pg';

import type { DatabaseService } from '../../database/database.service';
import { SrsService } from '../srs/srs.service';
import { BedsService } from './beds.service';
import { dropSeeds } from './seed-drops';

const URL = process.env.SEEDS_HARVEST_TEST_DATABASE_URL;
const ALEX = '33333333-3333-3333-3333-333333333333';
const BED = 'cccccccc-5eed-0000-0000-000000000001';
const MITIGATE = 'eeeeeeee-5eed-0000-0000-000000000001';

const run = URL ? describe : describe.skip;

run('Seeds & Harvest acceptance (seeded database)', () => {
  let client: Client;
  let srs: SrsService;
  let beds: BedsService;

  beforeAll(async () => {
    client = new Client({ connectionString: URL });
    await client.connect();
    await client.query('begin');
    await client.query(
      `select set_config('request.jwt.claim.sub', $1, true),
                               set_config('request.jwt.claims', $2, true)`,
      [ALEX, JSON.stringify({ sub: ALEX, role: 'authenticated' })],
    );
    await client.query('set local role authenticated');
    // As SrsService and BedsService see it: every call on this one client.
    const db = {
      withUser: (_u: string, work: (c: Client) => Promise<unknown>) => work(client),
      queryAs: async (_u: string, text: string, params: unknown[] = []) =>
        (await client.query<Record<string, unknown>>(text, params)).rows,
    } as unknown as DatabaseService;
    const flagOn = { get: (key: string) => key === 'seedDrops.enabled' };
    srs = new SrsService(db, flagOn as never);
    beds = new BedsService(db, flagOn as never);
  });

  afterAll(async () => {
    await client.query('rollback');
    await client.end();
  });

  it('Phase 1: a 5-word bed fully planted on day 1 is harvested, and day 2 has words to plant', async () => {
    await client.query(
      `insert into public.user_beds (topic_id) values ($1)
                        on conflict (user_id, topic_id) do update set status = 'active'`,
      [BED],
    );
    const day1 = await srs.findDue(ALEX, undefined, 20, true);
    expect(day1.slice(0, 5).map((c) => c.topic_id)).toEqual(Array(5).fill(BED));
    for (const card of day1.filter((c) => c.topic_id === BED)) {
      await client.query(
        `insert into public.user_word_srs (user_id, topic_word_id, fsrs_state, stability)
         values ($1, $2, 'Review', 5)`,
        [ALEX, card.topic_word_id],
      );
    }
    const active = await beds.active(ALEX);
    expect(active).toMatchObject({ topic_id: BED, word_count: 5, harvest_ready: true });
    const harvest = await beds.harvest(ALEX, BED);
    expect(harvest.words).toHaveLength(5);

    const { packets } = await beds.packets(ALEX);
    expect(packets.length).toBeGreaterThan(0);
    expect(packets.map((p) => p.topic_id)).not.toContain(BED);
    await beds.plant(ALEX, packets[0].topic_id);
    const after = await client.query<{ topic_id: string; status: string }>(
      `select topic_id, status from public.user_beds order by status`,
    );
    expect(after.rows).toEqual(
      expect.arrayContaining([
        { topic_id: packets[0].topic_id, status: 'active' },
        { topic_id: BED, status: 'harvested' },
      ]),
    );
    const day2 = await srs.findDue(ALEX, undefined, 5, true);
    expect(day2.length).toBeGreaterThan(0);
    expect(day2[0].topic_id).toBe(packets[0].topic_id);
  });

  it('Phase 2: mitigate turning fruit drops "mitigate the risk" and "mitigation" exactly once', async () => {
    const first = await dropSeeds(client, ALEX, MITIGATE);
    expect(first.map((s) => s.source_word)).toEqual(['mitigate the risk', 'mitigation']);
    // A retried review, or mitigate turning fruit again, drops nothing more.
    await expect(dropSeeds(client, ALEX, MITIGATE)).resolves.toEqual([]);

    const drop = await beds.drop(ALEX, MITIGATE);
    expect(drop.seeds.map((s) => [s.word, s.kind])).toEqual([
      ['mitigate the risk', 'pairing'],
      ['mitigation', 'family'],
    ]);
    expect(drop.bed).toEqual({ topic_id: BED, title: 'Environment (Seeds & Harvest test)' });
    expect([drop.bed_words_before, drop.bed_words_after]).toEqual([5, 7]);

    // Seeds queued: the bed is no longer ready to harvest.
    const bed = await client.query<{ n: number }>(
      `select count(*)::int as n from public.seed_drops where bed_topic_id = $1 and seen_at is null`,
      [BED],
    );
    expect(bed.rows[0].n).toBe(2);
  });

  it('Phase 2: seeds plant after the active bed’s own words', async () => {
    await client.query(`update public.user_beds set status = 'resting' where status = 'active'`);
    await client.query(
      `update public.user_beds set status = 'active', harvested_at = null where topic_id = $1`,
      [BED],
    );
    // The library adds a word to the bed (as service_role), so the bed
    // has one of its own words left to plant next to the two seeds.
    await client.query('set local role service_role');
    await client.query(`insert into public.master_lexicon (id, normalized_word, definition_en, audio_url_us)
                        values ('dddddddd-5eed-0000-0000-000000000099', 'carbon', 'a chemical element',
                                'https://media.dygo.test/audio/carbon.mp3')`);
    await client.query(
      `insert into public.topic_words (topic_id, lexicon_id, source_word, status)
                        values ($1, 'dddddddd-5eed-0000-0000-000000000099', 'carbon', 'READY')`,
      [BED],
    );
    await client.query('set local role authenticated');
    const cards = await srs.findDue(ALEX, undefined, 10, true);
    const words = cards.map((c) => c.source_word);
    const seedAt = Math.min(words.indexOf('mitigate the risk'), words.indexOf('mitigation'));
    expect(seedAt).toBeGreaterThan(-1);
    expect(words.indexOf('carbon')).toBeGreaterThan(-1);
    expect(words.indexOf('carbon')).toBeLessThan(seedAt);
  });
});
