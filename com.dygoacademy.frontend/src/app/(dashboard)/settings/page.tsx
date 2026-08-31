import { NotificationSettings } from '@/components/settings/NotificationSettings';

export default function SettingsPage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <h1 className="text-lg font-semibold">Settings</h1>
      <NotificationSettings />
    </main>
  );
}
