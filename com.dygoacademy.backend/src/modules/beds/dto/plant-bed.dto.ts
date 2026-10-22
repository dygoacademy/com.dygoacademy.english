import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Body for `POST /api/v1/beds`: S3 "Plant <bed>". */
export class PlantBedDto {
  @ApiProperty({
    description: 'The bed (topic) to make the active bed. Must be readable by the caller.',
  })
  @IsUUID('loose')
  topic_id!: string;
}
