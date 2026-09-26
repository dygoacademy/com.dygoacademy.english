'use client';

import { useTranslations } from 'next-intl';

import type { GroupRole } from '@/types';

import { gcn } from './cn';
import { LockIcon } from './icons';

/**
 * Body of the invite sheet (canvas GR5): the role new gardeners get
 * (radio group), what that role can do, how long the link lasts and how
 * many times it can be used, the link itself, the "shown only once"
 * notice, and Copy / Share.
 *
 * The raw token exists only in the create-invite response (only its hash
 * is stored), so the live sheet mints the link on the first Copy or Share
 * and shows it from then on; before that `link` is null and the box shows
 * `linkPlaceholder`. Changing the role or limits after that starts a new
 * link. The tiles are buttons that step through the presets when
 * `onStepExpiry` / `onStepUses` are given.
 */
export const INVITE_ROLE_ORDER: readonly GroupRole[] = ['READ', 'WRITE', 'ADMIN'];

export interface InviteSheetBodyProps {
  role: GroupRole;
  onRoleChange?: (role: GroupRole) => void;
  /** "In 7 days" / "Never". */
  expires: string;
  /** "20 times" / "No limit". */
  uses: string;
  onStepExpiry?: () => void;
  onStepUses?: () => void;
  /** The full link without the scheme, or null before it's made. */
  link: string | null;
  linkPlaceholder?: string;
  onCopy?: () => void;
  onShare?: () => void;
  busy?: boolean;
  /** One line under the buttons: "Link copied", an error… (live only). */
  status?: string | null;
}

const TILE =
  'flex flex-col rounded-control border border-garden-border bg-garden-surface px-3 py-2.5 text-left';
const ACTION =
  'h-[54px] rounded-control text-[16px] font-bold text-white transition-transform duration-press ease-garden active:translate-y-[2px] disabled:opacity-60';

export function InviteSheetBody({
  role,
  onRoleChange,
  expires,
  uses,
  onStepExpiry,
  onStepUses,
  link,
  linkPlaceholder,
  onCopy,
  onShare,
  busy = false,
  status,
}: InviteSheetBodyProps) {
  const t = useTranslations('components.groups');
  const s = useTranslations('screens.groups.invite');

  const tile = (label: string, value: string, onStep?: () => void) =>
    onStep ? (
      <button
        type="button"
        onClick={onStep}
        aria-label={s('stepLabel', { label, value })}
        className={TILE}
      >
        <span className="text-[12px] text-garden-muted">{label}</span>
        <span className="text-[15px] font-bold">{value}</span>
      </button>
    ) : (
      <div className={TILE}>
        <span className="text-[12px] text-garden-muted">{label}</span>
        <span className="text-[15px] font-bold">{value}</span>
      </div>
    );

  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-bold uppercase tracking-[.08em] text-garden-muted">
          {s('joinAs')}
        </span>
        <div
          role="radiogroup"
          aria-label={s('roleLabel')}
          className="grid grid-cols-3 gap-1 rounded-[14px] bg-garden-track p-1"
        >
          {INVITE_ROLE_ORDER.map((option) => {
            const checked = option === role;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onRoleChange?.(option)}
                className={gcn(
                  'h-10 rounded-[11px] text-[14px] font-bold',
                  checked
                    ? 'bg-garden-surface text-garden-forest shadow-[0_1px_0_var(--color-border)]'
                    : 'bg-transparent text-garden-muted',
                )}
              >
                {t(`roles.${option}`)}
              </button>
            );
          })}
        </div>
        <span className="text-[13px] text-garden-muted">{t(`roleHints.${role}`)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {tile(s('expires'), expires, onStepExpiry)}
        {tile(s('uses'), uses, onStepUses)}
      </div>

      <div className="flex items-center gap-2.5 rounded-control border border-garden-border bg-garden-surface p-3">
        <span
          className={gcn(
            'flex-grow overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-semibold',
            link ? 'text-garden-forest' : 'text-garden-placeholder',
          )}
        >
          {link ?? linkPlaceholder}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-[12px] bg-garden-gold-soft px-2.5 py-2 text-[12px] text-garden-gold-soft-text">
        <LockIcon width={16} height={16} />
        <span>{s('onceNotice')}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCopy}
          disabled={busy}
          className={gcn(ACTION, 'bg-garden-forest shadow-press-forest')}
        >
          {s('copy')}
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={busy}
          className={gcn(ACTION, 'bg-garden-primary shadow-press-primary')}
        >
          {s('share')}
        </button>
      </div>
      {status ? (
        <p role="status" className="-mt-1 text-center text-[13px] text-garden-muted">
          {status}
        </p>
      ) : null}
    </>
  );
}
