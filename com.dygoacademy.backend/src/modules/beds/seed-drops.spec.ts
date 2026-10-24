import { dropSeeds, SEEDS_PER_FRUIT } from './seed-drops';

const FRUIT = 'aaaaaaaa-0000-0000-0000-000000000001';
const MY_WORDS = 'bbbbbbbb-0000-0000-0000-000000000001';

/** A client answering `query` from `answers` in order. */
function client(answers: unknown[][]) {
  const query = jest.fn();
  for (const rows of answers) query.mockResolvedValueOnce({ rows });
  return { query };
}

describe('dropSeeds (S1 Fruit drops seeds)', () => {
  it('plants each reviewed relation with audio in My words, READY, and records the drop', async () => {
    const c = client([
      [{ id: MY_WORDS }],
      [
        { kind: 'pairing', lexicon_id: 'lex-risk', word: 'mitigate the risk' },
        { kind: 'family', lexicon_id: 'lex-mitigation', word: 'mitigation' },
      ],
    ]);
    c.query.mockImplementation((sql: string) => {
      if (/insert into public\.topic_words/.test(sql)) {
        const n = c.query.mock.calls.filter(([q]) =>
          /insert into public\.topic_words/.test(String(q)),
        ).length;
        const word = n === 1 ? 'mitigate the risk' : 'mitigation';
        return Promise.resolve({
          rows: [{ topic_word_id: `s${n}`, source_word: word, language_code: 'en' }],
        });
      }
      if (/insert into public\.seed_drops/.test(sql))
        return Promise.resolve({ rows: [{ bed_topic_id: 'bed-1' }] });
      return Promise.resolve({ rows: [] });
    });
    const seeds = await dropSeeds(c, 'user-1', FRUIT);
    expect(seeds.map((s) => s.topic_word_id)).toEqual(['s1', 's2']);

    const calls = c.query.mock.calls as Array<[string, unknown[]]>;
    const [relSql, relParams] = calls[1];
    expect(relParams).toEqual([FRUIT, MY_WORDS]);
    expect(relSql).toMatch(
      /order by case when r\.kind = 'pairing' then 0 when r\.kind = 'family' then 1 when r\.kind = 'synonym' then 2 else 3 end/,
    );
    expect(relSql).toMatch(new RegExp(`limit ${SEEDS_PER_FRUIT}$`));
    // Only reviewed rows reach learners (RLS), nothing already in the garden,
    // only words with native audio, and a fruit word drops once.
    expect(relSql).toMatch(/from public\.user_word_srs uws/);
    expect(relSql).toMatch(/ml\.audio_url is not null and ml\.audio_url <> ''/);
    expect(relSql).toMatch(
      /not exists \(select 1 from public\.seed_drops sd where sd\.dropped_by = tw\.id\)/,
    );

    const words = calls.filter(([sql]) => /insert into public\.topic_words/.test(sql));
    expect(words[0][1]).toEqual([MY_WORDS, 'lex-risk', 'mitigate the risk', 'user-1']);
    expect(words[0][0]).toMatch(/'READY'/);
    const drops = calls.filter(([sql]) => /insert into public\.seed_drops/.test(sql));
    expect(drops[0][1]).toEqual(['s1', FRUIT, 'pairing']);
    const events = calls.filter(([sql]) => /insert into public\.product_events/.test(sql));
    expect(events).toHaveLength(2);
    expect(events[0][1][0]).toBe('seed_dropped');
    expect(JSON.parse(events[0][1][1] as string)).toEqual({
      word_id: FRUIT,
      seed_word_id: 's1',
      kind: 'pairing',
      bed_topic_id: 'bed-1',
    });
  });

  it('skips a word already in My words, and drops nothing without relations', async () => {
    const c = client([
      [{ id: MY_WORDS }],
      [{ kind: 'synonym', lexicon_id: 'lex-reduce', word: 'reduce' }],
      [],
    ]);
    await expect(dropSeeds(c, 'user-1', FRUIT)).resolves.toEqual([]);
    expect(c.query).toHaveBeenCalledTimes(3);

    const none = client([[{ id: MY_WORDS }], []]);
    await expect(dropSeeds(none, 'user-1', FRUIT)).resolves.toEqual([]);
  });
});
