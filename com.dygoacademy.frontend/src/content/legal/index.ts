import type { AppLocale } from '@/i18n/config';
import { isVoiceDonationOn } from '@/lib/voice-donation';

import { legalEnUs } from './en-US';
import type { LegalContent, LegalRegion } from './types';
import { legalViVn } from './vi-VN';
import { legalZhCn } from './zh-CN';
import {
  voiceDonationEnUs,
  voiceDonationViVn,
  voiceDonationZhCn,
  withVoiceDonation,
  type VoiceDonationLegalText,
} from './voiceDonation';

export * from './types';

/** The legal pages' copy in each app language. */
export const LEGAL_CONTENT: Record<AppLocale, LegalContent> = {
  'en-US': legalEnUs,
  'vi-VN': legalViVn,
  'zh-CN': legalZhCn,
};

/** The voice donation additions in each app language (Part 3 of the plan). */
export const VOICE_DONATION_LEGAL: Record<AppLocale, VoiceDonationLegalText> = {
  'en-US': voiceDonationEnUs,
  'vi-VN': voiceDonationViVn,
  'zh-CN': voiceDonationZhCn,
};

/**
 * What the legal pages show: the base copy, plus the voice donation text
 * while NEXT_PUBLIC_VOICE_DONATION is on (UAT only until it is approved).
 */
export function legalContent(
  locale: AppLocale,
  voiceDonation: boolean = isVoiceDonationOn(),
): LegalContent {
  const base = LEGAL_CONTENT[locale];
  return voiceDonation ? withVoiceDonation(base, VOICE_DONATION_LEGAL[locale]) : base;
}

/**
 * Which "Your local rights" tab opens first: the visitor's country from
 * Cloudflare's `CF-IPCountry` header (AU, SG or VN), else Vietnam, the
 * main market. The visitor can switch tabs either way.
 */
export function legalRegionFor(country: string | null | undefined): LegalRegion {
  switch (country?.trim().toUpperCase()) {
    case 'AU':
      return 'au';
    case 'SG':
      return 'sg';
    default:
      return 'vn';
  }
}
