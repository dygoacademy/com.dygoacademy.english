/**
 * Shape of the Terms of Service and Privacy Policy copy (canvas page
 * "Legal", LG1–LG4). Text strings may contain `<b>…</b>` and `[[…]]`
 * (a fact still to be filled in, shown highlighted); `LegalText` renders
 * both, nothing else is parsed.
 */
export const LEGAL_REGIONS = ['vn', 'au', 'sg'] as const;
export type LegalRegion = (typeof LEGAL_REGIONS)[number];

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  title: string;
  /** Meta description. */
  description: string;
  /** "Last updated …" line under the title. */
  updated: string;
  shortTitle: string;
  /** The plain-language "short version" bullets. */
  short: string[];
  regionQuestion: string;
  /** One line per region under the region switch. */
  regionNote: Record<LegalRegion, string>;
  /** Link text from the region note to the local rights section. */
  seeLocal: string;
  sections: LegalSection[];
  /** "Your local rights": one set of blocks per region. */
  local: { id: string; title: string; blocks: Record<LegalRegion, LegalBlock[]> };
  contact: LegalSection;
}

export interface LegalUi {
  eyebrow: string;
  onThisPage: string;
  navLabel: string;
  homeLabel: string;
  regions: Record<LegalRegion, string>;
  termsLabel: string;
  privacyLabel: string;
  copyright: string;
}

export interface LegalContent {
  ui: LegalUi;
  terms: LegalDoc;
  privacy: LegalDoc;
}

export type LegalKind = 'terms' | 'privacy';
