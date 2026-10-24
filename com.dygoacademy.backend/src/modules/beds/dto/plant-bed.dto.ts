import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

import { SEEDS_HARVEST } from '../seeds-harvest.config';

/** Body for `POST /api/v1/beds`: S3 "Plant <bed>". */
export class PlantBedDto {
  @ApiProperty({
    description: 'The bed (topic) to make the active bed. Must be readable by the caller.',
  })
  @IsUUID('loose')
  topic_id!: string;

  @ApiPropertyOptional({
    enum: SEEDS_HARVEST.packetKinds,
    description: 'The packet slot picked (analytics `packet_chosen`).',
  })
  @IsOptional()
  @IsIn(SEEDS_HARVEST.packetKinds)
  slot?: (typeof SEEDS_HARVEST.packetKinds)[number];
}
