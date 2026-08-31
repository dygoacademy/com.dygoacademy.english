import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

/** Module 7 — Stripe tiered seat subscriptions (Phase 4). */
@Injectable()
export class BillingService {
  constructor(protected readonly db: DatabaseService) {}
}
