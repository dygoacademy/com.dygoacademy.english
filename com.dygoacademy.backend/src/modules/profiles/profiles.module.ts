import { Module } from '@nestjs/common';

import { SrsModule } from '../srs/srs.module';
import { MeController, ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [SrsModule],
  controllers: [ProfilesController, MeController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
