"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { HarvestStage } from "@/types";

import { buttonClassName } from "../buttonStyles";
import { gcn } from "../cn";
import { useGardenFormat } from "../format";
import { CloseIcon } from "../icons";
import { IconButton } from "../IconButton";
import { StatTile } from "../StatTile";

/**
 * S2 Bed harvest (canvas "Adult · Seeds & Harvest", values from
 * docs/design/garden/reference/S2-bed-harvest.html).
 *
 * Close · "<bed> · fully planted" → forest card with the basket (its fruit
 * drop in one by one) → Fraunces 30 title, subtitle → 3 tiles (words
 * grown / fruit / still growing) → "In your basket": every planted word as
 * a chip coloured by stage, and the "stays in your garden" note → Share
 * and Choose next bed (S3).
 *
 * Props only; HarvestBedLive owns the data.
 */
export interface BedHarvestScreenProps {
  closeHref: string;
  packetsHref: string;
  bed: string;
  firstHarvest: boolean;
  fruit: number;
  /** Ripe and growing words. */
  stillGrowing: number;
  words: ReadonlyArray<{ id: string; word: string; stage: HarvestStage }>;
  onShare: () => void;
  /** The share fell back to copying the text. */
  copied?: boolean;
}

const CHIP: Record<HarvestStage, { bg: string; dot: string }> = {
  fruit: { bg: "bg-primary-soft", dot: "bg-primary" },
  ripe: { bg: "bg-gold-soft", dot: "bg-stage-tree-fruit" },
  growing: { bg: "bg-forest-wash", dot: "bg-success" },
};

export function BedHarvestScreen({
  closeHref,
  packetsHref,
  bed,
  firstHarvest,
  fruit,
  stillGrowing,
  words,
  onShare,
  copied = false,
}: BedHarvestScreenProps) {
  const t = useTranslations("screens.bedHarvest");
  const f = useGardenFormat();

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] overflow-hidden bg-bg px-[18px] pb-[26px] pt-5 text-text">
      <div className="flex items-center gap-3">
        <IconButton asChild aria-label={t("close")}>
          <Link href={closeHref}>
            <CloseIcon width={20} height={20} />
          </Link>
        </IconButton>
        <span className="grow text-center text-[12px] font-bold uppercase tracking-[0.1em] text-success">
          {t("overline", { bed })}
        </span>
        <span className="w-11" aria-hidden="true" />
      </div>

      <div className="overflow-hidden rounded-hero bg-forest">
        <BasketArt label={t("artLabel", { bed })} />
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">
          {firstHarvest ? t("titleFirst") : t("title")}
        </h1>
        <span className="text-[15px] text-muted-foreground">
          {t("subtitle")}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatTile
          className="items-center p-2.5"
          value={f.number(words.length)}
          label={t("grown")}
        />
        <StatTile
          className="items-center p-2.5"
          tone="primary"
          value={f.number(fruit)}
          label={t("fruit")}
        />
        <StatTile
          className="items-center p-2.5"
          tone="forest"
          value={f.number(stillGrowing)}
          label={t("stillGrowing")}
        />
      </div>

      <section
        aria-labelledby="bed-harvest-basket"
        className="flex flex-col gap-2.5 rounded-card border border-border bg-surface px-4 py-[14px]"
      >
        <h2
          id="bed-harvest-basket"
          className="overline-label text-[12px] font-bold text-muted-foreground"
        >
          {t("basket")}
        </h2>
        <ul
          lang="en"
          className="flex flex-wrap gap-1.5 text-[14px] font-semibold"
        >
          {words.map((w) => (
            <li
              key={w.id}
              data-stage={w.stage}
              className={gcn(
                "flex items-center gap-1.5 rounded-tile px-2.5 py-1.5",
                CHIP[w.stage].bg,
              )}
            >
              <span
                className={gcn("h-2 w-2 rounded-full", CHIP[w.stage].dot)}
                aria-hidden="true"
              />
              {w.word}
            </li>
          ))}
        </ul>
        <p className="text-[13px] leading-[1.4] text-muted-foreground">
          {t("stays")}
        </p>
      </section>

      <div className="mt-auto grid grid-cols-[1fr_1.6fr] gap-2">
        <button
          type="button"
          onClick={onShare}
          className={buttonClassName("secondary", {
            className:
              "h-[56px] rounded-[18px] px-0 text-[16px] text-forest md:max-w-none",
          })}
        >
          <ShareIcon />
          {copied ? t("copied") : t("share")}
        </button>
        <Link
          href={packetsHref}
          className={buttonClassName("primary", {
            className: "h-[56px] text-[16px] md:max-w-none",
          })}
        >
          {t("next")}
        </Link>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15 V3" />
      <path d="M7 8 L12 3 L17 8" />
      <path d="M5 13 V20 H19 V13" />
    </svg>
  );
}

/** The canvas basket (354 × 180), its fruit dropping in one by one. */
function BasketArt({ label }: { label: string }) {
  const fruit = [
    { cx: 138, cy: 86, r: 18, fill: "var(--stage-flower)" },
    { cx: 176, cy: 78, r: 20, fill: "var(--stage-flower)" },
    { cx: 214, cy: 88, r: 16, fill: "var(--stage-tree-fruit)" },
    { cx: 156, cy: 100, r: 14, fill: "var(--stage-tree-fruit)" },
    { cx: 196, cy: 102, r: 13, fill: "var(--stage-sprout-leaf)" },
  ];
  return (
    <svg
      width="100%"
      viewBox="0 0 354 180"
      role="img"
      aria-label={label}
      className="block h-auto"
    >
      <circle cx="60" cy="40" r="3" fill="var(--color-gold-light)" />
      <circle cx="300" cy="30" r="2.5" fill="var(--color-gold-light)" />
      <circle cx="276" cy="64" r="2" fill="var(--color-gold-light)" />
      <circle cx="84" cy="74" r="2" fill="var(--color-gold-light)" />
      {fruit.map((c, i) => (
        <g
          key={i}
          className="harvest-drop"
          style={{ animationDelay: `${0.1 + i * 0.15}s` }}
        >
          <circle cx={c.cx} cy={c.cy} r={c.r} fill={c.fill} />
        </g>
      ))}
      <path d="M104 104 H250 L236 162 H118 Z" fill="var(--color-primary)" />
      <path
        d="M112 124 H242 M116 142 H238"
        stroke="var(--color-primary-text)"
        strokeWidth="2"
      />
      <rect
        x="98"
        y="98"
        width="158"
        height="12"
        rx="6"
        fill="var(--color-primary-text)"
      />
      <path
        d="M118 100 C118 50 236 50 236 100"
        fill="none"
        stroke="var(--color-primary-text)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
