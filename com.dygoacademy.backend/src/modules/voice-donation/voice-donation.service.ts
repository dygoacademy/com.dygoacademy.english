import { randomUUID } from 'node:crypto';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { DatabaseService } from '../../database/database.service';
import { MAINTENANCE_QUEUE, VOICE_DONATION_CLEANUP_JOB } from '../../queues/queue.constants';
import type { SpeechAudio } from '../speaking/speech-checker';
import {
  bypassesQuota,
  DEFAULT_DONATION_POLICY,
  DonationPolicy,
  DropReason,
  KeptReason,
  normalizeText,
  qualityGate,
  usefulReason,
} from './donation-policy';
import { SetVoiceDonationDto } from './dto/set-voice-donation.dto';
import { encryptDonation, parseDonationKey } from './voice-donation.crypto';
import { VoiceDonationStorage } from './voice-donation.storage';
import {
  VOICE_DONATION_RETENTION_YEARS,
  VOICE_DONATION_TEXT_VERSION,
  VoiceDonationDeleted,
  VoiceDonationDevice,
  VoiceDonationRegion,
  VoiceDonationStatus,
} from './voice-donation.types';

/** What a speech check knows about the recording it is about to drop. */
export interface DonationMeta {
  kind: 'sentence' | 'word';
  /** The sentence or the word that was practised. */
  text: string;
  /** The word's IPA for the practised accent (word checks); null for sentences. */
  targetIpa: string | null;
  accent: 'UK' | 'US' | null;
  device: VoiceDonationDevice | null;
  /** The scorer's own reply (scores per word / syllable); no account data. */
  scores: unknown;
}

/** Each kept recording is two objects: `<prefix>.audio.enc` and `<prefix>.json.enc`. */
const OBJECT_SUFFIXES = ['.audio.enc', '.json.enc'] as const;

/** "Today" for the daily cap starts at midnight in Vietnam. */
const DAY_ZONE = 'Asia/Ho_Chi_Minh';

/**
 * Voice donation (plan §4). Off unless VOICE_DONATION_ENABLED=true: the
 * routes answer 404 and nothing is kept. Kept only while the learner's
 * consent is active at the moment of the check; the check itself is
 * unchanged, and a failure here never touches its result. The daily job
 * (and a delete request, at once) deletes queued donor codes' recordings
 * and anything older than 3 years, flag or not.
 */
@Injectable()
export class VoiceDonationService {
  private readonly logger = new Logger(VoiceDonationService.name);
  private readonly key: Buffer | null;
  private readonly policy: DonationPolicy;
  /** Kept / dropped counts for the current day, logged once the day is over (no audio, no text). */
  private tally: { day: string; counts: Record<string, number> } = { day: '', counts: {} };
  /** Overridable in tests. */
  random: () => number = Math.random;
  readonly enabled: boolean;

  constructor(
    private readonly db: DatabaseService,
    private readonly storage: VoiceDonationStorage,
    config: ConfigService,
    @InjectQueue(MAINTENANCE_QUEUE) private readonly maintenance: Queue,
  ) {
    this.key = parseDonationKey(config.get<string>('voiceDonation.key'));
    this.enabled = config.get<boolean>('voiceDonation.enabled', false);
    const d = DEFAULT_DONATION_POLICY;
    const n = (k: keyof DonationPolicy) => {
      const v = Number(config.get<number>(`voiceDonation.${k}`, d[k]));
      return Number.isFinite(v) && v >= 0 ? v : d[k];
    };
    this.policy = {
      maxPerPrompt: n('maxPerPrompt'),
      maxPerDay: n('maxPerDay'),
      sampleRate: Math.min(1, n('sampleRate')),
      promptRegionQuota: n('promptRegionQuota'),
    };
    if (this.enabled && !this.key) {
      this.logger.warn(
        'VOICE_DONATION_ENABLED is on but VOICE_DONATION_KEY is missing or not 32 bytes: ' +
          'learners can turn donation on, but no recording is kept until the key is set',
      );
    }
  }

  private assertEnabled(): void {
    if (!this.enabled) throw new NotFoundException();
  }

  async status(userId: string): Promise<VoiceDonationStatus> {
    this.assertEnabled();
    const rows = await this.db.queryAs<{
      since: Date | null;
      region: VoiceDonationRegion | null;
      count: string;
    }>(
      userId,
      `select (select c.granted_at from public.voice_donation_consents c
                where c.user_id = $1 and c.withdrawn_at is null) as since,
              (select d.region from public.voice_donors d where d.user_id = $1) as region,
              (select count(*) from public.voice_donations v
                 join public.voice_donors d on d.donor_code = v.donor_code
                where d.user_id = $1) as count`,
      [userId],
    );
    const row = rows[0];
    return {
      donating: !!row?.since,
      since: row?.since ? new Date(row.since).toISOString() : null,
      count: Number(row?.count ?? 0),
      region: row?.region ?? null,
    };
  }

  /**
   * On: a consent row (unless one is active) and the donor code (made once;
   * the region answer updated when sent). Off: stamps withdrawn_at; what was
   * already donated stays until "Delete my donated recordings".
   */
  async set(userId: string, dto: SetVoiceDonationDto): Promise<VoiceDonationStatus> {
    this.assertEnabled();
    await this.db.withUser(userId, async (client) => {
      if (!dto.donating) {
        await client.query(
          `update public.voice_donation_consents set withdrawn_at = now()
            where user_id = $1 and withdrawn_at is null`,
          [userId],
        );
        return;
      }
      await client.query(
        `insert into public.voice_donation_consents (user_id, text_version, method, locale)
         select $1, $2, $3, $4
          where not exists (select 1 from public.voice_donation_consents
                             where user_id = $1 and withdrawn_at is null)`,
        [userId, VOICE_DONATION_TEXT_VERSION, dto.method ?? 'setting', dto.locale ?? null],
      );
      if (dto.region !== undefined) {
        await client.query(
          `insert into public.voice_donors (user_id, region) values ($1, $2)
           on conflict (user_id) do update set region = excluded.region`,
          [userId, dto.region],
        );
      } else {
        await client.query(
          `insert into public.voice_donors (user_id) values ($1) on conflict (user_id) do nothing`,
          [userId],
        );
      }
    });
    return this.status(userId);
  }

  /**
   * "Delete my donated recordings": turns donation off and drops the donor
   * link, which queues the code (trigger); the files go in the cleanup job
   * queued here, or the daily one if that fails.
   */
  async deleteRecordings(userId: string): Promise<VoiceDonationDeleted> {
    this.assertEnabled();
    const deleting = await this.db.withUser(userId, async (client) => {
      await client.query(
        `update public.voice_donation_consents set withdrawn_at = now()
          where user_id = $1 and withdrawn_at is null`,
        [userId],
      );
      const res = await client.query<{ count: string }>(
        `select count(*) from public.voice_donations v
           join public.voice_donors d on d.donor_code = v.donor_code
          where d.user_id = $1`,
        [userId],
      );
      await client.query('delete from public.voice_donors where user_id = $1', [userId]);
      return Number(res.rows[0]?.count ?? 0);
    });
    await this.maintenance
      .add(VOICE_DONATION_CLEANUP_JOB, {}, { removeOnComplete: true, removeOnFail: { count: 20 } })
      .catch((err) => this.logger.warn(`could not queue donation cleanup: ${String(err)}`));
    return { deleting };
  }

  /**
   * Called by the speech-check worker after scoring, before the recording is
   * dropped. Keeps an encrypted copy when the learner's consent is active
   * now and the recording passes the quality rules (donation-policy.ts):
   * it can be labelled, the donor is under the per-prompt and daily caps,
   * and it is useful (or picked as a random sample) and under the region
   * quota. Never throws.
   */
  async keep(userId: string, audio: SpeechAudio, meta: DonationMeta): Promise<boolean> {
    if (!this.enabled || !this.key) return false;
    try {
      const gate = qualityGate(meta.kind, meta.text, meta.scores);
      if (gate) return this.count(gate);

      const textNorm = normalizeText(meta.text);
      const rows = await this.db.queryAs<{
        donor_code: string;
        region: VoiceDonationRegion | null;
        ui_locale: string | null;
        prompt_count: string;
        today_count: string;
      }>(
        userId,
        `select d.donor_code, d.region, p.ui_locale,
                (select count(*) from public.voice_donations v
                  where v.donor_code = d.donor_code and v.kind = $2 and v.text_norm = $3) as prompt_count,
                (select count(*) from public.voice_donations v
                  where v.donor_code = d.donor_code
                    and v.created_at >= (date_trunc('day', now() at time zone $4) at time zone $4)) as today_count
           from public.voice_donors d
           join public.voice_donation_consents c
             on c.user_id = d.user_id and c.withdrawn_at is null
           join public.profiles p on p.id = d.user_id
          where d.user_id = $1`,
        [userId, meta.kind, textNorm, DAY_ZONE],
      );
      const donor = rows[0];
      if (!donor) return false;

      const choice = await this.choose(meta, textNorm, donor);
      if (typeof choice !== 'object') return this.count(choice);

      const now = new Date();
      const prefix = `donations/${donor.donor_code}/${now.toISOString().slice(0, 7)}/${randomUUID()}`;
      // No name, email or account id: the donor code is the only link (plan V-3, V-4).
      const metadata = {
        donor_code: donor.donor_code,
        kind: meta.kind,
        text: meta.text,
        target_ipa: meta.targetIpa,
        scores: meta.scores,
        accent: meta.accent,
        app_locale: donor.ui_locale,
        device: meta.device,
        region: donor.region,
        kept_reason: choice.reason,
        audio_type: audio.mimetype,
        text_version: VOICE_DONATION_TEXT_VERSION,
        created_at: now.toISOString(),
      };
      await this.storage.put(`${prefix}.audio.enc`, encryptDonation(audio.buffer, this.key));
      await this.storage.put(
        `${prefix}.json.enc`,
        encryptDonation(Buffer.from(JSON.stringify(metadata)), this.key),
      );
      await this.db.queryAs(
        userId,
        `insert into public.voice_donations (donor_code, object_key, kind, text_norm, region, kept_reason)
         values ($1, $2, $3, $4, $5, $6)`,
        [donor.donor_code, prefix, meta.kind, textNorm, donor.region, choice.reason],
      );
      this.count(`kept_${choice.reason}`);
      return true;
    } catch (err) {
      this.logger.warn(`voice donation not kept: ${String(err)}`);
      return false;
    }
  }

  /** Caps, then usefulness or the random sample, then the region quota. */
  private async choose(
    meta: DonationMeta,
    textNorm: string,
    donor: { region: VoiceDonationRegion | null; prompt_count: string; today_count: string },
  ): Promise<{ reason: KeptReason } | DropReason> {
    const p = this.policy;
    if (Number(donor.prompt_count) >= p.maxPerPrompt) return 'repeat_attempt';
    if (Number(donor.today_count) >= p.maxPerDay) return 'daily_cap';
    let reason = usefulReason(meta.kind, meta.targetIpa, meta.scores);
    if (!reason) {
      if (this.random() >= p.sampleRate) return 'not_sampled';
      reason = 'sample';
    }
    if (!bypassesQuota(reason)) {
      // Across donors, so as the service role; only a count comes back.
      const res = await this.db.queryAsService<{ count: string }>(
        `select count(*) from public.voice_donations
          where kind = $1 and text_norm = $2 and region is not distinct from $3`,
        [meta.kind, textNorm, donor.region],
      );
      if (Number(res[0]?.count ?? 0) >= p.promptRegionQuota) return 'region_quota';
    }
    return { reason };
  }

  /** Adds to today's tally; logs yesterday's when the day changes. Returns false (not kept). */
  private count(what: string): false {
    const day = new Date().toLocaleDateString('en-CA', { timeZone: DAY_ZONE });
    if (this.tally.day !== day) {
      const { day: was, counts } = this.tally;
      const kept = Object.entries(counts)
        .filter(([k]) => k.startsWith('kept_'))
        .reduce((a, [, v]) => a + v, 0);
      if (was) {
        const fn = kept === 0 ? 'warn' : 'log';
        this.logger[fn](`voice donation ${was}: kept ${kept}; ${JSON.stringify(counts)}`);
      }
      this.tally = { day, counts: {} };
    }
    this.tally.counts[what] = (this.tally.counts[what] ?? 0) + 1;
    return false;
  }

  /**
   * Deletes the recordings of every queued donor code, then any older than
   * 3 years. Runs daily and after each delete request; a code whose files
   * can't be deleted stays queued for the next run.
   */
  async cleanup(): Promise<{ codes: number; files: number; expired: number }> {
    const queued = await this.db.queryAsService<{ donor_code: string }>(
      `select donor_code from public.voice_donation_deletions where done_at is null`,
    );
    let files = 0;
    let codes = 0;
    for (const { donor_code } of queued) {
      try {
        const keys = await this.db.queryAsService<{ object_key: string }>(
          `select object_key from public.voice_donations where donor_code = $1`,
          [donor_code],
        );
        await this.storage.deleteMany(this.objectsOf(keys.map((k) => k.object_key)));
        await this.db.withServiceRole(async (client) => {
          await client.query('delete from public.voice_donations where donor_code = $1', [
            donor_code,
          ]);
          await client.query(
            'update public.voice_donation_deletions set done_at = now() where donor_code = $1',
            [donor_code],
          );
        });
        files += keys.length;
        codes += 1;
      } catch (err) {
        this.logger.warn(`donated recordings of one code not deleted yet: ${String(err)}`);
      }
    }

    const old = await this.db.queryAsService<{ object_key: string }>(
      `select object_key from public.voice_donations
        where created_at < now() - make_interval(years => $1)
        limit 5000`,
      [VOICE_DONATION_RETENTION_YEARS],
    );
    if (old.length > 0) {
      const keys = old.map((k) => k.object_key);
      await this.storage.deleteMany(this.objectsOf(keys));
      await this.db.queryAsService(
        'delete from public.voice_donations where object_key = any($1)',
        [keys],
      );
    }
    if (codes > 0 || old.length > 0) {
      this.logger.log(
        `voice donation cleanup: ${files} recording(s) of ${codes} donor(s), ${old.length} expired`,
      );
    }
    return { codes, files, expired: old.length };
  }

  private objectsOf(prefixes: string[]): string[] {
    return prefixes.flatMap((p) => OBJECT_SUFFIXES.map((s) => `${p}${s}`));
  }
}
