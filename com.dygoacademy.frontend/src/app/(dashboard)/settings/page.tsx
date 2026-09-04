import { SignOutButton } from '@/components/layout/SignOutButton';
import { NotificationSettings } from '@/components/settings/NotificationSettings';

export default function SettingsPage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <h1 className="text-lg font-semibold">Settings</h1>
      <NotificationSettings />
      {/* The header's account icon dropped its adjacent "Sign out" button
          (crowded narrow viewports) in favor of just linking here -- this
          is now the only place to sign out, so it needs to actually be
          here. */}
      <div className="border-t pt-4">
        <SignOutButton />
      </div>
    </main>
  );
}
