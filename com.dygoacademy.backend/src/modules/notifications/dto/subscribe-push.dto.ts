import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';

/**
 * The `keys` sub-object of a browser `PushSubscriptionJSON` — shape fixed by
 * the Push API spec (`p256dh` and `auth`, both base64url strings), not
 * something Dygo controls, so field names stay as the spec has them rather
 * than the codebase's usual camelCase-everything rule.
 */
export class PushSubscriptionKeysDto {
  @ApiProperty()
  @IsString()
  p256dh!: string;

  @ApiProperty()
  @IsString()
  auth!: string;
}

/**
 * Body for `POST /api/v1/notifications/subscribe` (FR-6.5). Mirrors
 * `PushSubscription.toJSON()` from the browser's Push API directly — the
 * frontend hands this object to the API unchanged after
 * `registration.pushManager.subscribe(...)`, so there is no client-side
 * reshaping to keep in sync with the backend.
 */
export class SubscribePushDto {
  @ApiProperty({ description: "The browser's push service endpoint URL." })
  @IsUrl({ require_tld: false })
  endpoint!: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;

  @ApiProperty({
    required: false,
    description: 'For debugging which device/browser a subscription belongs to.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}
