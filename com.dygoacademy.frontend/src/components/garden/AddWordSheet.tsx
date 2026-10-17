'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { useWordLookup } from '@/hooks/useWordLookup';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Chip } from './Chip';
import { gcn } from './cn';
import { SeedIcon } from './icons';
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
 * `saveToMyWords` (2026-10-15): this bed can't be edited (a library bed,
 * or a group bed where the learner is READ), so the word goes to My words;
 * without other beds the subtitle says so.
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
  /** Bed name, shown under the title. */
  topicTitle?: string;
  /** Fills the field each time the sheet opens (A7c "Plant here"). */
  initialWord?: string;
  /** The learner can't edit this bed: save to My words instead. */
  saveToMyWords?: boolean;
  /** Beds to plant in, the default first; chips show when there are 2+. */
  beds?: AddWordBed[];
}

const FIELD =
  'box-border min-h-12 w-full rounded-[14px] border bg-surface px-[14px] py-3 text-[17px] leading-[1.4] text-text outline-none placeholder:text-placeholder focus:border-forest';

const LABEL = 'text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground';

const SEED_TILE =
  'box-border flex h-10 w-10 shrink-0 items-center justify-center rounded-tile border-[1.5px] border-dashed border-locked-border text-gold-text';

export function AddWordSheet({
  topicId,
  open,
  onOpenChange,
  topicTitle,
  initialWord,
  saveToMyWords = false,
  beds: bedsProp,
}: AddWordSheetProps) {
  const t = useTranslations('screens.bed.addSheet');
  const inputId = React.useId();
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
  const [planted, setPlanted] = React.useState<{ word: string; bed: string } | null>(null);
  const submitted = React.useRef('');

  const toMyWords = bed.id === null;
  const form = useAddWordForm(bed.id, {
    fallbackError: t('error'),
    forbiddenError: t('forbidden'),
    duplicateError: toMyWords ? t('duplicateMyWords') : t('duplicate'),
    onAdded: () => setPlanted({ word: submitted.current, bed: bed.title }),
  });
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
  }

  const typed = form.word.trim();
  const preview = typed && lookup.settled ? lookup.data : undefined;
  const alreadyHere = Boolean(bed.id && preview?.in_topic_ids.includes(bed.id));

  const description = planted
    ? undefined
    : beds.length > 1
      ? undefined
      : toMyWords
        ? t('descriptionMyWords')
        : bed.title
          ? t('description', { topic: bed.title })
          : undefined;

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={planted ? t('plantedTitle') : t('title')}
      description={description}
    >
      {planted ? (
        <div className="flex flex-col items-center gap-3 pb-1 text-center">
          <PlantedArt />
          <p className="text-[20px] font-semibold text-text">
            {t.rich('planted', {
              word: () => (
                <span lang="en" className="font-display">
                  {planted.word}
                </span>
              ),
              bed: planted.bed,
            })}
          </p>
          <p className="text-[14px] text-muted-foreground">{t('plantedHint')}</p>
          <div className="mt-2 flex w-full flex-col gap-2.5">
            <Button type="button" variant="primary" onClick={plantAnother} autoFocus>
              {t('plantAnother')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
              {t('done')}
            </Button>
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
          <label htmlFor={inputId} className="flex flex-col gap-1.5">
            <span className={LABEL}>{t('label')}</span>
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

          {!typed ? (
            <span className="px-1 text-[13px] text-muted-foreground">{t('hint')}</span>
          ) : (
            <div
              aria-live="polite"
              className="flex min-h-[72px] items-start gap-2.5 rounded-[20px] border border-border bg-surface px-[14px] py-3"
            >
              <span aria-hidden="true" className={SEED_TILE}>
                <SeedIcon width={20} height={20} />
              </span>
              <span className="flex min-w-0 flex-grow flex-col gap-0.5">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span
                    lang="en"
                    className="break-words font-display text-[20px] font-semibold leading-tight text-text"
                  >
                    {typed}
                  </span>
                  {preview?.found && (preview.ipa_us ?? preview.ipa_uk) ? (
                    <span className="text-[14px] text-muted-foreground">
                      {preview.ipa_us ?? preview.ipa_uk}
                    </span>
                  ) : null}
                </span>
                {!preview ? (
                  <span className="text-[13px] text-muted-foreground">
                    {lookup.isError ? t('hint') : t('lookingUp')}
                  </span>
                ) : preview.found ? (
                  <>
                    {preview.part_of_speech || preview.cefr_level ? (
                      <span className="text-[12px] font-semibold text-muted-foreground">
                        {[preview.part_of_speech, preview.cefr_level].filter(Boolean).join(' · ')}
                      </span>
                    ) : null}
                    {preview.meaning ? (
                      <span className="text-[15px] leading-[1.4] text-text">{preview.meaning}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-[13px] text-muted-foreground">{t('newWord')}</span>
                )}
              </span>
            </div>
          )}

          {beds.length > 1 ? (
            <div role="group" aria-labelledby={`${inputId}-beds`} className="flex flex-col gap-2">
              <span id={`${inputId}-beds`} className={LABEL}>
                {t('plantIn')}
              </span>
              <div className="flex flex-wrap gap-2">
                {beds.map((b) => (
                  <Chip
                    key={keyOf(b)}
                    selected={keyOf(b) === keyOf(bed)}
                    onClick={() => setBedKey(keyOf(b))}
                    className="max-w-full overflow-hidden text-ellipsis"
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
            className="flex h-14 items-center justify-center rounded-[18px] bg-primary text-[17px] font-bold text-white shadow-press-primary transition-transform duration-press ease-garden active:translate-y-[2px] disabled:bg-disabled disabled:text-text disabled:shadow-none"
          >
            {form.busy ? t('adding') : t('submit')}
          </button>
        </form>
      )}
    </BottomSheet>
  );
}

function keyOf(bed: AddWordBed): string {
  return bed.id ?? 'my-words';
}

/** The seed dropping into a mound of soil (planted state). */
function PlantedArt() {
  return (
    <svg width="120" height="84" viewBox="0 0 120 84" aria-hidden="true">
      <g className="addword-seed">
        <ellipse cx="60" cy="50" rx="7" ry="5" fill="#9A6E14" />
        <path
          d="M60 46 C60 40 63 36 68 34"
          fill="none"
          stroke="#3E7F5A"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
      <path className="addword-soil" d="M14 74 C30 52 90 52 106 74 Z" fill="#B98A5A" />
      <path d="M8 74 H112" stroke="#8C6440" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
