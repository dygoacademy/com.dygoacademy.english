import { BadRequestException } from '@nestjs/common';

import { ParseLooseUuidPipe } from './parse-loose-uuid.pipe';

describe('ParseLooseUuidPipe', () => {
  const pipe = new ParseLooseUuidPipe();

  it('takes seeded ids that are not RFC version 1–8', () => {
    expect(pipe.transform('e9e9e9e9-0000-0000-0000-000000000021')).toBe(
      'e9e9e9e9-0000-0000-0000-000000000021',
    );
    expect(pipe.transform('C9C9C9C9-0000-0000-0000-000000000004')).toBe(
      'C9C9C9C9-0000-0000-0000-000000000004',
    );
  });

  it('takes random v4 ids', () => {
    expect(pipe.transform('3f2b8c1e-9d4a-4f6b-8a2c-1e5d7b9f0a3c')).toBe(
      '3f2b8c1e-9d4a-4f6b-8a2c-1e5d7b9f0a3c',
    );
  });

  it.each([
    '',
    'relative',
    'e9e9e9e9-0000-0000-0000-00000000002',
    'e9e9e9e9000000000000000000000021',
  ])('rejects %p', (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
