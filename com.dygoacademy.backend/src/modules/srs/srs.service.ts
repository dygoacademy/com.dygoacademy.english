import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

/** Module 3 — Error-adaptive spaced repetition (Phase 2). */
@Injectable()
export class SrsService {
  constructor(protected readonly db: DatabaseService) {}
}
