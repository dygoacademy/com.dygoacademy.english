import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { DatabaseService } from '../../database/database.service';
import { SrsService } from '../srs/srs.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

async function makeService(
  queryAsMock: jest.Mock,
  statsMock: jest.Mock = jest.fn(),
): Promise<ProfilesService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ProfilesService,
      { provide: DatabaseService, useValue: { queryAs: queryAsMock } },
      { provide: SrsService, useValue: { stats: statsMock } },
    ],
  }).compile();
  return moduleRef.get(ProfilesService);
}

const ROW = {
  id: 'user-42',
  ui_locale: 'vi-VN',
  meaning_locale: 'vi-VN',
  english_variety: 'en-US',
  daily_goal_minutes: 10,
};

describe('ProfilesService.updateMine', () => {
  it('updates only the caller’s row, through queryAs (RLS: profiles_update_self)', async () => {
    const queryAs = jest.fn().mockResolvedValue([ROW]);
    const service = await makeService(queryAs);

    await expect(
      service.updateMine('user-42', { uiLocale: 'vi-VN', meaningLocale: 'vi-VN' }),
    ).resolves.toEqual(ROW);

    const [userId, sql, params] = queryAs.mock.calls[0];
    expect(userId).toBe('user-42');
    expect(sql).toMatch(/update public\.profiles/);
    expect(sql).toMatch(/where id = \$1/);
    expect(sql).toMatch(/ui_locale = \$2, meaning_locale = \$3/);
    expect(params).toEqual(['user-42', 'vi-VN', 'vi-VN']);
  });

  it('leaves out fields that were not sent, and clears a field sent as null', async () => {
    const queryAs = jest.fn().mockResolvedValue([{ ...ROW, meaning_locale: null }]);
    const service = await makeService(queryAs);

    await service.updateMine('user-42', { meaningLocale: null });

    const [, sql, params] = queryAs.mock.calls[0];
    expect(sql).not.toMatch(/ui_locale =/);
    expect(sql).toMatch(/meaning_locale = \$2/);
    expect(params).toEqual(['user-42', null]);
  });

  it('rejects an empty update', async () => {
    const queryAs = jest.fn();
    const service = await makeService(queryAs);
    await expect(service.updateMine('user-42', {})).rejects.toBeInstanceOf(BadRequestException);
    expect(queryAs).not.toHaveBeenCalled();
  });

  it('is a 404 when RLS hides the row (no profile)', async () => {
    const service = await makeService(jest.fn().mockResolvedValue([]));
    await expect(service.updateMine('user-42', { uiLocale: 'en-US' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('ProfilesService.getMine (UI-6)', () => {
  it('reads the caller’s settings incl. english_variety and daily_goal_minutes', async () => {
    const queryAs = jest.fn().mockResolvedValue([ROW]);
    const service = await makeService(queryAs);
    await expect(service.getMine('user-42')).resolves.toEqual(ROW);
    const [userId, sql, params] = queryAs.mock.calls[0];
    expect(userId).toBe('user-42');
    expect(sql).toMatch(/english_variety, daily_goal_minutes from public\.profiles where id = \$1/);
    expect(params).toEqual(['user-42']);
  });

  it('is a 404 when RLS hides the row', async () => {
    const service = await makeService(jest.fn().mockResolvedValue([]));
    await expect(service.getMine('user-42')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProfilesService.updateMine prefs (UI-6)', () => {
  it('updates english_variety and daily_goal_minutes and returns them', async () => {
    const queryAs = jest
      .fn()
      .mockResolvedValue([{ ...ROW, english_variety: 'en-GB', daily_goal_minutes: 20 }]);
    const service = await makeService(queryAs);
    await service.updateMine('user-42', { englishVariety: 'en-GB', dailyGoalMinutes: 20 });
    const [, sql, params] = queryAs.mock.calls[0];
    expect(sql).toMatch(/english_variety = \$2, daily_goal_minutes = \$3/);
    expect(sql).not.toMatch(/ui_locale =/);
    expect(sql).toMatch(/returning id, ui_locale, meaning_locale, english_variety, daily_goal_minutes/);
    expect(params).toEqual(['user-42', 'en-GB', 20]);
  });
});

describe('ProfilesService.keepsakes (UI-6)', () => {
  const stats = (mastered: number, best: number) =>
    jest.fn().mockResolvedValue({ mastered_words: mastered, best_streak_days: best });

  it('awards what was reached (on conflict do nothing) and returns earned + next per kind', async () => {
    const earned = [{ kind: 'FIRST_HARVEST', value: 0, earned_at: '2026-10-01T00:00:00Z' }];
    const queryAs = jest
      .fn()
      .mockResolvedValueOnce([{ blooms: '12' }]) // golden blooms
      .mockResolvedValueOnce([]) // insert
      .mockResolvedValueOnce(earned); // select
    const statsMock = stats(3, 8);
    const service = await makeService(queryAs, statsMock);

    const result = await service.keepsakes('user-42', 'Asia/Ho_Chi_Minh');

    expect(statsMock).toHaveBeenCalledWith('user-42', 'Asia/Ho_Chi_Minh');
    expect(queryAs.mock.calls[0][1]).toMatch(/having count\(\*\) filter \(where completed_at is not null\) >= 3/);
    const [userId, insertSql, insertParams] = queryAs.mock.calls[1];
    expect(userId).toBe('user-42');
    expect(insertSql).toMatch(/on conflict \(user_id, kind, value\) do nothing/);
    expect(insertParams).toEqual([
      'user-42',
      ['FIRST_HARVEST', 'STREAK', 'GOLDEN_BLOOMS'],
      [0, 7, 10],
    ]);
    expect(result).toEqual({
      earned,
      golden_blooms: 12,
      next: [
        { kind: 'STREAK', value: 30, progress: 8, target: 30 },
        { kind: 'GOLDEN_BLOOMS', value: 50, progress: 12, target: 50 },
      ],
    });
  });

  it('inserts nothing for a brand-new learner; next = first of each kind', async () => {
    const queryAs = jest
      .fn()
      .mockResolvedValueOnce([{ blooms: '0' }])
      .mockResolvedValueOnce([]);
    const service = await makeService(queryAs, stats(0, 0));

    const result = await service.keepsakes('user-42');

    expect(queryAs).toHaveBeenCalledTimes(2); // blooms + select, no insert
    expect(queryAs.mock.calls[1][1]).toMatch(/from public\.user_keepsakes/);
    expect(result.next).toEqual([
      { kind: 'FIRST_HARVEST', value: 0, progress: 0, target: 1 },
      { kind: 'STREAK', value: 7, progress: 0, target: 7 },
      { kind: 'GOLDEN_BLOOMS', value: 10, progress: 0, target: 10 },
    ]);
  });

  it('has no next for a kind once its last threshold is reached', async () => {
    const queryAs = jest
      .fn()
      .mockResolvedValueOnce([{ blooms: '50' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const service = await makeService(queryAs, stats(1, 100));
    const result = await service.keepsakes('user-42');
    expect(queryAs.mock.calls[1][2][2]).toEqual([0, 7, 30, 100, 10, 50]);
    expect(result.next).toEqual([]);
  });
});

describe('UpdateProfileDto', () => {
  const errorsFor = async (body: object) =>
    (await validate(plainToInstance(UpdateProfileDto, body))).map((e) => e.property);

  it('accepts the three app locales and the two meaning locales', async () => {
    for (const uiLocale of ['en-US', 'vi-VN', 'zh-CN']) {
      expect(await errorsFor({ uiLocale })).toEqual([]);
    }
    for (const meaningLocale of ['vi-VN', 'zh-CN']) {
      expect(await errorsFor({ meaningLocale })).toEqual([]);
    }
  });

  it('accepts null (clear) and missing fields', async () => {
    expect(await errorsFor({ uiLocale: null, meaningLocale: null })).toEqual([]);
    expect(await errorsFor({})).toEqual([]);
  });

  it('rejects other codes, including the old short ones', async () => {
    expect(await errorsFor({ uiLocale: 'fr' })).toEqual(['uiLocale']);
    expect(await errorsFor({ uiLocale: 'en' })).toEqual(['uiLocale']);
    expect(await errorsFor({ uiLocale: 'vi' })).toEqual(['uiLocale']);
    expect(await errorsFor({ meaningLocale: 'vi' })).toEqual(['meaningLocale']);
    expect(await errorsFor({ uiLocale: 'zh' })).toEqual(['uiLocale']);
    expect(await errorsFor({ meaningLocale: 'en-US' })).toEqual(['meaningLocale']); // an app locale, not a meaning one
  });

  it('validates englishVariety and dailyGoalMinutes (UI-6)', async () => {
    expect(await errorsFor({ englishVariety: 'en-GB', dailyGoalMinutes: 1 })).toEqual([]);
    expect(await errorsFor({ englishVariety: 'en-US', dailyGoalMinutes: 120 })).toEqual([]);
    expect(await errorsFor({ englishVariety: 'en-AU' })).toEqual(['englishVariety']);
    expect(await errorsFor({ englishVariety: null })).toEqual(['englishVariety']);
    expect(await errorsFor({ dailyGoalMinutes: 0 })).toEqual(['dailyGoalMinutes']);
    expect(await errorsFor({ dailyGoalMinutes: 121 })).toEqual(['dailyGoalMinutes']);
    expect(await errorsFor({ dailyGoalMinutes: 7.5 })).toEqual(['dailyGoalMinutes']);
    expect(await errorsFor({ dailyGoalMinutes: null })).toEqual(['dailyGoalMinutes']);
  });
});
