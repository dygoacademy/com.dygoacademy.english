import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

/** Module 2 — Word ingestion; returns 201 ENRICHING in <50ms (Phase 1). */
@Injectable()
export class WordsService {
  constructor(protected readonly db: DatabaseService) {}
}
