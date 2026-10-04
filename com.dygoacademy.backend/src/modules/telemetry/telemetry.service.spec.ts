import { DatabaseService } from '../../database/database.service';
import { headerValue, TelemetryService } from './telemetry.service';

describe('TelemetryService.recordMedia', () => {
  it('inserts every event as the learner in one statement, without RETURNING', async () => {
    const queryAs = jest.fn().mockResolvedValue([]);
    const service = new TelemetryService({ queryAs } as unknown as DatabaseService);

    const result = await service.recordMedia(
      'user-1',
      [
        {
          kind: 'word',
          host: 'Media.DygoAcademy.com',
          outcome: 'played',
          ms: 180,
          from_cache: false,
          effective_type: '4g',
        },
        {
          kind: 'speaking',
          host: 'media.dygoacademy.com',
          outcome: 'error',
          ms: 3000,
          from_cache: true,
        },
      ],
      { country: 'VN', city: 'Hanoi' },
    );

    expect(result).toEqual({ recorded: 2 });
    const [userId, sql, params] = queryAs.mock.calls[0] as [string, string, unknown[]];
    expect(userId).toBe('user-1');
    expect(sql).not.toMatch(/returning|user_id/i);
    expect(sql).toMatch(/\(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8\), \(\$9,/);
    expect(params).toEqual([
      'word',
      'media.dygoacademy.com',
      'played',
      180,
      false,
      '4g',
      'VN',
      'Hanoi',
      'speaking',
      'media.dygoacademy.com',
      'error',
      3000,
      true,
      null,
      'VN',
      'Hanoi',
    ]);
  });
});

describe('headerValue', () => {
  it('trims, decodes, caps the length, and maps empty to null', () => {
    expect(headerValue(' VN ', 8)).toBe('VN');
    expect(headerValue('Ho%20Chi%20Minh%20City', 80)).toBe('Ho Chi Minh City');
    expect(headerValue('%E0%A4%A', 80)).toBe('%E0%A4%A'); // bad encoding kept as is
    expect(headerValue('x'.repeat(100), 80)).toHaveLength(80);
    expect(headerValue('', 8)).toBeNull();
    expect(headerValue(undefined, 8)).toBeNull();
    expect(headerValue(['SG', 'VN'], 8)).toBe('SG');
  });
});
