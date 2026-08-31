import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

/** Module 6 — Web Push subscriptions & habit scheduling (Phase 3). */
@Injectable()
export class NotificationsService {
  constructor(protected readonly db: DatabaseService) {}
}
