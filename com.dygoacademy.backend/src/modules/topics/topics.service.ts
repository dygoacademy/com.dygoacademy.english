import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

export interface TopicSummary {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  word_count: string;
  created_at: Date;
}

/** Module 1 — Collaborative groups, topics & RBAC (Phase 1). */
@Injectable()
export class TopicsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Topics visible to this user.
   *
   * Note the absence of any tenant or membership filter in the SQL: none is
   * needed. `queryAs` runs the statement as `authenticated` with the caller's
   * JWT claims set, so the policies in 002_rls_policies.sql do the filtering
   * inside PostgreSQL. Adding a WHERE clause here would duplicate that logic
   * and create a second place for it to be wrong.
   */
  async findAllVisible(userId: string): Promise<TopicSummary[]> {
    return this.db.queryAs<TopicSummary>(
      userId,
      `select t.id,
              t.group_id,
              t.title,
              t.description,
              t.is_public,
              count(tw.id) as word_count,
              t.created_at
         from public.topics t
         left join public.topic_words tw on tw.topic_id = t.id
        group by t.id
        order by t.created_at desc`,
    );
  }
}
