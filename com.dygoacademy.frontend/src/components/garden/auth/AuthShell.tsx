import * as React from 'react';

import { gcn } from '../cn';
import { TileFlower, TileSprout, TileTree } from '../groupArt';
import { SCREEN_CLASSES } from '../screens/GardenTabBar';

/**
 * UI-A · the shell every garden auth screen shares (canvas page "Adult ·
 * Sign in", `reference/AU*`): the language chip top right, a small garden
 * hero (sprout, flower, tree, flower, sprout on forest), the title and
 * subtitle, then the screen's own form. Props only; no tab bar.
 */
export function AuthShell({
  languageChip,
  title,
  subtitle,
  children,
}: {
  languageChip: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className={gcn(SCREEN_CLASSES, 'gap-4 px-5 pb-7 pt-[22px]')}>
      <div className="flex justify-end">{languageChip}</div>
      <div
        aria-hidden="true"
        className="box-border flex h-[120px] shrink-0 items-end justify-center gap-2.5 overflow-hidden rounded-hero bg-garden-forest pb-3"
      >
        <TileSprout width={40} height={40} />
        <TileFlower width={40} height={50} />
        <TileTree width={46} height={50} />
        <TileFlower width={40} height={50} />
        <TileSprout width={40} height={40} />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">{title}</h1>
        <p className="text-[15px] text-garden-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

/** The error banner under the title (AU1-sign-in-error). */
export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-[14px] bg-rating-again px-3 py-2.5 text-[14px] leading-[1.35] text-garden-primary-text"
    >
      {children}
    </div>
  );
}

/** The big primary button at the bottom of an auth form. */
export const AUTH_SUBMIT_CLASSES =
  'mt-auto flex h-[58px] w-full shrink-0 items-center justify-center rounded-[18px] bg-garden-primary text-[17px] font-bold text-white shadow-press-primary transition-transform duration-press ease-garden active:translate-y-[2px] disabled:opacity-60';

/** Links on auth screens are underlined forest text, like the canvas. */
export const AUTH_LINK_CLASSES = 'text-garden-forest underline';
