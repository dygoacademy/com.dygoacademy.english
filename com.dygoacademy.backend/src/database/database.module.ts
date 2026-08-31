import { Global, Module } from '@nestjs/common';

import { DatabaseService } from './database.service';
import { PartitionService } from './partition.service';

@Global()
@Module({
  providers: [DatabaseService, PartitionService],
  exports: [DatabaseService, PartitionService],
})
export class DatabaseModule {}
