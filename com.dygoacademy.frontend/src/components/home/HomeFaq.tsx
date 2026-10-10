import * as React from 'react';
import { useTranslations } from 'next-intl';

import { gcn } from '@/components/garden/cn';

import { AddWordPlusIcon } from './homeArt';

/** The eight questions in reading order (phone column, JSON-LD), as on the Landing Page boards (2026-10-10). */
export const FAQ_KEYS = ['free', 'who', 'english', 'speaking', 'phone', 'time', 'ownWords', 'kids'] as const;
export type FaqKey = (typeof FAQ_KEYS)[number];

type FaqMessageKey = `items.${FaqKey}.q` | `items.${FaqKey}.a`;

/**
 * `FAQPage` structured data (schema.org) from the same messages as the
 * section, so every locale gets its own 8 Q&As. `t` is the
 * `screens.home.public.faq` translator (server or client).
 */
export function faqJsonLd(t: (key: FaqMessageKey) => string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_KEYS.map((key) => ({
      '@type': 'Question',
      name: t(`items.${key}.q`),
      acceptedAnswer: { '@type': 'Answer', text: t(`items.${key}.a`) },
    })),
  };
}

/**
 * Home page HP-9 · "Common questions" (canvas page "Home page v2",
 * `reference/H3-home-v2-phone`, `H4-home-v2-desktop`, each also `-vi`).
 * Native `<details>/<summary>`, the first one open like the boards, more
 * than one may be open. Phone: one column in question order. Desktop: two
 * independent columns (five left, three right, as on H4); the
 * column wrappers are `display: contents` on the phone and `order` puts
 * the questions back in reading order there.
 */
export function HomeFaq() {
  const t = useTranslations('screens.home.public.faq');
  // Desktop columns exactly as on the H4 board: five left, three right.
  const columns: FaqKey[][] = [
    ['free', 'english', 'time', 'speaking', 'kids'],
    ['who', 'phone', 'ownWords'],
  ];

  return (
    <div className="flex flex-col gap-2.5 home-lg:grid home-lg:grid-cols-2 home-lg:items-start home-lg:gap-3">
      {columns.map((keys, column) => (
        <div key={column} className="contents home-lg:flex home-lg:flex-col home-lg:gap-3">
          {keys.map((key) => {
            const index = FAQ_KEYS.indexOf(key);
            return (
              <details
                key={key}
                open={index === 0}
                style={{ order: index }}
                className="group rounded-[18px] border border-border bg-surface px-4 home-lg:!order-none home-lg:px-[18px]"
              >
                <summary className="box-border flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[16px] font-bold home-lg:text-[17px] [&::-webkit-details-marker]:hidden">
                  {t(`items.${key}.q`)}
                  <span
                    aria-hidden="true"
                    className={gcn(
                      'flex size-7 shrink-0 items-center justify-center rounded-[14px] bg-bg text-forest',
                      'transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none',
                    )}
                  >
                    <AddWordPlusIcon width={18} height={18} />
                  </span>
                </summary>
                <p className="m-0 mb-4 text-[15px] leading-[1.55] text-[#44524A] home-lg:text-[16px]">
                  {t(`items.${key}.a`)}
                </p>
              </details>
            );
          })}
        </div>
      ))}
    </div>
  );
}
