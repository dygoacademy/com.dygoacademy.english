import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { DatabaseService } from '../database/database.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and dependency check' })
  async check() {
    const database = await this.db.isHealthy();
    return {
      status: database ? 'ok' : 'degraded',
      dependencies: { database: database ? 'up' : 'down' },
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
