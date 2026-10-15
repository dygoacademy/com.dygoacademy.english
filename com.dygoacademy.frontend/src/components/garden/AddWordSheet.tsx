'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { BottomSheet } from './BottomSheet';
import { gcn } from './cn';
import { Toast } from './Toast';
import { useAddWordForm } from './useAddWordForm';

/**
 * "Add word" on a topic bed (A7, UI-5 U5-4): a garden bottom sheet with
 * one word field, on the same form logic as the classic add-word modal
 * (`useAddWordForm`). IPA, audio and examples are filled in afterwards
 * by enrichment; the bed refetches when the word is added. A7c's "Plant
 * here" opens it with `initialWord` filled in.
 *
 * `saveToMyWords` (2026-10-15): on a bed the learner can't edit (a library
 * bed, or a group bed where they're READ), the word is saved to their My
 * words bed instead, the subtitle says so, and a toast confirms it.
 */
export interface AddWordSheetProps {
  topicId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bed name, shown under the title. */
  topicTitle?: string;
  /** Fills the field each time the sheet opens (A7c "Plant here"). */
  initialWord?: string;
  /** The learner can't edit this bed: save to My words instead. */
  saveToMyWords?: boolean;
}

const FIELD =
  'box-border min-h-12 w-full rounded-[14px] border bg-surface px-[14px] py-3 text-[17px] leading-[1.4] text-text outline-none placeholder:text-placeholder focus:border-forest';

export function AddWordSheet({
  topicId,
  open,
  onOpenChange,
  topicTitle,
  initialWord,
  saveToMyWords = false,
}: AddWordSheetProps) {
  const t = useTranslations('screens.bed.addSheet');
  const inputId = React.useId();
  const [savedToast, setSavedToast] = React.useState(false);
  const form = useAddWordForm(saveToMyWords ? null : topicId, {
    fallbackError: t('error'),
    forbiddenError: t('forbidden'),
    duplicateError: saveToMyWords ? t('duplicateMyWords') : t('duplicate'),
    onAdded: () => {
      onOpenChange(false);
      if (saveToMyWords) setSavedToast(true);
    },
  });

  const { setWord } = form;
  React.useEffect(() => {
    if (open && initialWord) setWord(initialWord);
  }, [open, initialWord, setWord]);

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  const description = saveToMyWords
    ? t('descriptionMyWords')
    : topicTitle
      ? t('description', { topic: topicTitle })
      : undefined;

  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={handleOpenChange}
        title={t('title')}
        description={description}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void form.submit();
          }}
        >
          <label htmlFor={inputId} className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground">
              {t('label')}
            </span>
            <input
              id={inputId}
              autoFocus
              value={form.word}
              maxLength={100}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t('placeholder')}
              onChange={(event) => form.setWord(event.target.value)}
              className={gcn(FIELD, form.word ? 'border-forest' : 'border-border')}
            />
          </label>
          <span className="px-1 text-[13px] text-muted-foreground">{t('hint')}</span>
          {form.error ? (
            <p role="alert" className="px-1 text-[13px] text-primary-text">
              {form.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!form.canSubmit}
            className="flex h-14 items-center justify-center rounded-[18px] bg-primary text-[17px] font-bold text-white shadow-press-primary transition-transform duration-press ease-garden active:translate-y-[2px] disabled:bg-disabled disabled:text-text disabled:shadow-none"
          >
            {form.busy ? t('adding') : t('submit')}
          </button>
        </form>
      </BottomSheet>
      <Toast
        open={savedToast}
        onOpenChange={setSavedToast}
        message={t('addedToMyWords')}
        variant="success"
      />
    </>
  );
}
