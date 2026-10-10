// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => `t:${key}`,
}));

const { homeMetadata } = await import('@/components/home/homePage');
const { default: sitemap } = await import('./sitemap');
const { default: robots } = await import('./robots');

const LANGUAGES = { 'en-US': '/', 'vi-VN': '/vi', 'zh-CN': '/zh', 'x-default': '/' };

describe('home page SEO (2026-10-07)', () => {
  it('gives each language its own canonical and every hreflang alternate', async () => {
    const vi = await homeMetadata('vi-VN');
    expect(vi.metadataBase?.toString()).toBe('https://www.dygoacademy.com/');
    expect(vi.alternates?.canonical).toBe('/vi');
    expect(vi.alternates?.languages).toEqual(LANGUAGES);
    expect(vi.openGraph).toMatchObject({ url: '/vi', locale: 'vi_VN', alternateLocale: ['en_US', 'zh_CN'] });
    expect((await homeMetadata('en-US')).alternates?.canonical).toBe('/');
  });

  it('uses the search description and keywords, not the hero lead (2026-10-09)', async () => {
    const en = await homeMetadata('en-US');
    expect(en.description).toBe('t:metaDescription');
    expect(en.keywords).toEqual(['t:metaKeywords']);
  });

  it('lists the three home pages and the legal pages in the sitemap with absolute alternates', () => {
    const entries = sitemap();
    expect(entries.map((e) => e.url)).toEqual([
      'https://www.dygoacademy.com/',
      'https://www.dygoacademy.com/vi',
      'https://www.dygoacademy.com/zh',
      'https://www.dygoacademy.com/terms',
      'https://www.dygoacademy.com/privacy',
    ]);
    expect(entries[2].alternates?.languages).toMatchObject({ 'vi-VN': 'https://www.dygoacademy.com/vi' });
  });

  it('points robots.txt at the sitemap and keeps crawlers out of signed-in screens', () => {
    const r = robots();
    expect(r.sitemap).toBe('https://www.dygoacademy.com/sitemap.xml');
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rules.allow).toBe('/');
    expect(rules.disallow).toEqual(expect.arrayContaining(['/api/', '/review', '/garden']));
    expect(rules.disallow).not.toContain('/');
  });
});
