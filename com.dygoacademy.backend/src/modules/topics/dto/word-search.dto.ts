import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

/**
 * Query for `GET /api/v1/topics/word-search` (A6b "Looking for a word?",
 * 2026-10-17). Trimmed first, then 2–40 characters; the frontend never
 * sends fewer than 2.
 */
export class WordSearchDto {
  @ApiProperty({ description: 'What the learner typed.', example: 'envi' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 40)
  q!: string;
}
