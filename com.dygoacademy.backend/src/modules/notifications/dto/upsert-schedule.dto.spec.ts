import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { UpsertScheduleDto } from './upsert-schedule.dto';

const errors = (reminderTime: string) =>
  validateSync(plainToInstance(UpsertScheduleDto, { reminderTime, timezone: 'Asia/Ho_Chi_Minh' }));

describe('UpsertScheduleDto', () => {
  it('accepts HH:MM and the HH:MM:SS the schedules list returns', () => {
    expect(errors('20:00')).toHaveLength(0);
    expect(errors('20:00:00')).toHaveLength(0);
  });

  it('rejects anything else', () => {
    expect(errors('24:00')).not.toHaveLength(0);
    expect(errors('8pm')).not.toHaveLength(0);
    expect(errors('20:00:60')).not.toHaveLength(0);
  });
});
