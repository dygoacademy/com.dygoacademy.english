import type { Metadata } from 'next';

import { CONTENT_WIDTH } from '@/constants/layout';

import { DEV_COPY, SpeakingDevClient } from './SpeakingDevClient';

/**
 * /garden/_speaking — Phase 13 T3 dev page (schedule S2, gate G1). Dylan
 * opens it on his iPhone after the deploy: record, replay, see the
 * envelope, and measure whether the AAC `.m4a` decodes shifted against
 * its `.wav`. Signed-in only, not linked from the app, not indexed.
 *
 * Dev tool, not learner UI: its labels are English only and don't go
 * through the message files (phase notes, decision S2-a).
 */
export const metadata: Metadata = {
  title: DEV_COPY.title,
  robots: { index: false, follow: false },
};

export default function SpeakingDevPage() {
  return (
    <main className={`mx-auto ${CONTENT_WIDTH.narrow} px-page-safe pb-10 pt-6`}>
      <h1 className="font-display text-display-s">{DEV_COPY.title}</h1>
      <p className="mt-1 text-body-s text-muted-foreground">{DEV_COPY.intro}</p>
      <SpeakingDevClient />
    </main>
  );
}
