import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';

/**
 * Keeps `review_logs` partitions provisioned ahead of time.
 *
 * WHY THIS IS NOT OPTIONAL: `review_logs` is RANGE-partitioned by
 * `reviewed_at`. An INSERT with no matching partition does not fall back — it
 * fails outright. Without provisioning ahead, every review submitted after the
 * last partition's end date errors, so the app would break at midnight on the
 * 1st of a month with no warning. 001_initial_schema.sql created partitions
 * through 2027-01 by hand; this keeps the window rolling.
 *
 * A DEFAULT partition exists as a backstop so nothing is ever lost, but rows
 * landing there mean this job has fallen behind — and moving them out later
 * requires an exclusive lock on the whole table.
 *
 * Runs on its own short-lived connection using DATABASE_ADMIN_URL: the pooled
 * `authenticator` role the API uses has no privilege to CREATE TABLE, by design.
 */
@Injectable()
export class PartitionService {
  private readonly logger = new Logger(PartitionService.name);

  constructor(private readonly config: ConfigService) {}

  /** Ensures a partition exists for the current month and the next `monthsAhead`. */
  async ensureReviewLogPartitions(monthsAhead = 6): Promise<string[]> {
    const client = new Client({
      connectionString: this.config.getOrThrow<string>('database.adminUrl'),
    });
    const created: string[] = [];

    await client.connect();
    try {
      const now = new Date();
      for (let i = 0; i <= monthsAhead; i++) {
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));

        const suffix = `${start.getUTCFullYear()}_${String(start.getUTCMonth() + 1).padStart(
          2,
          '0',
        )}`;
        const table = `review_logs_${suffix}`;

        // The identifier is derived from formatted dates, never from input, so
        // interpolating it is safe — table names cannot be parameterised.
        if (!/^review_logs_\d{4}_\d{2}$/.test(table)) {
          throw new Error(`refusing to create suspicious partition "${table}"`);
        }

        const before = await client.query('select 1 from pg_class where relname = $1', [table]);
        if (before.rowCount) continue;

        await client.query(
          `create table if not exists public.${table}
             partition of public.review_logs
             for values from ('${this.iso(start)}') to ('${this.iso(end)}')`,
        );
        created.push(table);
      }
    } finally {
      await client.end();
    }

    if (created.length) {
      this.logger.log(`provisioned review_logs partitions: ${created.join(', ')}`);
    } else {
      this.logger.debug('review_logs partitions already provisioned');
    }
    return created;
  }

  /** Rows in the DEFAULT partition mean provisioning fell behind. */
  async countDefaultPartitionRows(): Promise<number> {
    const client = new Client({
      connectionString: this.config.getOrThrow<string>('database.adminUrl'),
    });
    await client.connect();
    try {
      const res = await client.query<{ count: string }>(
        'select count(*)::text as count from public.review_logs_default',
      );
      return Number(res.rows[0]?.count ?? 0);
    } finally {
      await client.end();
    }
  }

  private iso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
