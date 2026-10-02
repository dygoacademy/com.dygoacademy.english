import * as React from 'react';

import { gcn } from './cn';

/**
 * The garden's "nothing here yet" message (UI-3 U3-1), shared by Topics,
 * Topic bed and Groups.
 *
 * - Without a `title`: one muted, centred line, the quiet style used
 *   inside lists (Topics with no beds, a stage filter with no words).
 * - With a `title`: a bordered card with a bold title over the body
 *   (Groups with no shared gardens).
 *
 * `as="li"` for use inside a `<ul>`. The markup matches the inline
 * versions it replaced, so screens look exactly as before.
 */
export interface EmptyStateProps {
  body: React.ReactNode;
  title?: React.ReactNode;
  /** Optional call to action under the body (card style only). */
  action?: React.ReactNode;
  as?: 'div' | 'p' | 'li';
  className?: string;
}

export function EmptyState({ body, title, action, as = 'div', className }: EmptyStateProps) {
  if (title === undefined) {
    const Tag = as;
    return (
      <Tag className={gcn('py-6 text-center text-[13px] text-muted-foreground', className)}>{body}</Tag>
    );
  }
  const Tag = as === 'p' ? 'div' : as;
  return (
    <Tag
      className={gcn(
        'flex flex-col gap-1 rounded-[20px] border border-border bg-surface px-4 py-5 text-center',
        className,
      )}
    >
      <span className="text-[16px] font-bold">{title}</span>
      <span className="text-[13px] text-muted-foreground">{body}</span>
      {action ? <div className="mt-2 flex justify-center">{action}</div> : null}
    </Tag>
  );
}
