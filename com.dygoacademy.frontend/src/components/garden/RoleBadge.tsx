import { useTranslations } from 'next-intl';

import type { GroupRole } from '@/types';

import { gcn } from './cn';

/**
 * The caller's role in a shared garden (canvas GR1): Admin on forest,
 * Editor on sage, Viewer on the page colour. Plain role names (plan
 * decision 11): Admin / Editor / Viewer for ADMIN / WRITE / READ.
 */
const STYLE: Record<GroupRole, string> = {
  ADMIN: 'bg-garden-forest text-white',
  WRITE: 'bg-garden-on-forest-muted text-garden-forest',
  READ: 'bg-garden-bg text-garden-muted',
};

export function RoleBadge({ role, className }: { role: GroupRole; className?: string }) {
  const t = useTranslations('components.groups.roles');
  return (
    <span
      className={gcn(
        'shrink-0 rounded-[10px] px-[9px] py-[3px] text-[12px] font-bold',
        STYLE[role],
        className,
      )}
    >
      {t(role)}
    </span>
  );
}
