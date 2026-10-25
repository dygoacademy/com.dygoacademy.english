import { BadRequestException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { checkProps, EventsService } from './events.service';
import { CLIENT_EVENT_NAMES } from './events.types';

describe('EventsService', () => {
  it('writes the event to product_events as the learner (RLS: own rows only)', async () => {
    const queryAs = jest.fn().mockResolvedValue([]);
    const svc = new EventsService({ queryAs } as unknown as DatabaseService);
    await svc.record('u1', 'pron_scored', {
      word_id: 'w1',
      overall: 84,
      result: 'almost',
      weak_syllable: 'ti',
      attempt_no: 2,
    });
    expect(queryAs).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('insert into public.product_events'),
      [
        'pron_scored',
        JSON.stringify({
          word_id: 'w1',
          overall: 84,
          result: 'almost',
          weak_syllable: 'ti',
          attempt_no: 2,
        }),
      ],
    );
  });

  it('the seven pronunciation events, and nothing else, can be sent', () => {
    expect(CLIENT_EVENT_NAMES).toEqual([
      'pron_scored',
      'pron_not_heard',
      'pron_chip_played',
      'pron_word_played',
      'pron_say_again',
      'pron_skipped',
      'pron_word_blocked',
    ]);
  });

  it('refuses props not on the event’s list, objects and long text', () => {
    expect(() => checkProps('pron_skipped', { word_id: 'w', email: 'x@y' })).toThrow(
      BadRequestException,
    );
    expect(() => checkProps('pron_skipped', { word_id: { a: 1 } })).toThrow(BadRequestException);
    expect(() => checkProps('pron_skipped', { word_id: 'x'.repeat(81) })).toThrow(
      BadRequestException,
    );
    expect(checkProps('pron_say_again', { word_id: 'w', from_result: true })).toEqual({
      word_id: 'w',
      from_result: true,
    });
  });
});
