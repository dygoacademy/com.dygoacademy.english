import { Button } from '@/components/ui/button';

/** Wireframe 1j — "Empty screens are the best place to teach. One action only." */
export function EmptyTopicState() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-20 w-32 items-center justify-center rounded-xl border border-dashed">
        <span className="font-mono text-xs text-muted-foreground">no cards</span>
      </div>
      <h2 className="text-xl font-semibold leading-snug">
        Add one word and
        <br />
        we do the rest.
      </h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        IPA, audio, synonyms and example sentences arrive on their own.
      </p>
      <Button disabled>+ Add a word · Phase 1</Button>
      <p className="text-xs text-muted-foreground">
        or start from: <b>IELTS 100</b> · <b>Phrasal verbs</b>
      </p>
    </div>
  );
}
