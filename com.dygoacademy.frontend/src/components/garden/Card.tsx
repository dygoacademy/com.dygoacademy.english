import * as React from 'react';
import Link from 'next/link';

import { gcn } from './cn';

/**
 * Card (design system §11): surface, 1px border, radius-lg (20), padding
 * 16. Pass `href` for a tappable card — the whole card becomes one link
 * (§15: real <a>, never onClick on a div), with a hover state for iPad
 * trackpads.
 */
type CardBaseProps = { className?: string; children: React.ReactNode };
export type CardProps =
  | (CardBaseProps & React.HTMLAttributes<HTMLDivElement> & { href?: undefined })
  | (CardBaseProps &
      Omit<React.ComponentProps<typeof Link>, 'className' | 'children'> & { href: string });

const base =
  'block rounded-card border border-garden-border bg-garden-surface p-4 text-garden-text';

export function Card(props: CardProps) {
  if (props.href !== undefined) {
    const { className, children, ...linkProps } = props;
    return (
      <Link
        {...linkProps}
        className={gcn(
          base,
          'transition-colors duration-quick ease-garden hover:border-garden-muted active:bg-garden-surface-sunken',
          className,
        )}
      >
        {children}
      </Link>
    );
  }
  const { className, children, ...divProps } = props;
  return (
    <div {...divProps} className={gcn(base, className)}>
      {children}
    </div>
  );
}
