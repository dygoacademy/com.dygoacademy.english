import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  LEGAL_CONTENT,
  LEGAL_REGIONS,
  legalContent,
  legalRegionFor,
  type LegalDoc,
} from '@/content/legal';

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

  it('voice donation text: only with the flag, same shape in all three languages', () => {
    expect(legalContent('en-US', false)).toBe(LEGAL_CONTENT['en-US']);
    const en = legalContent('en-US', true);
    for (const locale of ['vi-VN', 'zh-CN'] as const) {
      const other = legalContent(locale, true);
      for (const kind of ['terms', 'privacy'] as const) expect(shape(other[kind])).toEqual(shape(en[kind]));
    }
    const text = (doc: LegalDoc) => JSON.stringify(doc);
    expect(text(LEGAL_CONTENT['en-US'].privacy)).not.toContain('donat');
    expect(en.terms.short[3]).toContain('unless you choose to donate');
    expect(en.privacy.short[2]).toContain('Donating is off until you turn it on');
    const p2 = en.privacy.sections.find((s) => s.id === 'p2')!.blocks[0];
    expect(p2.kind === 'table' && p2.rows[3][0]).toBe('Voice recording');
    expect(p2.kind === 'table' && p2.rows[4][0]).toMatch(/^Donated voice recordings/);
    const p5 = en.privacy.sections.find((s) => s.id === 'p5')!.blocks[0];
    expect(p5.kind === 'ul' && p5.items[4]).toMatch(/Payments/);
    expect(p5.kind === 'ul' && p5.items[5]).toMatch(/Voice labelling/);
    const p8 = en.privacy.sections.find((s) => s.id === 'p8')!.blocks[1];
    expect(p8.kind === 'ul' && p8.items[4]).toMatch(/^withdraw consent.*stop donating your voice;$/);
    for (const r of LEGAL_REGIONS) expect(en.privacy.local.blocks[r]).toHaveLength(LEGAL_CONTENT['en-US'].privacy.local.blocks[r].length + 1);
    // The base copy is untouched.
    expect(LEGAL_CONTENT['en-US'].terms.short[3]).toBe('Speaking practice: your recording is checked, then deleted.');
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
