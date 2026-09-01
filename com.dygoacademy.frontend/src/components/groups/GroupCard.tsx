import Link from 'next/link';

import { ROUTES } from '@/constants/routes';
import type { GroupSummary } from '@/types';

/** One row on the "Your Groups" dashboard (wireframe 3a). */
export function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <Link
      href={ROUTES.groupDetail(group.id)}
      className="flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm hover:bg-muted/40"
    >
      <div className="flex flex-col">
        <span>{group.name}</span>
        {group.description && (
          <span className="text-xs text-muted-foreground">{group.description}</span>
        )}
      </div>
      <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {group.role}
      </span>
    </Link>
  );
}
