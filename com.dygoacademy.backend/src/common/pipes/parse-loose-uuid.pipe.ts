import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const LOOSE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Like ParseUUIDPipe, but takes any 8-4-4-4-12 hex id that Postgres `uuid` takes
 * (the same as `@IsUUID('loose')` in the DTOs). Since Nest 11, ParseUUIDPipe only
 * takes RFC versions 1–8, so seeded ids such as `e9e9e9e9-0000-0000-0000-…` got a 400.
 */
@Injectable()
export class ParseLooseUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !LOOSE_UUID.test(value)) {
      throw new BadRequestException('Validation failed (uuid is expected)');
    }
    return value;
  }
}
