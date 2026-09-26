import { Module } from '@nestjs/common';

import { GroupGardenService } from './group-garden.service';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { InvitesController } from './invites.controller';

@Module({
  controllers: [GroupsController, InvitesController],
  providers: [GroupsService, GroupGardenService],
  exports: [GroupsService, GroupGardenService],
})
export class GroupsModule {}
