import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { MediaLoadEventDto } from './dto/media-events.dto';

export interface VisitorLocation {
  /** Cloudflare CF-IPCountry (ISO code; XX unknown, T1 Tor). */
  country: string | null;
  /** Cloudflare CF-IPCity (needs the "Add visitor location headers" managed transform). */
  city: string | null;
}

/** Cleans a Cloudflare header value: trimmed, length-capped, null if empty. */
export function headerValue(raw: string | string[] | undefined, max: number): string | null {
  const v = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!v) return null;
  try {
    return decodeURIComponent(v).slice(0, max);
  } catch {
    return v.slice(0, max);
  }
}

/**
 * Option 2 (2026-10-04): audio start times from learners' phones, so slow
 * audio can be checked by country/city, network and cache (no IP stored).
 * Inserted as the learner (RLS: insert-own); read by Dylan as service_role.
 */
@Injectable()
export class TelemetryService {
  constructor(private readonly db: DatabaseService) {}

  async recordMedia(
    userId: string,
    events: MediaLoadEventDto[],
    where: VisitorLocation,
  ): Promise<{ recorded: number }> {
    const rows = events.map((e) => [
      e.kind,
      e.host.toLowerCase(),
      e.outcome,
      e.ms,
      e.from_cache,
      e.effective_type ?? null,
      where.country,
      where.city,
    ]);
    // One multi-row insert; no RETURNING (learners have insert but not select).
    const values = rows
      .map((_, i) => `(${Array.from({ length: 8 }, (__, k) => `$${i * 8 + k + 1}`).join(', ')})`)
      .join(', ');
    await this.db.queryAs(
      userId,
      `insert into public.media_load_events
         (kind, host, outcome, ms, from_cache, effective_type, country, city)
       values ${values}`,
      rows.flat(),
    );
    return { recorded: rows.length };
  }
}
