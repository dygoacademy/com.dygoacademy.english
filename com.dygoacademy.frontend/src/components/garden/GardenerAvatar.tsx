import { gcn } from './cn';

/**
 * A gardener's initial in a coloured circle (canvas GR1, GR2, GR4, GR6).
 * The colour is a tone, not a meaning: live pages pick it from the user id
 * (`avatarTone`) so a person keeps the same colour everywhere.
 *
 * Sizes (canvas): 26 (GR1 stacks), 30 (GR2 stack), 28 (GR6 inviter) and
 * 40 (GR4 rows). Stacked avatars get a 2px white ring inside that size and
 * overlap by 8px.
 */
export type GardenerTone = 'forest' | 'flower' | 'due' | 'sprout' | 'gold' | 'mist' | 'more';

const TONES: Record<GardenerTone, string> = {
  forest: 'bg-garden-forest text-garden-gold-light',
  flower: 'bg-stage-flower text-garden-avatar-flower-text',
  due: 'bg-stage-due text-garden-avatar-due-text',
  sprout: 'bg-stage-sprout-leaf text-garden-avatar-sprout-text',
  gold: 'bg-garden-gold-light text-garden-avatar-gold-text',
  mist: 'bg-garden-on-forest-muted text-garden-forest',
  more: 'bg-garden-track text-garden-muted',
};

const PERSON_TONES: readonly GardenerTone[] = ['forest', 'flower', 'due', 'sprout', 'gold', 'mist'];

/** A stable tone for a user id (or any string). */
export function avatarTone(seed: string): GardenerTone {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PERSON_TONES[hash % PERSON_TONES.length];
}

/** First letter of a display name (or email), upper-cased; "?" when there is none. */
export function initialOf(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  return Array.from(trimmed)[0].toLocaleUpperCase();
}

export interface GardenerAvatarProps {
  text: string;
  tone: GardenerTone;
  size?: 26 | 28 | 30 | 40;
  /** White 2px ring (stacks). */
  ringed?: boolean;
  className?: string;
}

const SIZE: Record<NonNullable<GardenerAvatarProps['size']>, string> = {
  26: 'h-[26px] w-[26px] text-[11px]',
  28: 'h-7 w-7 text-[11px]',
  30: 'h-[30px] w-[30px] text-[11px]',
  40: 'h-10 w-10 text-[13px]',
};

export function GardenerAvatar({ text, tone, size = 26, ringed = false, className }: GardenerAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={gcn(
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        SIZE[size],
        ringed && 'border-2 border-garden-surface',
        TONES[tone],
        className,
      )}
    >
      {text}
    </span>
  );
}

/** Overlapping avatars (GR1, GR2). Decorative: pass the count in words nearby. */
export function AvatarStack({
  avatars,
  size = 26,
  className,
}: {
  avatars: ReadonlyArray<{ text: string; tone: GardenerTone }>;
  size?: 26 | 30;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={gcn('flex', className)}>
      {avatars.map((avatar, index) => (
        <GardenerAvatar
          key={index}
          {...avatar}
          size={size}
          ringed
          className={index > 0 ? '-ml-2' : undefined}
        />
      ))}
    </span>
  );
}
