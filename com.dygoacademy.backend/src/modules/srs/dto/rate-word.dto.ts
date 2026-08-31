import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

const RATINGS = ['AGAIN', 'HARD', 'GOOD', 'EASY'] as const;
export type RatingValue = (typeof RATINGS)[number];

/** Body for `POST /api/v1/srs/rate` — FR-3.2's four standardized actions. */
export class RateWordDto {
  @ApiProperty({ description: 'The topic_words row being reviewed.' })
  @IsUUID()
  topicWordId!: string;

  @ApiProperty({ enum: RATINGS, description: 'One of the four FR-3.2 rating actions.' })
  @IsIn(RATINGS)
  rating!: RatingValue;

  @ApiPropertyOptional({ description: 'Client-measured response time, for analytics only.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  responseMs?: number;
}
