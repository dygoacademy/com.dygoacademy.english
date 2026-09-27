import { Module } from '@nestjs/common';

import { GroupGardenService } from './group-garden.service';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { InvitesController } from './invites.controller';
import { RainDayService } from './rain-day.service';

@Module({
  controllers: [GroupsController, InvitesController],
  providers: [GroupsService, GroupGardenService, RainDayService],
  exports: [GroupsService, GroupGardenService, RainDayService],
})
export class GroupsModule {}
