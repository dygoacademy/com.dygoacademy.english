import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResultRow } from 'pg';

/**
 * PostgreSQL access built on the standard NestJS custom-provider pattern —
 * `pg` driver, no ORM.
 *
 * WHY NOT AN ORM: the connection role is `authenticator`, exactly as PostgREST
 * uses it, and every request-scoped query runs inside a transaction that sets
 * `role authenticated` plus the JWT claims. That means the Row-Level Security
 * policies in 002_rls_policies.sql are enforced by PostgreSQL for API traffic
 * too — a missing tenant check in a service method cannot leak another
 * tenant's data. An ORM connecting as one privileged role would bypass RLS
 * entirely and push isolation back into application code, which is precisely
 * what the BRD's "Data Isolation" NFR says not to rely on.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool!: Pool;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.pool = new Pool({
      connectionString: this.config.getOrThrow<string>('database.url'),
      max: this.config.get<number>('database.poolMax', 20),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    this.pool.on('error', (err) => this.logger.error(`idle client error: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  /** Unscoped query. Runs as `authenticator` — use only where RLS is irrelevant. */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const res = await this.pool.query<T>(text, params);
    return res.rows;
  }

  /**
   * Runs `work` with RLS active for `userId`.
   *
   * SET LOCAL is used deliberately: it is scoped to the transaction, so a
   * pooled connection handed to the next request cannot inherit the previous
   * user's identity. Using plain SET here would be a cross-user data leak.
   */
  async withUser<T>(userId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query("select set_config('role', 'authenticated', true)");
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: 'authenticated' }),
      ]);
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (err) {
      await client.query('rollback').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** Convenience wrapper: a single RLS-scoped query. */
  async queryAs<T extends QueryResultRow = QueryResultRow>(
    userId: string,
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    return this.withUser(userId, async (client) => {
      const res = await client.query<T>(text, params);
      return res.rows;
    });
  }

  /**
   * Runs `work` as `service_role` — for background jobs with no acting
   * user (BullMQ processors), which is not what `query()`'s plain
   * `authenticator` connection is for. `authenticator` is a bare login
   * role by design (mirrors PostgREST) with no table grants of its own;
   * 002_rls_policies.sql's own comment on master_lexicon says it's
   * "written only by the enrichment worker (service_role)", but nothing
   * ever actually switched the connection into that role, which is why
   * EnrichmentProcessor hit "permission denied for table master_lexicon" —
   * live-verified 2026-09-03. service_role has BYPASSRLS (standard
   * self-hosted Supabase role setup, not something our own migrations
   * configure), so no JWT claims are needed here the way withUser sets
   * them for `authenticated`.
   */
  async withServiceRole<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query("select set_config('role', 'service_role', true)");
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (err) {
      await client.query('rollback').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** Convenience wrapper: a single service_role-scoped query. */
  async queryAsService<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    return this.withServiceRole(async (client) => {
      const res = await client.query<T>(text, params);
      return res.rows;
    });
  }

  /**
   * Runs `work` as the `anon` Postgres role — no JWT claims, the same
   * role PostgREST uses for an unauthenticated request. This backs the
   * guest word-lookup path (GuestWordTrial.tsx -> GET /words/guest-lookup,
   * added 2026-09-05 for the "try a word before you sign up" BA flow):
   * 002_rls_policies.sql already grants `anon` SELECT on `master_lexicon`
   * (and public topics/topic_words) specifically so unauthenticated
   * visitors can read already-enriched words, so this reuses that
   * existing policy rather than reaching for withServiceRole's RLS
   * bypass -- service_role is for background workers with no user
   * context at all (EnrichmentProcessor), not a user-facing request path.
   */
  async withAnon<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query("select set_config('role', 'anon', true)");
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (err) {
      await client.query('rollback').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** Convenience wrapper: a single anon-scoped query. */
  async queryAsAnon<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    return this.withAnon(async (client) => {
      const res = await client.query<T>(text, params);
      return res.rows;
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query('select 1');
      return true;
    } catch {
      return false;
    }
  }
}
