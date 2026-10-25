import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject } from 'class-validator';

import { CLIENT_EVENT_NAMES, type ClientEventName, type EventPropValue } from '../events.types';

/** `POST /events`: one analytics event. The props are checked against the event's own list in EventsService. */
export class CreateEventDto {
  @ApiProperty({ enum: CLIENT_EVENT_NAMES })
  @IsIn(CLIENT_EVENT_NAMES)
  name!: ClientEventName;

  @ApiProperty({
    description:
      "The event's props (snake_case keys, its own list only): short text, numbers, true/false or null.",
    example: { word_id: '00000000-0000-0000-0000-000000000000', overall: 84, result: 'almost' },
  })
  @IsObject()
  props!: Record<string, EventPropValue>;
}
