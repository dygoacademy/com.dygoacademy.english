import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

/**
 * Query for `GET /api/v1/words/lookup` (A7b Add word, 2026-10-17).
 * Trimmed first, then the same 1–100 characters as CreateWordDto.
 */
export class WordLookupDto {
  @ApiProperty({ description: 'The word the learner is typing.', example: 'resilient' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 100)
  word!: string;
}
