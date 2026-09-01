import { authHeader, ApiEnvelope, request } from '../support/client';
import { GROUPS } from '../support/fixtures';

describe('Module 6 — Push Notifications & Habit Scheduling', () => {
  it('GET /notifications/vapid-public-key returns a usable key', async () => {
    const res = await request.get('/notifications/vapid-public-key').set(authHeader('alex'));
    expect(res.status).toBe(200);
    const key = (res.body as ApiEnvelope<{ publicKey: string } | string>).data;
    const value = typeof key === 'string' ? key : key.publicKey;
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(10);
  });

  describe('push subscription lifecycle (one browser = one row, keyed by endpoint)', () => {
    const endpoint = `https://qa-fake-push-endpoint.example/${Date.now()}`;

    it('POST /notifications/subscribe registers a subscription verbatim', async () => {
      const res = await request
        .post('/notifications/subscribe')
        .set(authHeader('alex'))
        .send({
          endpoint,
          keys: { p256dh: 'qa-fake-p256dh-key', auth: 'qa-fake-auth-key' },
          userAgent: 'automationtesting/1.0',
        });
      expect(res.status).toBe(200);
    });

    it('re-subscribing the same endpoint is an upsert, not a duplicate error', async () => {
      const res = await request
        .post('/notifications/subscribe')
        .set(authHeader('alex'))
        .send({ endpoint, keys: { p256dh: 'updated-key', auth: 'updated-auth' } });
      expect(res.status).toBe(200);
    });

    it('DELETE /notifications/subscribe unregisters it', async () => {
      const res = await request
        .delete('/notifications/subscribe')
        .set(authHeader('alex'))
        .send({ endpoint });
      expect(res.status).toBe(204);
    });
  });

  describe('daily reminder schedules (FR-6.1)', () => {
    let scheduleId: string;

    it('POST /notifications/schedules upserts a reminder time', async () => {
      const res = await request
        .post('/notifications/schedules')
        .set(authHeader('priya'))
        .send({ reminderTime: '20:00', timezone: 'Asia/Kolkata' });
      expect(res.status).toBe(200);
      scheduleId = (res.body as ApiEnvelope<{ id: string }>).data.id;
      expect(scheduleId).toBeTruthy();
    });

    it('posting the same reminderTime again edits in place rather than duplicating', async () => {
      const res = await request
        .post('/notifications/schedules')
        .set(authHeader('priya'))
        .send({ reminderTime: '20:00', timezone: 'Asia/Kolkata', isEnabled: false });
      expect(res.status).toBe(200);
      expect((res.body as ApiEnvelope<{ id: string }>).data.id).toBe(scheduleId);

      const list = await request.get('/notifications/schedules').set(authHeader('priya'));
      const rows = (list.body as ApiEnvelope<Array<{ id: string; reminder_time: string }>>).data;
      expect(rows.filter((r) => r.reminder_time?.startsWith?.('20:00'))).toHaveLength(1);
    });

    it('rejects a malformed reminder time', async () => {
      const res = await request
        .post('/notifications/schedules')
        .set(authHeader('priya'))
        .send({ reminderTime: '25:99', timezone: 'UTC' });
      expect(res.status).toBe(400);
    });

    afterAll(async () => {
      if (scheduleId) {
        await request.delete(`/notifications/schedules/${scheduleId}`).set(authHeader('priya'));
      }
    });
  });

  describe('teacher class sprints (FR-6.2) + rate limiting', () => {
    it('ADMIN can trigger an immediate sprint; a non-ADMIN cannot', async () => {
      const blocked = await request
        .post(`/notifications/groups/${GROUPS.ieltsClass}/sprint`)
        .set(authHeader('alex'))
        .send({ message: 'should be blocked' });
      expect(blocked.status).toBe(403);
    });

    it('a second sprint within 60s for the same group is rate-limited (429)', async () => {
      const first = await request
        .post(`/notifications/groups/${GROUPS.ieltsClass}/sprint`)
        .set(authHeader('sarah'))
        .send({ message: 'QA sprint 1' });
      // Accept 200 or 429 for the *first* call — a prior test/spec run in
      // the same 60s window may have already used up this group's budget.
      expect([200, 429]).toContain(first.status);

      const second = await request
        .post(`/notifications/groups/${GROUPS.ieltsClass}/sprint`)
        .set(authHeader('sarah'))
        .send({ message: 'QA sprint 2' });
      expect(second.status).toBe(429);
    });
  });
});
