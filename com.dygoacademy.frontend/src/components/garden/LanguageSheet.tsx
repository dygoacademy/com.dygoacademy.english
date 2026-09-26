"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  LOCALES,
  MEANING_LOCALES,
  type AppLocale,
  type MeaningLocale,
} from "@/i18n/config";

import { BottomSheet } from "./BottomSheet";
import { gcn } from "./cn";
import { CheckIcon } from "./icons";

/**
 * The Language sheet (UI-L), opened from the A8 "Meanings in" row. No
 * canvas artboard: a BottomSheet with two radio groups, the app language
 * (English, 简体中文, Tiếng Việt, each in its own language) and the
 * meaning language for the review card (Tiếng Việt, 简体中文 or English
 * only). Props only; the caller saves (MeLive: profile + cookie).
 */
export interface LanguageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uiLocale: AppLocale;
  meaningLocale: MeaningLocale | null;
  onChange: (change: {
    uiLocale?: AppLocale;
    meaningLocale?: MeaningLocale | null;
  }) => void;
  saving?: boolean;
  error?: boolean;
}

export function LanguageSheet({
  open,
  onOpenChange,
  uiLocale,
  meaningLocale,
  onChange,
  saving = false,
  error = false,
}: LanguageSheetProps) {
  const t = useTranslations("components.language");
  const names = useTranslations("components.language.names");

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
    >
      <RadioGroup legend={t("appLanguage")}>
        {LOCALES.map((code) => (
          <RadioRow
            key={code}
            name="garden-ui-locale"
            checked={uiLocale === code}
            disabled={saving}
            onSelect={() => onChange({ uiLocale: code })}
            label={names(code)}
            lang={code}
          />
        ))}
      </RadioGroup>

      <RadioGroup legend={t("meaningLanguage")} hint={t("meaningHint")}>
        {MEANING_LOCALES.map((code) => (
          <RadioRow
            key={code}
            name="garden-meaning-locale"
            checked={meaningLocale === code}
            disabled={saving}
            onSelect={() => onChange({ meaningLocale: code })}
            label={t("meaningWith", { language: names(code) })}
          />
        ))}
        <RadioRow
          name="garden-meaning-locale"
          checked={meaningLocale === null}
          disabled={saving}
          onSelect={() => onChange({ meaningLocale: null })}
          label={t("meaningNone")}
        />
      </RadioGroup>

      <p aria-live="polite" className="min-h-5 text-[13px] text-garden-muted">
        {error ? t("error") : saving ? t("saving") : null}
      </p>
    </BottomSheet>
  );
}

function RadioGroup({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mb-4 flex flex-col">
      <legend className="overline-label mb-1 text-[12px] font-bold text-garden-muted">
        {legend}
      </legend>
      {hint ? (
        <p className="mb-1 text-[13px] text-garden-muted">{hint}</p>
      ) : null}
      <div className="flex flex-col rounded-card border border-garden-border [&>label:last-child]:border-b-0">
        {children}
      </div>
    </fieldset>
  );
}

function RadioRow({
  name,
  checked,
  disabled,
  onSelect,
  label,
  lang,
}: {
  name: string;
  checked: boolean;
  disabled: boolean;
  onSelect: () => void;
  label: string;
  lang?: string;
}) {
  return (
    <label
      className={gcn(
        "flex h-[52px] cursor-pointer items-center gap-3 border-b border-garden-divider px-[14px]",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-garden-forest",
        disabled && "cursor-default opacity-60",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="sr-only"
      />
      <span lang={lang} className="flex-grow text-[15px] font-semibold">
        {label}
      </span>
      <span
        aria-hidden="true"
        className={gcn(
          "flex h-6 w-6 items-center justify-center rounded-full border-2",
          checked
            ? "border-garden-forest bg-garden-forest"
            : "border-garden-border",
        )}
      >
        {checked ? (
          <CheckIcon
            width={14}
            height={14}
            stroke="var(--color-surface)"
            strokeWidth="3.5"
          />
        ) : null}
      </span>
    </label>
  );
}
