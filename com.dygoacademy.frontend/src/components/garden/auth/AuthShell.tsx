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
 * AU4 (A-4) has no hero and 8px more room above the title (`titleGap`).
 */
export function AuthShell({
  languageChip,
  back,
  hero,
  titleSize = 'large',
  titleGap = false,
  title,
  subtitle,
  children,
}: {
  languageChip: React.ReactNode;
  back?: { href: string; label: string };
  /** Replaces the sign-in hero; null draws none. */
  hero?: React.ReactNode;
  titleSize?: 'large' | 'small';
  /** AU4: `margin-top: 8px` on the title block, as the canvas draws it. */
  titleGap?: boolean;
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
      <div className={gcn('flex flex-col gap-1', titleGap && 'mt-2')}>
        <h1
          className={gcn(
            'font-display font-semibold',
            titleSize === 'small' ? 'text-[28px]' : 'text-[30px]',
            // After the size: tailwind-merge drops a leading-* that comes
            // before a text-[size] class (it treats size as setting line height).
            'leading-[1.1]',
          )}
        >
          {title}
        </h1>
        <p className="text-[15px] text-muted-foreground">{subtitle}</p>
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
      className="box-border flex h-[120px] shrink-0 items-end justify-center gap-2.5 overflow-hidden rounded-hero bg-forest pb-3"
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
      className="rounded-[14px] bg-rating-again px-3 py-2.5 text-[14px] leading-[1.35] text-primary-text"
    >
      {children}
    </div>
  );
}

/** The big primary button (AU4 puts it straight under the form). */
export const AUTH_BUTTON_CLASSES =
  'flex h-[58px] w-full shrink-0 items-center justify-center rounded-[18px] bg-primary text-[17px] font-bold text-white shadow-press-primary transition-transform duration-press ease-garden active:translate-y-[2px] disabled:opacity-60';

/** The big primary button at the bottom of an auth form. */
export const AUTH_SUBMIT_CLASSES = `mt-auto ${AUTH_BUTTON_CLASSES}`;

/** Links on auth screens are underlined forest text, like the canvas. */
export const AUTH_LINK_CLASSES = 'text-forest underline';
