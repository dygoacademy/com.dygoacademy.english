'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { useWordLookup } from '@/hooks/useWordLookup';

import { AudioButton } from './AudioButton';
import { BottomSheet } from './BottomSheet';
import { Chip } from './Chip';
import { gcn } from './cn';
import { SearchIcon, SeedIcon } from './icons';
import { partOfSpeechLabel } from './ReviewCard';
import { useAddWordForm } from './useAddWordForm';

/**
 * A7b Add word (2026-10-17; the sheet first shipped in UI-5 U5-4): a
 * garden bottom sheet from + on A7 and from A7c's "Plant here"
 * (`initialWord` filled in).
 *
 * - Type a word: once typing pauses, `GET /words/lookup` fills in its
 *   meaning (in the learner's meaning language), IPA, part of speech and
 *   level. A word Dygo hasn't seen yet says those come after planting.
 * - Pick a bed: chips for the beds the learner can add to (`beds`; this
 *   bed first). A bed that already holds the word says so and Plant is off.
 * - Plant: POST /words to the chosen bed (`id: null` = My words), then the
 *   planted state: the seed drops into the soil, "Plant another" / "Done".
 *
 * Header + board (canvas `AdultAddWord(Vi)`, 2026-10-17): "Plant a new
 * word" / "Type a word you met today" and the ✕ in both states; the word
 * card with level, play (only with audio) and the example (only when the
 * lexicon has one); the CTA names the bed. The field is focused after the
 * slide-in (`BottomSheet` `initialFocusRef`), not with `autoFocus`.
 *
 * `saveToMyWords` (2026-10-15): this bed can't be edited (a library bed,
 * or a group bed where the learner is READ), so the word goes to My words
 * and the button says so.
 */
export interface AddWordBed {
  /** null = My words before the learner has that bed (the API creates it). */
  id: string | null;
  title: string;
}

export interface AddWordSheetProps {
  topicId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bed name, on the button ("Plant in {bed}"). */
  topicTitle?: string;
  /** Fills the field each time the sheet opens (A7c "Plant here"). */
  initialWord?: string;
  /** The learner can't edit this bed: save to My words instead. */
  saveToMyWords?: boolean;
  /** Beds to plant in, the default first; chips show when there are 2+. */
  beds?: AddWordBed[];
  /** Open on the planted state (the reference page). */
  initialPlanted?: Planted;
}

interface Planted {
  word: string;
  bed: string;
}

const FIELD =
  'box-border flex h-[52px] items-center gap-2.5 rounded-2xl border-2 border-forest bg-surface px-[14px] text-muted-foreground';

const LABEL = 'text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground';

const BIG_BUTTON =
  'flex h-14 w-full items-center justify-center gap-2 rounded-[18px] px-4 text-[16px] font-bold transition-transform duration-press ease-garden active:translate-y-[2px]';

export function AddWordSheet({
  topicId,
  open,
  onOpenChange,
  topicTitle,
  initialWord,
  saveToMyWords = false,
  beds: bedsProp,
  initialPlanted,
}: AddWordSheetProps) {
  const t = useTranslations('screens.bed.addSheet');
  const pos = useTranslations('components.partOfSpeech');
  const inputId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const myWordsTitle = t('myWords');
  const beds = React.useMemo<AddWordBed[]>(
    () =>
      bedsProp && bedsProp.length > 0
        ? bedsProp
        : [
            saveToMyWords
              ? { id: null, title: myWordsTitle }
              : { id: topicId, title: topicTitle ?? '' },
          ],
    [bedsProp, saveToMyWords, myWordsTitle, topicId, topicTitle],
  );
  const [bedKey, setBedKey] = React.useState<string | null>(null);
  const bed = beds.find((b) => keyOf(b) === bedKey) ?? beds[0];
  const [planted, setPlanted] = React.useState<Planted | null>(initialPlanted ?? null);
  const submitted = React.useRef('');

  const toMyWords = bed.id === null;
  const form = useAddWordForm(
    bed.id,
    {
      fallbackError: t('error'),
      forbiddenError: t('forbidden'),
      duplicateError: toMyWords ? t('duplicateMyWords') : t('duplicate'),
      onAdded: () => setPlanted({ word: submitted.current, bed: bed.title }),
    },
    open ? initialWord : undefined,
  );
  const lookup = useWordLookup(planted ? '' : form.word);

  const { setWord } = form;
  React.useEffect(() => {
    if (open && initialWord) setWord(initialWord);
  }, [open, initialWord, setWord]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset();
      setPlanted(null);
      setBedKey(null);
    }
    onOpenChange(next);
  }

  function plantAnother() {
    setPlanted(null);
    setBedKey(keyOf(bed));
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
  }

  const typed = form.word.trim();
  const preview = typed && lookup.settled ? lookup.data : undefined;
  const alreadyHere = Boolean(bed.id && preview?.in_topic_ids.includes(bed.id));
  const ipa = preview?.found ? (preview.ipa_us ?? preview.ipa_uk) : null;
  const partOfSpeech = preview?.part_of_speech ? partOfSpeechLabel(preview.part_of_speech, pos) : null;
  // A translated meaning shows the English definition under it (VI board).
  const translated = Boolean(
    preview?.meaning && preview.definition_en && preview.meaning !== preview.definition_en,
  );

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={t('title')}
      description={t('subtitle')}
      initialFocusRef={inputRef}
      className="bg-bg"
      headerClassName="items-center px-4 pb-3"
      titleClassName="text-[22px] font-semibold leading-tight"
      descriptionClassName="mt-0 text-[13px]"
      bodyClassName="px-4 pb-6"
    >
      {planted ? (
        <div className="flex flex-col gap-3 pb-1">
          <div className="flex flex-col items-center gap-2 pb-1 pt-2 text-center">
            <PlantedArt />
            <p className="font-display text-[24px] font-semibold leading-tight text-text">
              {t.rich('planted', {
                word: () => <span lang="en">{planted.word}</span>,
              })}
            </p>
            <p className="text-[14px] leading-[1.4] text-muted-foreground">
              {t('plantedHint', { bed: planted.bed })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={plantAnother}
              autoFocus
              className={gcn(BIG_BUTTON, 'border border-border bg-surface text-forest')}
            >
              {t('plantAnother')}
            </button>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className={gcn(BIG_BUTTON, 'bg-forest text-white shadow-press-forest')}
            >
              {t('done')}
            </button>
          </div>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (alreadyHere) return;
            submitted.current = typed;
            void form.submit();
          }}
        >
          <label htmlFor={inputId} className={FIELD}>
            <SearchIcon width={20} height={20} aria-hidden="true" className="shrink-0" />
            <input
              id={inputId}
              ref={inputRef}
              lang="en"
              aria-label={t('label')}
              value={form.word}
              maxLength={100}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t('placeholder')}
              onChange={(event) => form.setWord(event.target.value)}
              className="min-w-0 flex-grow border-none bg-transparent text-[17px] text-text outline-none placeholder:text-placeholder"
            />
          </label>

          {!typed ? (
            <span className="px-1 text-[13px] text-muted-foreground">{t('hint')}</span>
          ) : (
            <div
              aria-live="polite"
              className="flex flex-col gap-2 rounded-[20px] border border-border bg-surface p-[14px]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex min-w-0 flex-grow flex-col">
                  <span
                    lang="en"
                    className="break-words font-display text-[28px] font-semibold leading-[1.1] text-text"
                  >
                    {typed}
                  </span>
                  {ipa || partOfSpeech ? (
                    <span className="text-[14px] text-muted-foreground">
                      {[ipa, partOfSpeech].filter(Boolean).join(' · ')}
                    </span>
                  ) : null}
                </span>
                {preview?.cefr_level ? (
                  <span className="shrink-0 rounded-[10px] bg-[#DDE7DA] px-2.5 py-1 text-[12px] font-bold text-forest">
                    {preview.cefr_level}
                  </span>
                ) : null}
                {preview?.audio_url ? (
                  <AudioButton src={preview.audio_url} playClassName="h-11 w-11 [&_svg]:h-5 [&_svg]:w-5" />
                ) : null}
              </div>
              {!preview ? (
                <span className="text-[13px] text-muted-foreground">
                  {lookup.isError ? t('hint') : t('lookingUp')}
                </span>
              ) : !preview.found ? (
                <span className="text-[13px] text-muted-foreground">{t('newWord')}</span>
              ) : (
                <>
                  {preview.meaning ? (
                    <span className="flex flex-col gap-0.5">
                      {translated ? (
                        <>
                          <span className="text-[16px] font-bold leading-[1.35] text-text">
                            {preview.meaning}
                          </span>
                          <span lang="en" className="text-[13px] text-muted-foreground">
                            {preview.definition_en}
                          </span>
                        </>
                      ) : (
                        <span lang="en" className="text-[15px] font-semibold leading-[1.35] text-text">
                          {preview.meaning}
                        </span>
                      )}
                    </span>
                  ) : null}
                  {preview.example ? (
                    <span
                      lang="en"
                      data-testid="addword-example"
                      className="rounded-xl bg-surface-sunken px-3 py-2.5 font-display text-[15px] leading-[1.45] text-[#2E3A33]"
                    >
                      {'“'}
                      <Highlight text={preview.example} word={preview.word} />
                      {'”'}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          )}

          {beds.length > 1 ? (
            <div role="group" aria-labelledby={`${inputId}-beds`} className="flex flex-col gap-3">
              <span id={`${inputId}-beds`} className={LABEL}>
                {t('plantIn')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {beds.map((b) => (
                  <Chip
                    key={keyOf(b)}
                    selected={keyOf(b) === keyOf(bed)}
                    onClick={() => setBedKey(keyOf(b))}
                    className="max-w-full overflow-hidden text-ellipsis text-[13px] font-bold"
                  >
                    {b.title}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}

          {alreadyHere ? (
            <p className="rounded-[14px] border border-gold-border bg-gold-soft px-[14px] py-2.5 text-[13px] text-gold-text">
              {t('alreadyIn', { topic: bed.title })}
            </p>
          ) : null}
          {form.error ? (
            <p role="alert" className="px-1 text-[13px] text-primary-text">
              {form.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!form.canSubmit || alreadyHere}
            className={gcn(
              BIG_BUTTON,
              'bg-primary text-white shadow-press-primary disabled:bg-disabled disabled:text-text disabled:shadow-none',
            )}
          >
            {form.busy ? (
              t('adding')
            ) : (
              <>
                <SeedIcon width={20} height={20} aria-hidden="true" />
                {t('submit', { bed: bed.title })}
              </>
            )}
          </button>
        </form>
      )}
    </BottomSheet>
  );
}

function keyOf(bed: AddWordBed): string {
  return bed.id ?? 'my-words';
}

/** The example sentence with the looked-up word in bold (as the board). */
function Highlight({ text, word }: { text: string; word: string }) {
  const w = word.trim();
  if (!w) return <>{text}</>;
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'i'));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <b key={i}>{part}</b> : <React.Fragment key={i}>{part}</React.Fragment>,
      )}
    </>
  );
}

/** A sprout in a mound of soil, sinking in (planted state, the board's `sink`). */
function PlantedArt() {
  return (
    <svg className="addword-sink" width="120" height="90" viewBox="0 0 120 90" aria-hidden="true">
      <ellipse cx="60" cy="78" rx="50" ry="10" fill="#8A6A4F" />
      <ellipse cx="60" cy="72" rx="12" ry="8" fill="#6B5040" />
      <path
        d="M60 64 C60 52 66 46 74 44"
        stroke="#7FA487"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M74 44 C82 42 85 34 82 28 C74 30 71 37 74 44 Z" fill="#9CC39A" />
    </svg>
  );
}
