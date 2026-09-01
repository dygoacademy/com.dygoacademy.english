import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import {
  CreatedInvite,
  GroupInviteSummary,
  GroupMember,
  GroupRow,
  GroupsService,
  GroupSummary,
} from './groups.service';

@ApiBearerAuth()
@ApiTags('groups')
@Controller({ path: 'groups', version: '1' })
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({
    summary: 'List groups the caller belongs to',
    description: 'Every group where the caller has a group_members row, with their role in it.',
  })
  async findMine(@CurrentUser('id') userId: string): Promise<GroupSummary[]> {
    return this.groupsService.findMine(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a class or workspace',
    description:
      'The caller becomes owner and is seated as ADMIN automatically ' +
      '(trg_group_owner_membership). Requires the caller to already belong to a tenant.',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateGroupDto,
  ): Promise<GroupSummary> {
    return this.groupsService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rename, re-describe, or toggle visibility',
    description: 'ADMIN only (groups_update_admin). Omitted fields are left unchanged.',
  })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') groupId: string,
    @Body() dto: UpdateGroupDto,
  ): Promise<GroupRow> {
    return this.groupsService.update(userId, groupId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a group', description: 'ADMIN only (groups_delete_admin).' })
  async remove(@CurrentUser('id') userId: string, @Param('id') groupId: string): Promise<void> {
    await this.groupsService.remove(userId, groupId);
  }

  @Get(':id/members')
  @ApiOperation({
    summary: 'List the roster',
    description:
      'WRITE and above see everyone; a READ member sees only their own row ' +
      '(group_members_select) — enforced by RLS, not this endpoint. Each row ' +
      'now includes email/display_name from a left join onto profiles — null ' +
      'for a member whose profile RLS hides from the caller (real today for ' +
      "anyone seated via a redeemed invite link; see GroupMember's own comment).",
  })
  async findMembers(
    @CurrentUser('id') userId: string,
    @Param('id') groupId: string,
  ): Promise<GroupMember[]> {
    return this.groupsService.findMembers(userId, groupId);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({
    summary: 'Assign a member a role',
    description: 'ADMIN only (group_members_update_admin).',
  })
  async updateMemberRole(
    @CurrentUser('id') callerId: string,
    @Param('id') groupId: string,
    @Param('userId') memberUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<GroupMember> {
    return this.groupsService.updateMemberRole(callerId, groupId, memberUserId, dto.role);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke a member’s access',
    description: 'ADMIN only (group_members_delete_admin).',
  })
  async removeMember(
    @CurrentUser('id') callerId: string,
    @Param('id') groupId: string,
    @Param('userId') memberUserId: string,
  ): Promise<void> {
    await this.groupsService.removeMember(callerId, groupId, memberUserId);
  }

  @Post(':id/invites')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Mint a magic invite link',
    description:
      'ADMIN only (group_invites_insert_admin). The raw token is returned ' +
      'once, here, and never stored — only its SHA-256 hash is.',
  })
  async createInvite(
    @CurrentUser('id') userId: string,
    @Param('id') groupId: string,
    @Body() dto: CreateInviteDto,
  ): Promise<CreatedInvite> {
    return this.groupsService.createInvite(userId, groupId, dto);
  }

  @Get(':id/invites')
  @ApiOperation({
    summary: 'List live invite links',
    description:
      'ADMIN only (group_invites_select_admin). Only not-revoked, not-expired, ' +
      'not-exhausted links — dead links are omitted, not just flagged.',
  })
  async listInvites(
    @CurrentUser('id') userId: string,
    @Param('id') groupId: string,
  ): Promise<GroupInviteSummary[]> {
    return this.groupsService.listInvites(userId, groupId);
  }
}
