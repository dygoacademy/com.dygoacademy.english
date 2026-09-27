/**
 * Helpers for the FR-5.5 quiz nuance explanation (GeminiEnrichmentService.
 * explainNuance). Both live here, apart from the Gemini client, so they're
 * plain functions with their own tests.
 */

/** App language codes the garden sends (UI-L), plus the old short codes. */
const LANGUAGE_NAMES: Record<string, string> = {
  'vi-VN': 'Vietnamese',
  vi: 'Vietnamese',
  'zh-CN': 'Simplified Chinese',
  zh: 'Simplified Chinese',
};

/**
 * The language the explanation should be written in, or null for English
 * (no locale, or any English one: the classic app never sends a locale).
 */
export function nuanceLanguage(locale: string | undefined | null): string | null {
  if (!locale) return null;
  return LANGUAGE_NAMES[locale] ?? null;
}

/**
 * Gemini sometimes answers in Markdown (`**word**`, `*word*`, `` `word` ``,
 * a leading `#` or `- `), which both quiz screens show as raw text. Strip the
 * markup and keep the words. Snake_case-style underscores inside words are
 * left alone; only paired `__x__` / `_x_` emphasis around text is removed.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[\s(])\*(\S(?:.*?\S)?)\*(?=[\s).,!?;:\-"'”’]|$)/g, '$1$2')
    .replace(/(^|[\s(])_(\S(?:.*?\S)?)_(?=[\s).,!?;:\-"'”’]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
