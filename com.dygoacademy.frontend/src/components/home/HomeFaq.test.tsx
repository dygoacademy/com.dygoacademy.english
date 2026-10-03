import { screen } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';

import enUS from '../../../messages/en-US.json';
import viVN from '../../../messages/vi-VN.json';
import zhCN from '../../../messages/zh-CN.json';
import { renderWithIntl } from '@/test/render';

import { FAQ_KEYS, faqJsonLd, HomeFaq } from './HomeFaq';

const LOCALES = { 'en-US': enUS, 'vi-VN': viVN, 'zh-CN': zhCN } as const;

describe('HomeFaq (Home page v2 HP-9)', () => {
  it.each(Object.entries(LOCALES))('builds FAQPage JSON-LD with 7 Q&As in %s', (locale, messages) => {
    const t = createTranslator({ locale, messages: messages as typeof enUS, namespace: 'screens.home.public.faq' });
    const ld = faqJsonLd(t);
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toHaveLength(7);
    const faq = messages.screens.home.public.faq.items;
    ld.mainEntity.forEach((entry, i) => {
      const key = FAQ_KEYS[i];
      expect(entry['@type']).toBe('Question');
      expect(entry.name).toBe(faq[key].q);
      expect(entry.acceptedAnswer).toEqual({ '@type': 'Answer', text: faq[key].a });
      expect(entry.name.length).toBeGreaterThan(0);
    });
  });

  it('renders the 7 questions as details, the first one open, in reading order', () => {
    const { container } = renderWithIntl(<HomeFaq />);
    const details = Array.from(container.querySelectorAll('details'));
    expect(details).toHaveLength(7);
    const byOrder = [...details].sort((a, b) => Number(a.style.order) - Number(b.style.order));
    expect(byOrder.map((d) => d.querySelector('summary')?.textContent)).toEqual(
      FAQ_KEYS.map((key) => enUS.screens.home.public.faq.items[key].q),
    );
    expect(details.filter((d) => d.open).map((d) => d.querySelector('summary')?.textContent)).toEqual(['Is Dygo free?']);
    expect(screen.getByText('Yes. It’s free to start, and you don’t need a credit card.')).toBeTruthy();
  });
});
