import type { SpeakingStage } from '@/types';
import { SPEAKING_STAGES } from '@/types';

import { SpeakingPlant } from './SpeakingPlant';

export interface StageScoreProps {
  stage: SpeakingStage;
  /** "In bloom · 82% match" (speak.match, from t()). */
  title: string;
  /** "Seed · Sprout · Bloom · Fruit at 90%" (speak.stageScale); may hold <b>. */
  scale: React.ReactNode;
}

/**
 * SP3 score as a garden stage (SpeakCompare.dc.html): the plant on a forest
 * circle, the title, four segments filled up to the stage, and the scale.
 */
export function StageScore({ stage, title, scale }: StageScoreProps) {
  const reached = SPEAKING_STAGES.indexOf(stage);
  return (
    <div className="flex items-center gap-3" data-stage={stage}>
      <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-forest">
        <SpeakingPlant stage={stage} size={30} />
      </div>
      <div className="flex flex-grow flex-col gap-1">
        <span className="font-display text-[22px] font-semibold leading-[1.1]">{title}</span>
        <div className="flex items-center gap-1" aria-hidden="true">
          {SPEAKING_STAGES.map((s, i) => (
            <span
              key={s}
              data-filled={i <= reached}
              className={`h-1.5 w-[22px] rounded-[3px] ${i <= reached ? 'bg-success' : 'bg-track'}`}
            />
          ))}
        </div>
        <span className="text-[12px] text-muted-foreground">{scale}</span>
      </div>
    </div>
  );
}
