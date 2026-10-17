'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { AddWordSheet } from '@/components/garden/AddWordSheet';
import { ADD_WORD } from '@/components/garden/screens/fixtures';
import type { AppLocale } from '@/i18n/config';

/**
 * A7b Add word (canvas `AdultAddWord(Vi)`, 2026-10-17): the sheet open
 * over the board's plain bed (title and grey blocks, a placeholder for
 * A7), "resilient" looked up, Environment picked. The lookup is put in the
 * query cache before the sheet mounts, so it shows without a request.
 */
export function AddWordReferenceScreen({
  locale,
  planted,
}: {
  locale: AppLocale;
  planted: boolean;
}) {
  const queryClient = useQueryClient();
  const sample = locale === 'vi-VN' ? ADD_WORD['vi-VN'] : ADD_WORD['en-US'];
  React.useState(() =>
    queryClient.setQueryData(['words', 'lookup', ADD_WORD.word], {
      ...ADD_WORD.lookup,
      meaning: sample.meaning,
    }),
  );
  const beds = sample.beds.map((title, i) => ({ id: `bed-${i}`, title }));

  return (
    <div className="relative h-[844px] overflow-hidden bg-bg">
      <div aria-hidden="true" className="flex flex-col gap-[14px] px-4 py-5">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-full bg-surface" />
          <span className="font-display text-[26px] font-semibold">{sample.bed}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-[92px] rounded-[18px] bg-surface" />
          ))}
        </div>
        <span className="h-[52px] rounded-2xl bg-[#E9C9B9]" />
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-[60px] rounded-2xl bg-surface" />
        ))}
      </div>
      <AddWordSheet
        open
        onOpenChange={() => {}}
        topicId={beds[0].id}
        topicTitle={sample.bed}
        beds={beds}
        initialWord={ADD_WORD.word}
        initialPlanted={planted ? { word: ADD_WORD.word, bed: sample.bed } : undefined}
      />
    </div>
  );
}
