import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

/** Body for `DELETE /api/v1/notifications/subscribe` — one browser opting out. */
export class UnsubscribePushDto {
  @ApiProperty()
  @IsUrl({ require_tld: false })
  endpoint!: string;
}
