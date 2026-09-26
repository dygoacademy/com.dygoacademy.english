"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { setGardenLocaleCookie } from "@/app/(garden)/actions";
import type { AppLocale, MeaningLocale } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";

import { useGardenPreferences } from "../preferences";

/**
 * The language sheet's state and save (UI-L). Optimistic: the radios move
 * at once; the change is saved to the profile (`PATCH /profiles/me`, so
 * it follows the learner to other devices) and, for the app language, the
 * `dygo_locale` cookie; then `router.refresh()` re-renders the garden on
 * the server in the new language, without a full page reload. On a failed
 * save the radios go back and the sheet says so.
 */
export function useLanguageSettings() {
  const router = useRouter();
  const preferences = useGardenPreferences();
  const [selected, setSelected] = React.useState<{
    uiLocale: AppLocale;
    meaningLocale: MeaningLocale | null;
  }>({
    uiLocale: preferences.appLocale,
    meaningLocale: preferences.meaningLocale,
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [refreshing, startRefresh] = React.useTransition();

  // Follow the server once a refresh has brought new preferences down.
  const serverKey = `${preferences.appLocale}|${preferences.meaningLocale}`;
  const [lastServerKey, setLastServerKey] = React.useState(serverKey);
  if (lastServerKey !== serverKey) {
    setLastServerKey(serverKey);
    setSelected({
      uiLocale: preferences.appLocale,
      meaningLocale: preferences.meaningLocale,
    });
  }

  async function change(next: {
    uiLocale?: AppLocale;
    meaningLocale?: MeaningLocale | null;
  }) {
    const previous = selected;
    setSelected({ ...selected, ...next });
    setSaving(true);
    setError(false);
    try {
      if (next.uiLocale) await setGardenLocaleCookie(next.uiLocale);
      await apiClient.patch("/profiles/me", next);
      startRefresh(() => router.refresh());
    } catch {
      setSelected(previous);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return { ...selected, change, saving: saving || refreshing, error };
}
