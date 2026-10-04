import { ConfigService } from '@nestjs/config';

import { DatabaseService } from '../database/database.service';
import { UsageCapExceededError, UsageCapService } from './usage-cap.service';

function make(rows: Array<{ units: string; day: string }>, limits: Record<string, number> = {}) {
  const queryAsService = jest.fn().mockResolvedValue(rows);
  const config = { get: (key: string) => limits[key] } as unknown as ConfigService;
  const service = new UsageCapService({ queryAsService } as unknown as DatabaseService, config);
  return { service, queryAsService };
}

describe('UsageCapService (S13 daily caps)', () => {
  it("adds the units to today's row, capped at the limit, in one statement", async () => {
    const { service, queryAsService } = make([{ units: '12', day: '2026-10-05' }], {
      'usage.geminiDailyCalls': 1000,
    });
    await expect(service.take('gemini')).resolves.toBeUndefined();
    const [sql, params] = queryAsService.mock.calls[0];
    expect(sql).toMatch(/insert into public\.api_usage_daily/);
    expect(sql).toMatch(/on conflict \(provider, day\) do update/);
    expect(sql).toMatch(/units \+ excluded\.units <= \$3/);
    expect(params).toEqual(['gemini', 1, 1000]);
  });

  it('throws UsageCapExceededError (no paid call) when the row would pass the limit', async () => {
    const { service } = make([], { 'usage.googleTtsDailyChars': 300000 });
    const err = await service.take('google_tts', 500).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UsageCapExceededError);
    expect(err).toMatchObject({ provider: 'google_tts', limit: 300000 });
  });

  it('defaults: 1000 Gemini calls and 300000 TTS characters a day', () => {
    const { service } = make([]);
    expect(service.limitFor('gemini')).toBe(1000);
    expect(service.limitFor('google_tts')).toBe(300000);
  });

  it('warns once a day at 80 %', async () => {
    const { service } = make([{ units: '800', day: '2026-10-05' }], {
      'usage.geminiDailyCalls': 1000,
    });
    const warn = jest.spyOn(
      (service as unknown as { logger: { warn: () => void } }).logger,
      'warn',
    );
    await service.take('gemini');
    await service.take('gemini');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
