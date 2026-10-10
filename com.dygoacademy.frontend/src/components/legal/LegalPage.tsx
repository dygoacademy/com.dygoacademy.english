'use client';

import * as React from 'react';
import Link from 'next/link';

import { gcn } from '@/components/garden/cn';
import { LogoMark } from '@/components/home/homeArt';
import {
  LEGAL_REGIONS,
  type LegalBlock,
  type LegalDoc,
  type LegalRegion,
  type LegalUi,
} from '@/content/legal';

/**
 * Terms of Service and Privacy Policy (canvas page "Legal": LG1/LG2 desktop,
 * LG3/LG4 phone, 2026-10-09). One layout for both documents:
 *  - phone (< lg): the sections are rows that open on tap, "Your local
 *    rights" first and open;
 *  - desktop (lg+): a table of contents beside every section, all open.
 * The region switch (Vietnam · Australia · Singapore) swaps the note under
 * it and the local rights section; both switches share one state.
 */
export interface LegalPageProps {
  doc: LegalDoc;
  ui: LegalUi;
  initialRegion: LegalRegion;
  /** This document's link label and path, and the other document's. */
  selfLabel: string;
  selfHref: string;
  otherLabel: string;
  otherHref: string;
  homeHref: string;
}

type Row = { id: string; title: string; local: boolean; blocks: LegalBlock[] };

export function LegalPage({
  doc,
  ui,
  initialRegion,
  selfLabel,
  selfHref,
  otherLabel,
  otherHref,
  homeHref,
}: LegalPageProps) {
  const [region, setRegion] = React.useState<LegalRegion>(initialRegion);
  const [open, setOpen] = React.useState<Set<string>>(() => new Set([doc.local.id]));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Desktop order: the numbered sections, local rights, contact. The phone
  // shows local rights first (CSS `order`), numbered 01 there.
  const rows: Row[] = [
    ...doc.sections.map((s) => ({ ...s, local: false })),
    { id: doc.local.id, title: doc.local.title, local: true, blocks: doc.local.blocks[region] },
    { ...doc.contact, local: false },
  ];
  const localIndex = doc.sections.length;
  const phoneNumber = (index: number) => (index === localIndex ? 1 : index < localIndex ? index + 2 : index + 1);

  const tabs = (size: 'lg' | 'sm') => (
    <div role="group" aria-label={doc.regionQuestion} className="flex flex-wrap gap-2">
      {LEGAL_REGIONS.map((id) => {
        const on = id === region;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => setRegion(id)}
            className={gcn(
              'rounded-full border px-[18px] font-semibold',
              size === 'lg' ? 'h-11 text-[14px] lg:text-[15px]' : 'h-11 text-[14px] lg:h-[38px]',
              on ? 'border-forest bg-forest text-[#F4F1EA]' : 'border-border bg-surface text-text',
            )}
          >
            {ui.regions[id]}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg text-text">
      <header className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-4 px-5 py-4 lg:px-8 lg:py-5">
        <Link href={homeHref} aria-label={ui.homeLabel} className="flex items-center gap-2 text-text no-underline lg:gap-2.5">
          <LogoMark width={30} height={30} className="block size-7 lg:size-[30px]" />
          <span className="font-display text-[22px] font-semibold lg:text-[24px]">Dygo</span>
        </Link>
        <div className="grow" />
        <nav aria-label={ui.navLabel} className="flex flex-wrap gap-1.5">
          <Link
            href={selfHref}
            aria-current="page"
            className="hidden rounded-[18px] border border-border bg-surface px-3.5 py-2 text-[14px] font-bold text-text no-underline lg:inline-flex"
          >
            {selfLabel}
          </Link>
          <Link
            href={otherHref}
            className="flex min-h-11 items-center rounded-full border border-border bg-surface px-3.5 text-[13px] font-semibold text-text no-underline lg:min-h-0 lg:rounded-[18px] lg:border-transparent lg:bg-transparent lg:py-2 lg:text-[14px] lg:text-[#44524A]"
          >
            {otherLabel}
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex max-w-[1120px] flex-col gap-4 px-5 pt-2 lg:gap-5 lg:px-8 lg:pt-7">
        <div className="flex flex-col gap-2 lg:gap-2.5">
          <span className="hidden text-[13px] font-bold uppercase tracking-[0.12em] text-muted-foreground lg:block">
            {ui.eyebrow}
          </span>
          <h1 className="m-0 font-display text-[34px] font-semibold leading-[1.1] lg:text-[clamp(36px,5vw,52px)] lg:leading-[1.08]">
            {doc.title}
          </h1>
          <p className="m-0 text-[13px] leading-[19px] text-muted-foreground lg:text-[15px]">
            <LegalText text={doc.updated} />
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-[18px] lg:gap-4 lg:rounded-[24px] lg:px-7 lg:py-6">
          <h2 className="m-0 text-[16px] font-bold text-forest lg:text-[18px]">{doc.shortTitle}</h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] lg:gap-x-8 lg:gap-y-3.5">
            {doc.short.map((line) => (
              <li key={line} className="flex gap-2.5 text-[15px] leading-[22px] lg:text-[16px] lg:leading-6">
                <SproutBullet />
                <span>
                  <LegalText text={line} />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 rounded-[20px] bg-[#EEF3EC] p-[18px] lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6 lg:gap-y-3.5 lg:rounded-[24px] lg:px-7 lg:py-[22px]">
          <span className="text-[15px] font-bold lg:text-[16px]">{doc.regionQuestion}</span>
          {tabs('lg')}
          <p className="m-0 text-[14px] leading-[21px] lg:basis-full lg:text-[15px] lg:leading-[23px]">
            <LegalText text={doc.regionNote[region]} />{' '}
            <a href={`#${doc.local.id}`} className="hidden font-bold text-forest lg:inline">
              {doc.seeLocal}
            </a>
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1120px] flex-wrap items-start gap-12 px-5 pb-8 pt-6 lg:px-8 lg:pb-[72px] lg:pt-12">
        <nav aria-label={ui.onThisPage} className="hidden max-w-[280px] flex-[1_1_240px] flex-col gap-2 lg:flex">
          <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{ui.onThisPage}</span>
          <ol className="m-0 list-none p-0">
            {rows.map((row, i) => (
              <li key={row.id}>
                <a href={`#${row.id}`} className="flex gap-2.5 py-1.5 text-[14px] leading-5 text-[#44524A] no-underline">
                  <span className="w-[22px] font-bold text-[#7FA487]">{i + 1}</span>
                  <span>{row.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-[999_1_560px] flex-col border-t border-border lg:gap-9 lg:border-t-0">
          {rows.map((row, i) => {
            const isOpen = open.has(row.id);
            const panelId = `${row.id}-panel`;
            return (
              <section
                key={row.id}
                id={row.id}
                className={gcn(
                  'flex scroll-mt-4 flex-col border-b border-border lg:gap-3.5 lg:border-b-0 lg:pt-2',
                  row.local && 'order-first lg:order-none',
                )}
              >
                <h2 className="m-0 hidden items-baseline gap-3 font-display text-[26px] font-semibold leading-[1.2] lg:flex">
                  <span className="font-body text-[15px] font-bold text-[#7FA487]">{pad(i + 1)}</span>
                  {row.title}
                </h2>
                <h2 className="m-0 lg:hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(row.id)}
                    className="flex min-h-14 w-full items-center gap-3 py-1.5 text-left"
                  >
                    <span className="w-[22px] text-[13px] font-bold text-[#7FA487]">{pad(phoneNumber(i))}</span>
                    <span className="flex-auto text-[16px] font-semibold leading-[22px]">{row.title}</span>
                    <Chevron open={isOpen} />
                  </button>
                </h2>
                <div
                  id={panelId}
                  className={gcn('flex-col gap-2.5 pb-[18px] pl-[34px] pt-0.5 lg:flex lg:gap-3 lg:p-0', isOpen ? 'flex' : 'hidden')}
                >
                  {row.local ? <div className="hidden lg:mb-1 lg:block">{tabs('sm')}</div> : null}
                  <div className={gcn('flex flex-col gap-2.5 lg:gap-3', row.local && 'lg:rounded-[20px] lg:border lg:border-border lg:bg-surface lg:px-6 lg:py-[22px]')}>
                    {row.blocks.map((block, k) => (
                      <Block key={k} block={block} />
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <footer className="bg-forest text-[#F4F1EA]">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-5 py-7 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8 lg:gap-y-4 lg:px-8 lg:py-9">
          <span className="flex items-center gap-2 lg:gap-2.5">
            <LogoMarkReversed />
            <span className="font-display text-[20px] font-semibold lg:text-[22px]">Dygo</span>
          </span>
          <div className="hidden grow lg:block" />
          <div className="flex gap-5 lg:gap-8">
            <Link href={selfHref} className="text-[14px] text-[#F4F1EA] underline">
              {selfLabel}
            </Link>
            <Link href={otherHref} className="text-[14px] text-[#F4F1EA] underline">
              {otherLabel}
            </Link>
          </div>
          <span className="text-[12px] text-[#BFD3C3] lg:basis-full lg:text-[13px]">
            <LegalText text={ui.copyright} />
          </span>
        </div>
      </footer>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

const BODY = 'm-0 text-[15px] leading-[23px] text-[#44524A] lg:text-[17px] lg:leading-7';

function Block({ block }: { block: LegalBlock }) {
  if (block.kind === 'p') {
    return (
      <p className={BODY}>
        <LegalText text={block.text} />
      </p>
    );
  }
  if (block.kind === 'ul') {
    return (
      <ul className="m-0 flex flex-col gap-1.5 pl-[22px]">
        {block.items.map((item) => (
          <li key={item} className={BODY}>
            <LegalText text={item} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <>
      {/* Phone: one card per row. */}
      <div className="flex flex-col gap-2.5 lg:hidden">
        {block.rows.map((row) => (
          <dl key={row[0]} className="m-0 flex flex-col gap-2.5 rounded-[14px] border border-border bg-surface p-3.5">
            {row.map((cell, c) => (
              <div key={c} className="flex flex-col gap-0.5">
                <dt className="text-[12px] font-bold uppercase tracking-[0.04em] text-muted-foreground">{block.head[c]}</dt>
                <dd className="m-0 text-[14px] leading-5 text-text">
                  <LegalText text={cell} />
                </dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
      {/* Desktop: a table that scrolls sideways if it ever gets too narrow. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              {block.head.map((cell) => (
                <th
                  key={cell}
                  scope="col"
                  className="border-b border-border bg-[#EEF3EC] px-3.5 py-3 text-left text-[13px] font-bold text-text"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={gcn(
                      'border-b border-border px-3.5 py-3 align-top text-[14px] leading-[21px]',
                      c === 0 ? 'text-text' : 'text-[#44524A]',
                    )}
                  >
                    <LegalText text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Renders `<b>…</b>` as bold and `[[…]]` as a highlighted placeholder; everything else is plain text. */
export function LegalText({ text }: { text: string }) {
  const parts = text.split(/(<b>.*?<\/b>|\[\[.*?\]\])/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('<b>')) return <b key={i}>{part.slice(3, -4)}</b>;
        if (part.startsWith('[[')) {
          return (
            <span key={i} data-placeholder="" className="rounded bg-[#FBEFD0] px-1 text-[#6B4A12]">
              {part.slice(2, -2)}
            </span>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

function SproutBullet() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="mt-[3px] shrink-0">
      <path d="M12 21 V11" stroke="#4F8A63" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 16 C7 16 4 12 5 8 C9 8 12 11 12 16 Z" fill="#9CC39A" />
      <path d="M12 13 C17 13 20 9 19 5 C15 5 12 8 12 13 Z" fill="#7FA487" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5E6A62"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={gcn('shrink-0 transition-transform duration-200', open && 'rotate-180')}
    >
      <path d="M6 9 L12 15 L18 9" />
    </svg>
  );
}

/** The Sprout mark reversed for the forest footer (brand sheet L1). */
function LogoMarkReversed() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="block size-[26px] lg:size-7">
      <circle cx="32" cy="32" r="32" fill="#F4F1EA" />
      <path d="M32 51 V27" stroke="#4F8A63" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 41 C22 41 15 34 17 25 C26 24 32 31 32 41 Z" fill="#4F8A63" />
      <path d="M32 33 C42 32 49 25 47 16 C38 16 32 23 32 33 Z" fill="#7FA487" />
    </svg>
  );
}
