'use client';

import { useTranslations } from 'next-intl';

import type { GroupRole } from '@/types';

import { gcn } from '../cn';
import { CreateGardenBody } from '../CreateGardenSheet';
import { GroupSheetFrame, SheetBackdrop } from '../GroupSheet';
import { InviteSheetBody } from '../InviteSheet';
import { SCREEN_CLASSES } from './GardenTabBar';

/**
 * GR5 (invite) and GR7 (start a garden) as the canvas draws them: the
 * sheet over a greyed-out page. For the reference pages only; live pages
 * open the same bodies in `GroupSheet` over the real page.
 */
const FRAME = gcn(SCREEN_CLASSES, 'relative h-screen-dvh overflow-hidden');

export function InviteSheetScreen({
  groupName,
  role,
  expiresDays,
  maxUses,
  link,
  closeHref,
}: {
  groupName: string;
  role: GroupRole;
  expiresDays: number;
  maxUses: number;
  link: string;
  closeHref: string;
}) {
  const t = useTranslations('screens.groups.invite');
  const garden = useTranslations('screens.groups.garden');
  return (
    <div className={FRAME}>
      <SheetBackdrop eyebrow={groupName} title={garden('gardeners')} />
      <GroupSheetFrame title={t('title')} subtitle={t('subtitle', { group: groupName })} closeHref={closeHref}>
        <InviteSheetBody
          role={role}
          expires={t('inDays', { count: expiresDays })}
          uses={t('times', { count: maxUses })}
          link={link}
        />
      </GroupSheetFrame>
    </div>
  );
}

export function CreateGardenSheetScreen({
  name,
  gardens,
  gardeners,
  closeHref,
}: {
  name: string;
  gardens: number;
  gardeners: number;
  closeHref: string;
}) {
  const t = useTranslations('screens.groups.create');
  const list = useTranslations('screens.groups.list');
  return (
    <div className={FRAME}>
      <SheetBackdrop eyebrow={list('summary', { gardens, gardeners })} title={list('title')} />
      <GroupSheetFrame title={t('title')} subtitle={t('subtitle')} closeHref={closeHref}>
        <CreateGardenBody
          name={name}
          about=""
          open={false}
          aboutPlaceholder={t('aboutPlaceholder')}
          submitLabel={t('submit')}
          note={t('note')}
        />
      </GroupSheetFrame>
    </div>
  );
}
