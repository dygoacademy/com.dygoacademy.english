"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { BottomSheet } from "./BottomSheet";
import { RadioGroup, RadioRow } from "./LanguageSheet";

/** Minutes offered (the backend accepts 1–120). */
export const DAILY_GOAL_OPTIONS = [5, 10, 15, 20, 30] as const;

/**
 * The daily goal sheet (UI-6 U6-7), opened from A8's "Daily goal" row. No
 * canvas artboard: a small BottomSheet with the minutes a day as radios,
 * styled like the Language sheet. Props only; MeLive saves
 * `daily_goal_minutes` (PATCH /profiles/me). A saved value outside the
 * options is shown as an extra checked row.
 */
export interface DailyGoalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minutes: number;
  onChange: (minutes: number) => void;
  saving?: boolean;
  error?: boolean;
}

export function DailyGoalSheet({
  open,
  onOpenChange,
  minutes,
  onChange,
  saving = false,
  error = false,
}: DailyGoalSheetProps) {
  const t = useTranslations("components.dailyGoal");
  const options: number[] = DAILY_GOAL_OPTIONS.includes(
    minutes as (typeof DAILY_GOAL_OPTIONS)[number],
  )
    ? [...DAILY_GOAL_OPTIONS]
    : [...DAILY_GOAL_OPTIONS, minutes].sort((a, b) => a - b);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
    >
      <RadioGroup legend={t("legend")}>
        {options.map((value) => (
          <RadioRow
            key={value}
            name="garden-daily-goal"
            checked={minutes === value}
            disabled={saving}
            onSelect={() => onChange(value)}
            label={t("minutes", { count: value })}
          />
        ))}
      </RadioGroup>
      <p aria-live="polite" className="min-h-5 text-[13px] text-garden-muted">
        {error ? t("error") : saving ? t("saving") : null}
      </p>
    </BottomSheet>
  );
}
