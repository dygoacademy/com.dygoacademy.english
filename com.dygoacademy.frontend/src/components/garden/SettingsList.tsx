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
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  /** Makes the row a link with a chevron (with `control`: the label part is the link). */
  href?: string;
  /** A control at the end instead of the chevron (e.g. a Switch). */
  control?: React.ReactNode;
  /** Show the chevron on a row that isn't a link (it opens something in place). */
  chevron?: boolean;
  /** id for the label, to name the control with aria-labelledby. */
  labelId?: string;
  /** Makes the row a button (e.g. opens a sheet); same box as the div row. */
  onClick?: () => void;
  /** 46px rows (A8 with six rows, A8f board 2026-11-14). */
  compact?: boolean;
}) {
  // Content-box, as in the canvas: 52px (46px compact) plus the 1px divider.
  const classes = gcn(
    'box-content flex items-center gap-3 border-b border-divider px-[14px] text-text',
    compact ? 'h-[46px]' : 'h-[52px]',
  );
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
  if (href !== undefined && control) {
    // A link and a control (A8 Reminder: the row opens A8c, the switch
    // stays): the link covers the icon, label and value, not the switch.
    // The phone board (A8) shows the value as a forest link "7:30 AM ›";
    // iA8 keeps it muted.
    return (
      <div className={classes}>
        <Link href={href} className="flex flex-grow items-center gap-3 self-stretch text-text">
          {icon}
          <span id={labelId} className="flex-grow text-[15px] font-semibold">
            {label}
          </span>
          {value ? (
            <span className="px-1 text-[14px] font-semibold text-forest underline ipad-lg:px-0 ipad-lg:font-normal ipad-lg:text-muted-foreground ipad-lg:no-underline">
              {value}
              <span aria-hidden="true" className="ipad-lg:hidden">
                {' ›'}
              </span>
            </span>
          ) : null}
        </Link>
        {control}
      </div>
    );
  }
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
