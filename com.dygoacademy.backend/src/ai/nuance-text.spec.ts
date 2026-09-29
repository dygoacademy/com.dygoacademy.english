import { nuanceLanguage, stripMarkdown } from './nuance-text';

describe('stripMarkdown', () => {
  it('removes bold, italic and code marks but keeps the words', () => {
    expect(
      stripMarkdown(
        'Popeye relies on canned **spinach** to get *super*-strength, not `long beans`.',
      ),
    ).toBe('Popeye relies on canned spinach to get super-strength, not long beans.');
  });

  it('removes heading and list markers at line starts', () => {
    expect(stripMarkdown('## Why\n- "robust" means strong')).toBe('Why\n"robust" means strong');
  });

  it('leaves plain text, lone asterisks and snake_case alone', () => {
    expect(stripMarkdown('A 5 * 3 grid of word_list items.')).toBe(
      'A 5 * 3 grid of word_list items.',
    );
  });
});

describe('nuanceLanguage', () => {
  it('maps the garden app languages', () => {
    expect(nuanceLanguage('vi-VN')).toBe('Vietnamese');
    expect(nuanceLanguage('vi')).toBe('Vietnamese');
    expect(nuanceLanguage('zh-CN')).toBe('Simplified Chinese');
  });

  it('is null (English) for English, unknown or missing locales', () => {
    expect(nuanceLanguage('en-US')).toBeNull();
    expect(nuanceLanguage('en-GB')).toBeNull();
    expect(nuanceLanguage('fr-FR')).toBeNull();
    expect(nuanceLanguage(undefined)).toBeNull();
  });
});
