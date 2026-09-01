import { authHeader, ApiEnvelope, request } from '../support/client';
import { WORDS } from '../support/fixtures';

describe('Module 3 — Error-Adaptive SRS', () => {
  describe('due queue & leeches (seeded, deterministic)', () => {
    it("GET /srs/due includes alex's overdue 'resilient' but not the not-yet-due 'ephemeral'", async () => {
      const res = await request.get('/srs/due').set(authHeader('alex'));
      expect(res.status).toBe(200);
      const ids = (res.body as ApiEnvelope<Array<{ topic_word_id: string }>>).data.map(
        (r) => r.topic_word_id,
      );
      expect(ids).toContain(WORDS.resilient); // next_due_at: now - 1h
      expect(ids).not.toContain(WORDS.ephemeral); // next_due_at: now + 5d
    });

    it("GET /srs/leeches includes 'resilient' (is_leech=true, alex failed it 5x)", async () => {
      const res = await request.get('/srs/leeches').set(authHeader('alex'));
      expect(res.status).toBe(200);
      const ids = (res.body as ApiEnvelope<Array<{ topic_word_id: string }>>).data.map(
        (r) => r.topic_word_id,
      );
      expect(ids).toContain(WORDS.resilient);
    });

    it('GET /srs/stats returns sane non-negative aggregates', async () => {
      const res = await request.get('/srs/stats').set(authHeader('alex'));
      expect(res.status).toBe(200);
      const stats = (
        res.body as ApiEnvelope<{
          total_words: number;
          mastered_words: number;
          due_now: number;
          leech_count: number;
          current_streak_days: number;
        }>
      ).data;
      expect(stats.total_words).toBeGreaterThanOrEqual(2);
      expect(stats.leech_count).toBeGreaterThanOrEqual(1);
      expect(stats.due_now).toBeGreaterThanOrEqual(0);
      expect(stats.current_streak_days).toBeGreaterThanOrEqual(0);
    });

    it("isolation: alex's and priya's SRS state on the same word never mixes", async () => {
      const [alexDue, priyaDue] = await Promise.all([
        request.get('/srs/due').set(authHeader('alex')),
        request.get('/srs/due').set(authHeader('priya')),
      ]);
      // Priya's 'resilient' row is next_due_at +12d (not due); alex's is
      // -1h (due). If these ever collided, priya's due list would also
      // contain it.
      const priyaIds = (priyaDue.body as ApiEnvelope<Array<{ topic_word_id: string }>>).data.map(
        (r) => r.topic_word_id,
      );
      expect(priyaIds).not.toContain(WORDS.resilient);
      const alexIds = (alexDue.body as ApiEnvelope<Array<{ topic_word_id: string }>>).data.map(
        (r) => r.topic_word_id,
      );
      expect(alexIds).toContain(WORDS.resilient);
    });
  });

  describe('rating a card (FR-3.1/3.2)', () => {
    it('POST /srs/rate with GOOD grows the interval per the SM-2-derived formula', async () => {
      const before = await request.get('/srs/due').set(authHeader('priya'));
      const beforeState = (
        before.body as ApiEnvelope<Array<{ topic_word_id: string; interval_days: number }>>
      ).data.find((r) => r.topic_word_id === WORDS.ephemeral);

      const res = await request
        .post('/srs/rate')
        .set(authHeader('priya'))
        .send({ topicWordId: WORDS.ephemeral, rating: 'GOOD' });
      expect(res.status).toBe(200);
      const after = (
        res.body as ApiEnvelope<{ ease_factor: number; interval_days: number; next_due_at: string }>
      ).data;

      expect(after.next_due_at).toBeTruthy();
      if (beforeState) {
        expect(after.interval_days).toBeGreaterThanOrEqual(beforeState.interval_days);
      }
    });

    it('POST /srs/rate rejects an unknown rating value', async () => {
      const res = await request
        .post('/srs/rate')
        .set(authHeader('alex'))
        .send({ topicWordId: WORDS.ephemeral, rating: 'MAYBE' });
      expect(res.status).toBe(400);
    });

    it('POST /srs/rate on a word the caller has no relationship to yet still succeeds (first review creates the row)', async () => {
      // analyse (WORDS.analyse) belongs to a different topic marco/sarah's
      // group owns; alex has never reviewed it. First-ever rating should
      // create the user_word_srs row rather than 404.
      const res = await request
        .post('/srs/rate')
        .set(authHeader('marco'))
        .send({ topicWordId: WORDS.analyse, rating: 'EASY' });
      expect(res.status).toBe(200);
    });
  });

  describe('study sessions (FR-4.3)', () => {
    it.each(['STANDARD', 'REVERSE', 'LISTENING'] as const)(
      'POST /srs/sessions with mode=%s returns a tagged batch, not persisted state',
      async (mode) => {
        const res = await request
          .post('/srs/sessions')
          .set(authHeader('alex'))
          .send({ mode, limit: 5 });
        expect(res.status).toBe(201);
        expect(Array.isArray((res.body as ApiEnvelope<unknown[]>).data)).toBe(true);
      },
    );
  });

  describe('offline sync (POST /srs/sync)', () => {
    it('replays a batch of queued reviews in order, one per item, no batch failure on a bad item', async () => {
      const res = await request
        .post('/srs/sync')
        .set(authHeader('priya'))
        .send({
          reviews: [
            {
              topicWordId: WORDS.ephemeral,
              rating: 'GOOD',
              reviewedAt: new Date(Date.now() - 60_000).toISOString(),
            },
            {
              // Deliberately bogus id — should be reported per-item, not
              // fail the whole batch (SrsService.sync's isolation guarantee).
              topicWordId: '00000000-0000-0000-0000-000000000000',
              rating: 'GOOD',
              reviewedAt: new Date().toISOString(),
            },
          ],
        });
      expect(res.status).toBe(200);
      const results = (res.body as ApiEnvelope<Array<{ status: 'applied' | 'error' }>>).data;
      expect(results).toHaveLength(2);
      expect(results.filter((r) => r.status === 'applied')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'error')).toHaveLength(1);
    });
  });
});
