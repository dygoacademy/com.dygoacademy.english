import * as React from 'react';
import Link from 'next/link';

import { gcn } from './cn';
import { ChevronRightIcon } from './icons';

/**
 * Settings list (canvas A8): a white card of 52px rows (+1px divider), 14px side padding,
 * a 20px forest icon, the label (15px semibold), the value (14px muted)
 * and a chevron or a control. Rows are separated by a light divider.
 */
export function SettingsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={gcn(
        'flex flex-col rounded-card border border-border bg-surface [&>*:last-child]:border-b-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsRow({
  icon,
  label,
  value,
  href,
  control,
  chevron = false,
  labelId,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  /** Makes the row a link with a chevron. */
  href?: string;
  /** A control at the end instead of the chevron (e.g. a Switch). */
  control?: React.ReactNode;
  /** Show the chevron on a row that isn't a link (it opens something in place). */
  chevron?: boolean;
  /** id for the label, to name the control with aria-labelledby. */
  labelId?: string;
  /** Makes the row a button (e.g. opens a sheet); same box as the div row. */
  onClick?: () => void;
}) {
  // Content-box, as in the canvas: 52px plus the 1px divider.
  const classes =
    'box-content flex h-[52px] items-center gap-3 border-b border-divider px-[14px] text-text';
  const content = (
    <>
      {icon}
      <span id={labelId} className="flex-grow text-[15px] font-semibold">
        {label}
      </span>
      {value ? <span className="text-[14px] text-muted-foreground">{value}</span> : null}
      {control ??
        (href !== undefined || chevron ? (
          <ChevronRightIcon width={16} height={16} stroke="var(--color-text-muted)" />
        ) : null)}
    </>
  );
  if (href !== undefined) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        className={gcn(classes, 'w-auto cursor-pointer bg-transparent text-left')}
      >
        {content}
      </button>
    );
  }
  return <div className={classes}>{content}</div>;
}
