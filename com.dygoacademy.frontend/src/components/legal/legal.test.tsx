import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LEGAL_CONTENT, LEGAL_REGIONS, legalRegionFor, type LegalDoc } from '@/content/legal';

import { LegalPage, LegalText } from './LegalPage';

const shape = (doc: LegalDoc) => ({
  sections: doc.sections.map((s) => [s.id, s.blocks.map((b) => b.kind)]),
  local: LEGAL_REGIONS.map((r) => doc.local.blocks[r].map((b) => b.kind)),
  contact: doc.contact.id,
  short: doc.short.length,
});

describe('legal pages (canvas page "Legal", 2026-10-09)', () => {
  it('has the same sections, blocks and region notes in all three languages', () => {
    const en = LEGAL_CONTENT['en-US'];
    for (const locale of ['vi-VN', 'zh-CN'] as const) {
      for (const kind of ['terms', 'privacy'] as const) {
        expect(shape(LEGAL_CONTENT[locale][kind])).toEqual(shape(en[kind]));
        for (const r of LEGAL_REGIONS) expect(LEGAL_CONTENT[locale][kind].regionNote[r]).toBeTruthy();
      }
    }
  });

  it('opens the local rights tab for the visitor’s country, Vietnam otherwise', () => {
    expect(legalRegionFor('AU')).toBe('au');
    expect(legalRegionFor('sg')).toBe('sg');
    expect(legalRegionFor('VN')).toBe('vn');
    expect(legalRegionFor('US')).toBe('vn');
    expect(legalRegionFor(null)).toBe('vn');
  });

  it('renders bold text and highlighted placeholders, nothing else', () => {
    const { container } = render(<LegalText text="<b>Vietnam.</b> Run by [[COMPANY]] <i>x</i>" />);
    expect(container.querySelector('b')?.textContent).toBe('Vietnam.');
    expect(container.querySelector('[data-placeholder]')?.textContent).toBe('COMPANY');
    expect(container.querySelector('i')).toBeNull();
  });

  it('switches the local rights when another country is picked', () => {
    const content = LEGAL_CONTENT['en-US'];
    render(
      <LegalPage
        doc={content.privacy}
        ui={content.ui}
        initialRegion="vn"
        selfLabel="Privacy Policy"
        selfHref="/privacy"
        otherLabel="Terms of Service"
        otherHref="/terms"
        homeHref="/"
      />,
    );
    expect(screen.getAllByText(/Law on Personal Data Protection No\. 91\/2025\/QH15/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Singapore' })[0]);
    expect(screen.getAllByRole('button', { name: 'Singapore' })[0].getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByText(/Personal Data Protection Act 2012 \(PDPA\)\./).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Law on Personal Data Protection No\. 91\/2025\/QH15 and Decree/)).toBeNull();
  });

  it('opens and closes a section on the phone', () => {
    const content = LEGAL_CONTENT['vi-VN'];
    render(
      <LegalPage
        doc={content.terms}
        ui={content.ui}
        initialRegion="vn"
        selfLabel="Điều khoản"
        selfHref="/terms"
        otherLabel="Quyền riêng tư"
        otherHref="/privacy"
        homeHref="/vi"
      />,
    );
    const row = screen.getByRole('button', { name: /Chúng tôi là ai/ });
    expect(row.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(row);
    expect(row.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: /Quyền lợi tại nước bạn/ }).getAttribute('aria-expanded')).toBe('true');
  });
});
