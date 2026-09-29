"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import { AUTH_HREFS } from "../auth/authPaths";

/**
 * Garden sign-out (SO-1), the same Supabase steps as the classic
 * `layout/SignOutButton` (left untouched): the default signOut() first;
 * if GoTrue's /logout call fails, clear the browser's own session with
 * `scope: 'local'` (no network, so a flaky server can't strand the user).
 * Then the React Query cache is cleared and the learner lands on the
 * garden sign-in (/login). Other cookies, `dygo_locale` included, are
 * left alone, so sign-in opens in the same language.
 *
 * Only if even the local sign-out fails does `signOut` resolve false with
 * `error` set; the caller keeps its sheet open and shows a toast.
 */
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
