import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { DatabaseService } from '../../database/database.service';
import { SrsService } from '../srs/srs.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { FIRST_BED_TITLES, ProfilesService } from './profiles.service';

const ROW = {
  onboarded_at: null,
  cefr_level: 'B1',
  study_goal: 'IELTS',
  target_band: 7,
  first_topic_id: null,
};

const TOPIC_ID = 'cccccccc-0000-0000-0000-000000000002';

/**
 * A fake withUser: runs `work` with a client whose `query` answers from
 * `answers` in order (topic lookup first when first_topic_id is sent).
 */
function fakeDb(answers: { rows: unknown[]; rowCount?: number }[]) {
  const query = jest.fn();
  for (const answer of answers) {
    query.mockResolvedValueOnce({ rowCount: answer.rows.length, ...answer });
  }
  const withUser = jest.fn((_userId: string, work: (client: unknown) => Promise<unknown>) =>
    work({ query }),
  );
  const queryAs = jest.fn();
  return { query, withUser, queryAs };
}

async function makeService(db: Partial<Record<'withUser' | 'queryAs', jest.Mock>>) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ProfilesService,
      { provide: DatabaseService, useValue: db },
      { provide: SrsService, useValue: { stats: jest.fn() } },
    ],
  }).compile();
  return moduleRef.get(ProfilesService);
}

describe('ProfilesService.getOnboarding (OB1–OB5)', () => {
  it('reads the caller’s own row through queryAs', async () => {
    const queryAs = jest.fn().mockResolvedValue([ROW]);
    const service = await makeService({ queryAs });
    await expect(service.getOnboarding('user-42')).resolves.toEqual(ROW);
    const [userId, sql, params] = queryAs.mock.calls[0];
    expect(userId).toBe('user-42');
    expect(sql).toMatch(/onboarded_at, cefr_level::text as cefr_level, study_goal/);
    expect(sql).toMatch(/target_band::float8 as target_band/);
    expect(params).toEqual(['user-42']);
  });

  it('is a 404 when RLS hides the row', async () => {
    const service = await makeService({ queryAs: jest.fn().mockResolvedValue([]) });
    await expect(service.getOnboarding('user-42')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProfilesService.updateOnboarding (OB1–OB5)', () => {
  it('saves one step’s choice under the caller’s JWT (withUser)', async () => {
    const db = fakeDb([{ rows: [ROW] }]);
    const service = await makeService(db);
    await expect(service.updateOnboarding('user-42', { cefr_level: 'B1' })).resolves.toEqual(ROW);
    expect(db.withUser.mock.calls[0][0]).toBe('user-42');
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/update public\.profiles\s+set cefr_level = \$2,/);
    expect(sql).toMatch(/where id = \$1/);
    expect(params).toEqual(['user-42', 'B1']);
  });

  it('saves the goal with its band, and goals without one clear the band', async () => {
    const withBed = { ...ROW, first_topic_id: TOPIC_ID };
    const db = fakeDb([
      { rows: [withBed] },
      { rows: [withBed] },
      { rows: [withBed] },
      { rows: [withBed] },
    ]);
    const service = await makeService(db);
    await service.updateOnboarding('user-42', { study_goal: 'IELTS', target_band: 6.5 });
    expect(db.query.mock.calls[0][0]).toMatch(/study_goal = \$2, target_band = \$3/);
    expect(db.query.mock.calls[0][1]).toEqual(['user-42', 'IELTS', 6.5]);
    await service.updateOnboarding('user-42', { study_goal: 'IELTS_GENERAL', target_band: 6 });
    expect(db.query.mock.calls[1][1]).toEqual(['user-42', 'IELTS_GENERAL', 6]);
    await service.updateOnboarding('user-42', { study_goal: 'LIFE' });
    expect(db.query.mock.calls[2][1]).toEqual(['user-42', 'LIFE', null]);
    await service.updateOnboarding('user-42', { study_goal: 'WORK', target_band: null });
    expect(db.query.mock.calls[3][1]).toEqual(['user-42', 'WORK', null]);
    // A first bed is already set: nothing is picked.
    expect(db.query).toHaveBeenCalledTimes(4);
  });

  it('saves level, goal and band in one PATCH and picks the first bed from the goal', async () => {
    const picked = { ...ROW, study_goal: 'TRAVEL', target_band: null, first_topic_id: TOPIC_ID };
    const db = fakeDb([
      { rows: [{ ...ROW, study_goal: 'TRAVEL', target_band: null }] },
      { rows: [picked] },
    ]);
    const service = await makeService(db);
    await expect(
      service.updateOnboarding('user-42', {
        cefr_level: 'B2',
        study_goal: 'TRAVEL',
        target_band: null,
      }),
    ).resolves.toEqual(picked);
    expect(db.query.mock.calls[0][0]).toMatch(
      /set cefr_level = \$2, study_goal = \$3, target_band = \$4,/,
    );
    expect(db.query.mock.calls[0][1]).toEqual(['user-42', 'B2', 'TRAVEL', null]);
    const [sql, params] = db.query.mock.calls[1];
    expect(sql).toMatch(/where p\.id = \$1 and p\.first_topic_id is null/);
    expect(sql).toMatch(/where t\.is_public/);
    expect(params).toEqual(['user-42', FIRST_BED_TITLES.TRAVEL]);
  });

  it.each([
    ['IELTS', 'foundation vocabulary'],
    ['IELTS_GENERAL', 'housing and neighbourhood'],
    ['WORK', 'job hunting'],
    ['TRAVEL', 'at the airport'],
    ['LIFE', 'home and family'],
  ] as const)('the first bed for %s is a %s topic', (goal, word) => {
    expect(FIRST_BED_TITLES[goal]).toContain(word);
  });

  it('keeps the current row when no library topic can be picked', async () => {
    const db = fakeDb([{ rows: [ROW] }, { rows: [] }]);
    const service = await makeService(db);
    await expect(service.updateOnboarding('user-42', { study_goal: 'LIFE' })).resolves.toEqual({
      ...ROW,
    });
  });

  it('does not pick a bed when one is sent with the goal', async () => {
    const db = fakeDb([
      { rows: [{ id: TOPIC_ID }] },
      { rows: [{ ...ROW, first_topic_id: TOPIC_ID }] },
    ]);
    const service = await makeService(db);
    await service.updateOnboarding('user-42', { study_goal: 'WORK', first_topic_id: TOPIC_ID });
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it('saves the browser time zone only while the profile has none', async () => {
    const db = fakeDb([{ rows: [ROW] }]);
    const service = await makeService(db);
    await service.updateOnboarding('user-42', { cefr_level: 'B1', timezone: 'Asia/Ho_Chi_Minh' });
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(
      /timezone = case when timezone is null or timezone = 'UTC' then \$3 else timezone end/,
    );
    expect(params).toEqual(['user-42', 'B1', 'Asia/Ho_Chi_Minh']);
  });

  it('rejects an unknown time zone', async () => {
    const db = fakeDb([]);
    const service = await makeService(db);
    await expect(
      service.updateOnboarding('user-42', { timezone: 'Mars/Olympus' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.withUser).not.toHaveBeenCalled();
  });

  it.each([
    [{ study_goal: 'IELTS' as const, target_band: 9.5 }],
    [{ study_goal: 'IELTS' as const, target_band: 6.3 }],
    [{ study_goal: 'PTE' as const, target_band: 65.5 }],
    [{ study_goal: 'PTE' as const, target_band: 20 }],
    [{ study_goal: 'LIFE' as const, target_band: 7 }],
    [{ study_goal: 'WORK' as const, target_band: 7 }],
    [{ study_goal: 'IELTS_GENERAL' as const, target_band: 9.5 }],
    [{ target_band: 7 }],
  ])('rejects a band that does not fit its goal: %j', async (body) => {
    const db = fakeDb([]);
    const service = await makeService(db);
    await expect(service.updateOnboarding('user-42', body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.withUser).not.toHaveBeenCalled();
  });

  it('checks the first topic is visible to the caller before saving it', async () => {
    const db = fakeDb([
      { rows: [{ id: TOPIC_ID }] },
      { rows: [{ ...ROW, first_topic_id: TOPIC_ID }] },
    ]);
    const service = await makeService(db);
    await service.updateOnboarding('user-42', { first_topic_id: TOPIC_ID });
    expect(db.query.mock.calls[0]).toEqual([
      'select id from public.topics where id = $1',
      [TOPIC_ID],
    ]);
    expect(db.query.mock.calls[1][1]).toEqual(['user-42', TOPIC_ID]);
  });

  it('is a 404 for a topic RLS hides (and saves nothing)', async () => {
    const db = fakeDb([{ rows: [] }]);
    const service = await makeService(db);
    await expect(
      service.updateOnboarding('user-42', { first_topic_id: TOPIC_ID }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('clears the first topic with null, without a lookup', async () => {
    const db = fakeDb([{ rows: [ROW] }]);
    const service = await makeService(db);
    await service.updateOnboarding('user-42', { first_topic_id: null });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual(['user-42', null]);
  });

  it('complete sets onboarded_at only the first time', async () => {
    const db = fakeDb([{ rows: [{ ...ROW, onboarded_at: '2026-10-08T08:00:00Z' }] }]);
    const service = await makeService(db);
    await service.updateOnboarding('user-42', { complete: true });
    expect(db.query.mock.calls[0][0]).toMatch(/onboarded_at = coalesce\(onboarded_at, now\(\)\)/);
    expect(db.query.mock.calls[0][1]).toEqual(['user-42']);
  });

  it('rejects an empty update (complete: false counts as nothing)', async () => {
    const db = fakeDb([]);
    const service = await makeService(db);
    await expect(service.updateOnboarding('user-42', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.updateOnboarding('user-42', { complete: false })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.withUser).not.toHaveBeenCalled();
  });

  it('is a 404 when RLS hides the profile', async () => {
    const db = fakeDb([{ rows: [] }]);
    const service = await makeService(db);
    await expect(service.updateOnboarding('user-42', { cefr_level: 'C1' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('UpdateOnboardingDto', () => {
  const errors = async (body: object) =>
    (await validate(plainToInstance(UpdateOnboardingDto, body))).map((e) => e.property);

  it('accepts a full, valid body', async () => {
    await expect(
      errors({
        cefr_level: 'B2',
        study_goal: 'PTE',
        target_band: 65,
        first_topic_id: TOPIC_ID,
        complete: true,
      }),
    ).resolves.toEqual([]);
  });

  it('accepts the new goals and a time zone', async () => {
    for (const study_goal of ['IELTS_GENERAL', 'WORK', 'TRAVEL', 'LIFE', 'IELTS', 'PTE']) {
      await expect(errors({ study_goal, timezone: 'Asia/Ho_Chi_Minh' })).resolves.toEqual([]);
    }
  });

  it('accepts null for target_band and first_topic_id', async () => {
    await expect(
      errors({ study_goal: 'IELTS', target_band: null, first_topic_id: null }),
    ).resolves.toEqual([]);
  });

  it('rejects unknown levels, goals and malformed values', async () => {
    await expect(errors({ cefr_level: 'A1' })).resolves.toEqual(['cefr_level']);
    await expect(errors({ cefr_level: null })).resolves.toEqual(['cefr_level']);
    await expect(errors({ study_goal: 'TOEFL' })).resolves.toEqual(['study_goal']);
    await expect(errors({ timezone: 7 })).resolves.toEqual(['timezone']);
    await expect(errors({ target_band: '7' })).resolves.toEqual(['target_band']);
    await expect(errors({ first_topic_id: 'not-a-uuid' })).resolves.toEqual(['first_topic_id']);
    await expect(errors({ complete: 'yes' })).resolves.toEqual(['complete']);
  });
});
