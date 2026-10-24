import { Logger } from '@nestjs/common';

/**
 * Seeds & Harvest analytics (plan section 5): writes one `product_events`
 * row inside the caller's transaction, under the learner's JWT. In a
 * savepoint, so a failed write (e.g. the table not migrated yet) never
 * fails the request it rides on.
 */
export type ProductEventName =
  | 'seed_dropped'
  | 'seed_planted'
  | 'bed_harvested'
  | 'packet_shown'
  | 'packet_chosen'
  | 'planting_empty';

interface Queryable {
  query(text: string, params?: unknown[]): Promise<unknown>;
}

const logger = new Logger('ProductEvents');

export async function recordEvent(
  client: Queryable,
  name: ProductEventName,
  props: Record<string, unknown>,
): Promise<void> {
  await client.query('savepoint product_event');
  try {
    await client.query(`insert into public.product_events (name, props) values ($1, $2)`, [
      name,
      JSON.stringify(props),
    ]);
    await client.query('release savepoint product_event');
  } catch (err) {
    await client.query('rollback to savepoint product_event');
    logger.warn(`product event ${name} not written: ${String(err)}`);
  }
}
