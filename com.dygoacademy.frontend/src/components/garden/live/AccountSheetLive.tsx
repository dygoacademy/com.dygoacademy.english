"use client";

import { useTranslations } from "next-intl";

import { AccountSheet } from "../AccountSheet";
import { Toast } from "../Toast";
import { useSignOut } from "./useSignOut";

/**
 * The A8 Account sheet wired to sign-out (SO-1). On success the page
 * leaves for /login (the sheet stays up, "Signing out…", until it does);
 * on failure the sheet stays open and a garden Toast says so, inside the
 * sheet (a modal hides everything outside it from VoiceOver).
 */
export function AccountSheetLive({
  open,
  onOpenChange,
  name,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
}) {
  const t = useTranslations("components.account");
  const { signOut, signingOut, error, clearError } = useSignOut();

  return (
    <>
      <AccountSheet
        open={open}
        onOpenChange={onOpenChange}
        name={name}
        email={email}
        signingOut={signingOut}
        onSignOut={() => void signOut()}
        notice={
          <Toast
            open={error}
            onOpenChange={(next) => {
              if (!next) clearError();
            }}
            message={t("error")}
            position="inline"
          />
        }
      />
    </>
  );
}
