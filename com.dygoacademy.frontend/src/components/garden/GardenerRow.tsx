'use client';

import { useTranslations } from 'next-intl';

import type { GroupRole } from '@/types';

import { gcn } from './cn';
import { GardenerAvatar, type GardenerTone } from './GardenerAvatar';
import { ChevronDownIcon } from './groupArt';

/**
 * One gardener in "Tend the garden → Gardeners" (canvas GR4): initial,
 * name ("(you)" on your own row), when they joined, and their role as a
 * picker. Only admins see this list (plan decision 10: no per-member
 * progress, only name, role and join date, which the roster already
 * shows in the classic UI).
 *
 * The picker is a native <select> laid invisibly over the canvas button,
 * so it works with VoiceOver, keyboards and the iOS wheel without a custom
 * menu. `onChange` gets a role or 'remove'. Without `onChange` (or with
 * `locked`) the button is shown but can't be changed.
 */
export const GROUP_ROLES: readonly GroupRole[] = ['ADMIN', 'WRITE', 'READ'];

export interface GardenerRowProps {
  name: string;
  initial: string;
  tone: GardenerTone;
  isYou?: boolean;
  /** Pre-formatted, e.g. "Joined 2 Sep". */
  joined: string;
  role: GroupRole;
  onChange?: (next: GroupRole | 'remove') => void;
  /** Can't be changed (e.g. you are the garden's only admin). */
  locked?: boolean;
  /** No bottom divider (last row). */
  last?: boolean;
}

export function GardenerRow({
  name,
  initial,
  tone,
  isYou = false,
  joined,
  role,
  onChange,
  locked = false,
  last = false,
}: GardenerRowProps) {
  const t = useTranslations('components.groups');
  const disabled = locked || !onChange;
  return (
    <li
      className={gcn(
        'flex items-center gap-3 px-[14px] py-2.5',
        !last && 'border-b border-divider',
      )}
    >
      <GardenerAvatar text={initial} tone={tone} size={40} />
      <div className="flex min-w-0 flex-grow flex-col">
        <span className="text-[15px] font-bold">
          {name}
          {isYou ? (
            <>
              {' '}
              <span className="text-[12px] font-semibold text-muted-foreground">{t('you')}</span>
            </>
          ) : null}
        </span>
        <span className="text-[12px] text-muted-foreground">{joined}</span>
      </div>
      <span className="relative shrink-0">
        <span
          aria-hidden="true"
          className="flex h-9 items-center gap-1 rounded-[12px] border border-border bg-surface pl-2.5 pr-2 text-[13px] font-bold text-forest"
        >
          {t(`roles.${role}`)}
          <ChevronDownIcon width={14} height={14} />
        </span>
        <select
          aria-label={t('changeRole', { name })}
          value={role}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value as GroupRole | 'remove')}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-default"
        >
          {GROUP_ROLES.map((option) => (
            <option key={option} value={option}>
              {t(`roles.${option}`)}
            </option>
          ))}
          {isYou ? null : <option value="remove">{t('remove')}</option>}
        </select>
      </span>
    </li>
  );
}
