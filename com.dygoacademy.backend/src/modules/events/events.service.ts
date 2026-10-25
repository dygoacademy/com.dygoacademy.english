import { BadRequestException, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import {
  CLIENT_EVENTS,
  EVENT_TEXT_MAX,
  type ClientEventName,
  type EventPropValue,
} from './events.types';

/**
 * Writes the app's analytics events (POST /events) to public.product_events
 * as the learner: RLS lets them insert their own rows only, never read them.
 */
@Injectable()
export class EventsService {
  constructor(private readonly db: DatabaseService) {}

  async record(
    userId: string,
    name: ClientEventName,
    props: Record<string, unknown>,
  ): Promise<void> {
    const clean = checkProps(name, props);
    await this.db.queryAs(
      userId,
      `insert into public.product_events (name, props) values ($1, $2)`,
      [name, JSON.stringify(clean)],
    );
  }
}

/** The props if every key is on the event's list and every value is a short primitive; 400 otherwise. */
export function checkProps(
  name: ClientEventName,
  props: Record<string, unknown>,
): Record<string, EventPropValue> {
  const allowed = new Set<string>(CLIENT_EVENTS[name]);
  const out: Record<string, EventPropValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!allowed.has(key)) throw new BadRequestException(`${name} has no prop "${key}"`);
    const ok =
      value === null ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value)) ||
      (typeof value === 'string' && value.length <= EVENT_TEXT_MAX);
    if (!ok)
      throw new BadRequestException(
        `${name}.${key} must be short text, a number, true/false or null`,
      );
    out[key] = value;
  }
  return out;
}
