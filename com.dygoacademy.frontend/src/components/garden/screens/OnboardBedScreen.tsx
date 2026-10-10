import * as React from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '../Button';
import { gcn } from '../cn';
import { CheckIcon, SeedPackIcon } from '../icons';
import { OnboardingShell } from '../OnboardingShell';
import { SaveError } from './OnboardLevelScreen';

/**
 * OB3 · First topic (board `OnboardBed`, not in the repo yet). Props only.
 *
 * The real topics (GET /topics) as seed packets, two per row; the one
 * picked becomes the first bed. With no topics at all the screen says so
 * and Continue goes on without one.
 */
export interface OnboardBedPacket {
  id: string;
  title: string;
  words: number;
  /** e.g. "B1–B2"; null when the words have no level yet. */
  level: string | null;
}

export interface OnboardBedScreenProps {
  packets: readonly OnboardBedPacket[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
  back: string;
  saving?: boolean;
  error?: boolean;
}

export function OnboardBedScreen({
  packets,
  selectedId,
  onSelect,
  onContinue,
  back,
  saving = false,
  error = false,
}: OnboardBedScreenProps) {
  const t = useTranslations('screens.onboarding');
  const empty = packets.length === 0;
  return (
    <OnboardingShell
      step={3}
      back={back}
      title={t('bed.title')}
      subtitle={t('bed.subtitle')}
      footer={
        <>
          {error ? <SaveError /> : null}
          <Button
            variant="primary" className="md:max-w-none"
            onClick={onContinue}
            disabled={!empty && !selectedId}
            loading={saving}
          >
            {empty ? t('continue') : t('bed.plant')}
          </Button>
        </>
      }
    >
      {empty ? (
        <p className="rounded-card border border-dashed border-dashed-line bg-surface px-4 py-6 text-center text-[15px] text-muted-foreground">
          {t('bed.empty')}
        </p>
      ) : (
        <div role="radiogroup" aria-label={t('bed.title')} className="grid grid-cols-2 gap-3">
          {packets.map((packet) => {
            const selected = packet.id === selectedId;
            return (
              <button
                key={packet.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(packet.id)}
                className={gcn(
                  'relative flex min-h-[148px] flex-col items-start gap-2 rounded-card border bg-gold-wash p-3 text-left',
                  'transition-colors duration-quick ease-garden',
                  selected ? 'border-2 border-forest' : 'border-gold-border',
                )}
              >
                {/* The packet's folded top edge. */}
                <span aria-hidden="true" className="absolute inset-x-3 top-0 h-1.5 rounded-b-full bg-gold-border" />
                <span className="mt-2 flex h-10 w-10 items-center justify-center rounded-tile bg-surface">
                  <SeedPackIcon width={26} height={26} />
                </span>
                <span className="line-clamp-2 font-display text-[17px] font-semibold leading-[1.2] text-text">
                  {packet.title}
                </span>
                <span className="mt-auto text-[13px] text-gold-text">
                  {t('bed.words', { count: packet.words })}
                  {packet.level ? ` · ${packet.level}` : ''}
                </span>
                {selected ? (
                  <span
                    aria-hidden="true"
                    className="bloom absolute right-2 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-forest text-white"
                  >
                    <CheckIcon width={14} height={14} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </OnboardingShell>
  );
}
