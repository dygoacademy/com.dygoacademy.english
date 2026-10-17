"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";

import { AUTH_HREFS } from "../auth/authPaths";

/**
 * Garden sign-out (SO-1), the same Supabase steps as the classic
 * the old sign-out button (deleted in UI-8): the default signOut() first;
 * if GoTrue's /logout call fails, clear the browser's own session with
 * `scope: 'local'` (no network, so a flaky server can't strand the user).
 * Then the React Query cache is cleared and the learner lands on the
 * garden sign-in (/login). Other cookies, `dygo_locale` included, are
 * left alone, so sign-in opens in the same language.
 *
 * Before that, this browser's push subscription is removed from the
 * server while the session can still call the API, so a signed-out
 * device stops getting the account's reminders (2026-10-17). It waits at
 * most RELEASE_PUSH_MS and never blocks sign-out. The browser keeps its
 * subscription; the next account to switch reminders on claims it.
 *
 * Only if even the local sign-out fails does `signOut` resolve false with
 * `error` set; the caller keeps its sheet open and shows a toast.
 */
const RELEASE_PUSH_MS = 3000;

/** DELETE /notifications/subscribe for this browser's endpoint, if it has one. */
export async function releasePushSubscription(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const work = (async () => {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await apiClient.delete<void>("/notifications/subscribe", { endpoint: subscription.endpoint });
  })().catch(() => undefined);
  await Promise.race([work, new Promise((resolve) => setTimeout(resolve, RELEASE_PUSH_MS))]);
}

export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = React.useState(false);
  const [error, setError] = React.useState(false);
  const running = React.useRef(false);

  const signOut = React.useCallback(async (): Promise<boolean> => {
    if (running.current) return false;
    running.current = true;
    setSigningOut(true);
    setError(false);
    await releasePushSubscription();
    try {
      const { error: serverError } = await createClient().auth.signOut();
      if (serverError) throw serverError;
    } catch (err) {
      console.error("Sign out request to the server failed; clearing local session only.", err);
      const local = await createClient()
        .auth.signOut({ scope: "local" })
        .catch((localErr: unknown) => ({ error: localErr }));
      if (local.error) {
        running.current = false;
        setSigningOut(false);
        setError(true);
        return false;
      }
    }
    queryClient.clear();
    router.replace(AUTH_HREFS.login);
    router.refresh();
    return true;
  }, [queryClient, router]);

  return { signOut, signingOut, error, clearError: () => setError(false) };
}
