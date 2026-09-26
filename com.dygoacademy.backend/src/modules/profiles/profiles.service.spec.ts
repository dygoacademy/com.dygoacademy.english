import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { DatabaseService } from '../../database/database.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

async function makeService(queryAsMock: jest.Mock): Promise<ProfilesService> {
  const moduleRef = await Test.createTestingModule({
    providers: [ProfilesService, { provide: DatabaseService, useValue: { queryAs: queryAsMock } }],
  }).compile();
  return moduleRef.get(ProfilesService);
}

const ROW = { id: 'user-42', ui_locale: 'vi', meaning_locale: 'vi' };

describe('ProfilesService.updateMine', () => {
  it('updates only the caller’s row, through queryAs (RLS: profiles_update_self)', async () => {
    const queryAs = jest.fn().mockResolvedValue([ROW]);
    const service = await makeService(queryAs);

    await expect(
      service.updateMine('user-42', { uiLocale: 'vi', meaningLocale: 'vi' }),
    ).resolves.toEqual(ROW);

    const [userId, sql, params] = queryAs.mock.calls[0];
    expect(userId).toBe('user-42');
    expect(sql).toMatch(/update public\.profiles/);
    expect(sql).toMatch(/where id = \$1/);
    expect(sql).toMatch(/ui_locale = \$2, meaning_locale = \$3/);
    expect(params).toEqual(['user-42', 'vi', 'vi']);
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
    await expect(service.updateMine('user-42', { uiLocale: 'en' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('UpdateProfileDto', () => {
  const errorsFor = async (body: object) =>
    (await validate(plainToInstance(UpdateProfileDto, body))).map((e) => e.property);

  it('accepts the three app languages and the two meaning languages', async () => {
    for (const uiLocale of ['en', 'zh-CN', 'vi']) {
      expect(await errorsFor({ uiLocale })).toEqual([]);
    }
    for (const meaningLocale of ['zh-CN', 'vi']) {
      expect(await errorsFor({ meaningLocale })).toEqual([]);
    }
  });

  it('accepts null (clear) and missing fields', async () => {
    expect(await errorsFor({ uiLocale: null, meaningLocale: null })).toEqual([]);
    expect(await errorsFor({})).toEqual([]);
  });

  it('rejects other codes', async () => {
    expect(await errorsFor({ uiLocale: 'fr' })).toEqual(['uiLocale']);
    expect(await errorsFor({ uiLocale: 'zh' })).toEqual(['uiLocale']);
    expect(await errorsFor({ meaningLocale: 'en' })).toEqual(['meaningLocale']);
  });
});
