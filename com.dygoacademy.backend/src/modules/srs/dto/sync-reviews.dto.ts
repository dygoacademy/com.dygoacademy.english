import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

const RATINGS = ['AGAIN', 'HARD', 'GOOD', 'EASY'] as const;
export type RatingValue = (typeof RATINGS)[number];

/**
 * One offline-queued review. `reviewedAt` is the client's own clock at the
 * moment of review — architecture doc §1 calls this "offline review logs
 * replayed on reconnect," which only means something if the original
 * timestamp survives the round trip.
 */
export class SyncReviewItemDto {
  @ApiProperty()
  @IsUUID('loose')
  topicWordId!: string;

  @ApiProperty({ enum: RATINGS })
  @IsIn(RATINGS)
  rating!: RatingValue;

  @ApiProperty({ description: "Client's local timestamp when the review happened." })
  @IsDateString()
  reviewedAt!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  responseMs?: number;
}

/** Body for `POST /api/v1/srs/sync` — replaying an offline review queue. */
export class SyncReviewsDto {
  @ApiProperty({ type: [SyncReviewItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SyncReviewItemDto)
  reviews!: SyncReviewItemDto[];
}
