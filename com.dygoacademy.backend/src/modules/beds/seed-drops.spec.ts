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
  it('plants each reviewed relation in My words and records the drop', async () => {
    const c = client([
      [{ id: MY_WORDS }],
      [
        { related_word: 'mitigate the risk', kind: 'pairing' },
        { related_word: 'mitigation', kind: 'family' },
      ],
      [{ topic_word_id: 's1', source_word: 'mitigate the risk', language_code: 'en' }],
      [],
      [{ topic_word_id: 's2', source_word: 'mitigation', language_code: 'en' }],
      [],
    ]);
    const seeds = await dropSeeds(c, 'user-1', FRUIT);
    expect(seeds.map((s) => s.topic_word_id)).toEqual(['s1', 's2']);

    const [relSql, relParams] = c.query.mock.calls[1];
    expect(relParams).toEqual([FRUIT, MY_WORDS]);
    expect(relSql).toMatch(
      /order by case r\.kind when 'pairing' then 0 when 'family' then 1 else 2 end/,
    );
    expect(relSql).toMatch(new RegExp(`limit ${SEEDS_PER_FRUIT}$`));
    // Only reviewed rows reach learners (RLS), and nothing already in the garden.
    expect(relSql).toMatch(/from public\.user_word_srs uws/);

    expect(c.query.mock.calls[2][1]).toEqual([MY_WORDS, 'mitigate the risk', 'user-1']);
    expect(c.query.mock.calls[3][0]).toMatch(/insert into public\.seed_drops/);
    expect(c.query.mock.calls[3][1]).toEqual(['s1', FRUIT, 'pairing']);
  });

  it('skips a word already in My words, and drops nothing without relations', async () => {
    const c = client([[{ id: MY_WORDS }], [{ related_word: 'reduce', kind: 'synonym' }], []]);
    await expect(dropSeeds(c, 'user-1', FRUIT)).resolves.toEqual([]);
    expect(c.query).toHaveBeenCalledTimes(3);

    const none = client([[{ id: MY_WORDS }], []]);
    await expect(dropSeeds(none, 'user-1', FRUIT)).resolves.toEqual([]);
  });
});
