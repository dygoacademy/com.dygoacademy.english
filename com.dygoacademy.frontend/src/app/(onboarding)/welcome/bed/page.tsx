import { redirect } from 'next/navigation';

import { onboardingResumePath } from '@/i18n/garden-locale';

/**
 * The old OB3 step, removed 2026-10-11 (onboarding is OB1 About you →
 * OB4 Reminder → OB5). Old links and half-finished onboardings resume at
 * OB1, or at OB4 once a goal is saved.
 */
export default async function OnboardBedPage() {
  redirect(await onboardingResumePath());
}
