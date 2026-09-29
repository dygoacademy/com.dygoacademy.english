import * as React from 'react';
import Link from 'next/link';

import { gcn } from '../cn';
import { TileFlower, TileSprout, TileTree } from '../groupArt';
import { IconButton } from '../IconButton';
import { BackIcon } from '../icons';
import { SCREEN_CLASSES } from '../screens/GardenTabBar';

/**
 * UI-A · the shell every garden auth screen shares (canvas page "Adult ·
 * Sign in", `reference/AU*`): the language chip top right, a small garden
 * hero (sprout, flower, tree, flower, sprout on forest), the title and
 * subtitle, then the screen's own form. Props only; no tab bar.
 * AU2 / AU3 (A-3) add a Back button on the left, their own hero (`hero`,
 * or null for none) and the 28px title (`titleSize="small"`).
 */
export function AuthShell({
  languageChip,
  back,
  hero,
  titleSize = 'large',
  title,
  subtitle,
  children,
}: {
  languageChip: React.ReactNode;
  back?: { href: string; label: string };
  /** Replaces the sign-in hero; null draws none. */
  hero?: React.ReactNode;
  titleSize?: 'large' | 'small';
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className={gcn(SCREEN_CLASSES, 'gap-4 px-5 pb-7 pt-[22px]')}>
      {back ? (
        <div className="flex items-center justify-between">
          <IconButton asChild aria-label={back.label}>
            <Link href={back.href}>
              <BackIcon width={20} height={20} />
            </Link>
          </IconButton>
          {languageChip}
        </div>
      ) : (
        <div className="flex justify-end">{languageChip}</div>
      )}
      {hero === undefined ? <SignInHero /> : hero}
      <div className="flex flex-col gap-1">
        <h1
          className={gcn(
            'font-display font-semibold leading-[1.1]',
            titleSize === 'small' ? 'text-[28px]' : 'text-[30px]',
          )}
        >
          {title}
        </h1>
        <p className="text-[15px] text-garden-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

/** AU1's hero: sprout, flower, tree, flower, sprout on forest. */
function SignInHero() {
  return (
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
  );
}

/** A seed with a shoot (viewBox 40 × 24), AU2's hero: drawn at 34 × 24. */
export function AuthSeed(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 24" aria-hidden="true" focusable="false" {...props}>
      <ellipse cx="20" cy="18" rx="9" ry="4.5" fill="var(--stage-seed)" />
      <path
        d="M20 15 C20 10 23 8 26 7"
        stroke="var(--stage-sprout-leaf)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
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
