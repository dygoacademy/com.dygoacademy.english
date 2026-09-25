import { getTranslations } from 'next-intl/server';

import { GARDEN_CONTENT_WIDTH } from '@/constants/layout';

/**
 * Today's Garden (A1) — intentionally empty until UI-4. UI-0's "done
 * when" is only that a flagged user lands here and nobody else does.
 */
export default async function GardenHomePage() {
  const t = await getTranslations('garden.home');

  return (
    <main className={`mx-auto ${GARDEN_CONTENT_WIDTH.wide} px-page-safe pt-safe`}>
      <h1 className="pt-8 font-display text-display-l">{t('title')}</h1>
      <p className="mt-2 text-body-m text-garden-muted">{t('placeholder')}</p>
    </main>
  );
}
