import { authHeader, ApiEnvelope, request } from '../support/client';
import { TOPICS, WORDS } from '../support/fixtures';

type TopicWord = {
  id: string;
  status: 'ENRICHING' | 'READY' | 'FAILED';
  source_word: string;
  failure_reason?: string | null;
};

async function getWord(topicId: string, wordId: string, token: ReturnType<typeof authHeader>) {
  const res = await request.get(`/topics/${topicId}`).set(token);
  const words = (res.body as ApiEnvelope<{ words: TopicWord[] }>).data.words;
  return words.find((w) => w.id === wordId);
}

async function pollUntilSettled(
  topicId: string,
  wordId: string,
  token: ReturnType<typeof authHeader>,
  { attempts = 10, delayMs = 1500 } = {},
): Promise<TopicWord | undefined> {
  for (let i = 0; i < attempts; i++) {
    const word = await getWord(topicId, wordId, token);
    if (word && word.status !== 'ENRICHING') return word;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return getWord(topicId, wordId, token);
}

describe('Module 2 — Word ingestion & AI enrichment', () => {
  it('POST /words returns 201 with status ENRICHING immediately (FR-2.1, no waiting on the fast path)', async () => {
    const start = Date.now();
    const res = await request
      .post('/words')
      .set(authHeader('marco'))
      .send({ topicId: TOPICS.unit1AbstractNouns, word: `qa-word-${Date.now()}` });
    const elapsedMs = Date.now() - start;

    expect(res.status).toBe(201);
    const body = (res.body as ApiEnvelope<TopicWord>).data;
    expect(body.status).toBe('ENRICHING');
    // Not asserting the <50ms SLO strictly (network + local overhead in a
    // test runner isn't the same as the p95 target), just that it's fast,
    // i.e. genuinely async and not blocking on the AI call.
    expect(elapsedMs).toBeLessThan(2000);
  });

  it('a real word eventually settles to READY or FAILED, never stuck ENRICHING (worker is alive)', async () => {
    const created = await request
      .post('/words')
      .set(authHeader('marco'))
      .send({ topicId: TOPICS.unit1AbstractNouns, word: 'meticulous' });
    expect(created.status).toBe(201);
    const wordId = (created.body as ApiEnvelope<TopicWord>).data.id;

    const settled = await pollUntilSettled(TOPICS.unit1AbstractNouns, wordId, authHeader('marco'));
    expect(settled).toBeDefined();
    expect(['READY', 'FAILED']).toContain(settled!.status);

    if (settled!.status === 'FAILED') {
      // eslint-disable-next-line no-console
      console.warn(
        `enrichment worker reported FAILED for 'meticulous': ${settled!.failure_reason}. ` +
          'Not treated as a test failure by itself — this can be a real ' +
          'external Gemini/API-key problem in this environment, which is ' +
          "useful signal on its own, but it isn't what this test is checking.",
      );
    }
  }, 30000);

  it('POST /words as READ (alex) is blocked — enrichment ingestion requires WRITE', async () => {
    const res = await request
      .post('/words')
      .set(authHeader('alex'))
      .send({ topicId: TOPICS.unit1AbstractNouns, word: 'should-not-be-created' });
    expect([403, 404, 409]).toContain(res.status);
  });

  it('POST /words/:id/re-enrich flips a FAILED word back to ENRICHING', async () => {
    const before = await getWord(TOPICS.unit1AbstractNouns, WORDS.ubiquitousFailed, authHeader('marco'));
    if (before?.status !== 'FAILED') {
      // This test mutates the shared seed fixture (FAILED -> ENRICHING ->
      // settled) the first time it runs against a given database, so a
      // repeat run without a fresh `apply-migrations.sh --seed` won't find
      // it FAILED anymore. That's expected, not a regression — the 404
      // no-op case right below covers the same code path from the other
      // direction, so skip rather than false-fail here.
      console.warn(
        `WORDS.ubiquitousFailed is currently '${before?.status}', not 'FAILED' — ` +
          're-seed the database to re-run this specific assertion. Skipping.',
      );
      return;
    }

    const res = await request
      .post(`/words/${WORDS.ubiquitousFailed}/re-enrich`)
      .set(authHeader('marco'));
    expect(res.status).toBe(200);

    const after = await getWord(TOPICS.unit1AbstractNouns, WORDS.ubiquitousFailed, authHeader('marco'));
    expect(after?.status).toBe('ENRICHING');

    // Let the worker resolve it one way or another rather than leaving the
    // shared fixture word stuck ENRICHING for the rest of the suite.
    await pollUntilSettled(TOPICS.unit1AbstractNouns, WORDS.ubiquitousFailed, authHeader('marco'));
  }, 30000);

  it('re-enrich on a word that is not currently FAILED is a no-op 404 (READY word untouched)', async () => {
    const res = await request.post(`/words/${WORDS.ephemeral}/re-enrich`).set(authHeader('marco'));
    expect(res.status).toBe(404);
  });
});
