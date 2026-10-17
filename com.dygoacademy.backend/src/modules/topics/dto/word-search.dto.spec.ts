import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { WordSearchDto } from './word-search.dto';

async function errors(q: unknown) {
  return validate(plainToInstance(WordSearchDto, { q }));
}

describe('WordSearchDto', () => {
  it('accepts 2–40 characters after trimming', async () => {
    expect(await errors('en')).toHaveLength(0);
    expect(await errors('  envi  ')).toHaveLength(0);
    expect(await errors('a'.repeat(40))).toHaveLength(0);
  });

  it('rejects a query too short or too long (400)', async () => {
    expect(await errors('e')).not.toHaveLength(0);
    expect(await errors(' e ')).not.toHaveLength(0);
    expect(await errors('a'.repeat(41))).not.toHaveLength(0);
    expect(await errors(undefined)).not.toHaveLength(0);
  });
});
