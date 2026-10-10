import type { AppLocale } from '@/i18n/config';

import { legalEnUs } from './en-US';
import type { LegalContent, LegalRegion } from './types';
import { legalViVn } from './vi-VN';
import { legalZhCn } from './zh-CN';

export * from './types';

/** The legal pages' copy in each app language. */
export const LEGAL_CONTENT: Record<AppLocale, LegalContent> = {
  'en-US': legalEnUs,
  'vi-VN': legalViVn,
  'zh-CN': legalZhCn,
};

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
