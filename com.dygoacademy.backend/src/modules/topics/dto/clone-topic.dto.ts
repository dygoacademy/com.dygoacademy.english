import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Body for `POST /api/v1/topics/:id/clone` — FR-1.1: "public topics are searchable, cloneable". */
export class CloneTopicDto {
  @ApiProperty({
    description: 'The group the cloned copy is created in. Caller needs WRITE there.',
  })
  @IsUUID('loose')
  targetGroupId!: string;
}
