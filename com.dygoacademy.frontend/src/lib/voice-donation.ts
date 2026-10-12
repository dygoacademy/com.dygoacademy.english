/**
 * Voice donation (`docs/plans/Voice donation consent plan.md`, design CHANGELOG
 * 2026-10-11): A8e Privacy & data, the AU2 box, the A8 row and the Pond's
 * "kept" privacy line. Off unless NEXT_PUBLIC_VOICE_DONATION is the literal
 * "true" (baked in at `next build`; UAT only until the Terms / Privacy text
 * is approved). The backend has its own switch, VOICE_DONATION_ENABLED.
 */
export function isVoiceDonationOn(
  value: string | undefined = process.env.NEXT_PUBLIC_VOICE_DONATION,
): boolean {
  return value === 'true';
}

/** A8e confirm sheet: "Where did you grow up? (optional)"; null = prefer not to say. */
export const VOICE_DONATION_REGIONS = ['north', 'central', 'south', 'elsewhere'] as const;
export type VoiceDonationRegion = (typeof VOICE_DONATION_REGIONS)[number];

/** `GET /profiles/me/voice-donation`. */
export interface VoiceDonationStatus {
  donating: boolean;
  /** ISO time the active consent was given; null when off. */
  since: string | null;
  /** Donated recordings not deleted yet. */
  count: number;
  region: VoiceDonationRegion | null;
}

/** `PUT /profiles/me/voice-donation`. */
export interface VoiceDonationChange {
  donating: boolean;
  method?: 'setting' | 'register' | 'invite';
  region?: VoiceDonationRegion | null;
  locale?: string;
}

/**
 * A8e links. The app has no "download my data" or "delete account" flow
 * yet, so both open the Privacy Policy's "Your rights" (how to ask).
 */
export const VOICE_DONATION_LINKS = {
  how: '/privacy#p4',
  download: '/privacy#p8',
  privacy: '/privacy',
  terms: '/terms',
  deleteAccount: '/privacy#p8',
} as const;
