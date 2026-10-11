/**
 * Voice donation (`Voice donation consent plan.md`, design CHANGELOG
 * 2026-10-11): a learner who turns on "Help improve Dygo's speech checker"
 * has their speaking and pronunciation recordings kept, encrypted, under a
 * random donor code, to train and test Dygo's own speech checker.
 */

/** The consent text a learner agrees to; bump when the Terms / Privacy wording changes. */
export const VOICE_DONATION_TEXT_VERSION = '2026-10-v1';

/** How the learner turned donation on (voice_donation_consents.method). */
export const VOICE_DONATION_METHODS = ['setting', 'register', 'invite'] as const;
export type VoiceDonationMethod = (typeof VOICE_DONATION_METHODS)[number];

/** A8e confirm sheet: "Where did you grow up? (optional)". null = prefer not to say. */
export const VOICE_DONATION_REGIONS = ['north', 'central', 'south', 'elsewhere'] as const;
export type VoiceDonationRegion = (typeof VOICE_DONATION_REGIONS)[number];

/** Kept recordings older than this are deleted by the daily job (plan V-6). */
export const VOICE_DONATION_RETENTION_YEARS = 3;

/** `GET /profiles/me/voice-donation`. */
export interface VoiceDonationStatus {
  /** Turned on now (an active consent). */
  donating: boolean;
  /** When the active consent was given; null when off. */
  since: string | null;
  /** Recordings kept under the learner's donor code (still there, not yet deleted). */
  count: number;
  region: VoiceDonationRegion | null;
}

/** `DELETE /profiles/me/voice-donation/recordings`. */
export interface VoiceDonationDeleted {
  /** How many recordings will be deleted (within 30 days; usually at once). */
  deleting: number;
}

/** Phone, tablet or computer, from the User-Agent of the check request. */
export type VoiceDonationDevice = 'phone' | 'tablet' | 'desktop';

export function deviceFromUserAgent(ua: string | undefined): VoiceDonationDevice {
  const s = ua ?? '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))) {
    return 'tablet';
  }
  if (/Mobi|iPhone|iPod|Android/i.test(s)) return 'phone';
  return 'desktop';
}
