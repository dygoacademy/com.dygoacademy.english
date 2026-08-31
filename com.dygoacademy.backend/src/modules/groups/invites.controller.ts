import { Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GroupsService, RedeemedInvite } from './groups.service';

/**
 * Split from GroupsController because these two routes are not nested under
 * `/groups/:id` — dygo_academy_api_surface.md §4 names them `DELETE
 * /invites/:id` and `POST /invites/:token/redeem` at the top level. Revoking
 * needs the invite's own id, not its group's; redeeming needs only the
 * token, since the whole point (see GroupsService.redeemInvite) is that the
 * caller does not yet know — or have access to — the group it belongs to.
 */
@ApiBearerAuth()
@ApiTags('invites')
@Controller({ path: 'invites', version: '1' })
export class InvitesController {
  constructor(private readonly groupsService: GroupsService) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke an invite link',
    description:
      'ADMIN only (group_invites_update_admin). Soft-revoke: sets revoked_at ' +
      'rather than deleting the row, so redemption history survives.',
  })
  async revoke(@CurrentUser('id') userId: string, @Param('id') inviteId: string): Promise<void> {
    await this.groupsService.revokeInvite(userId, inviteId);
  }

  @Post(':token/redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Join a group via a magic link',
    description:
      'Any authenticated user. Runs through public.redeem_group_invite, a ' +
      'SECURITY DEFINER function — the joiner is not yet a member, so RLS ' +
      'cannot show them the group or let them write their own group_members row.',
  })
  async redeem(
    @CurrentUser('id') userId: string,
    @Param('token') token: string,
  ): Promise<RedeemedInvite> {
    return this.groupsService.redeemInvite(userId, token);
  }
}
