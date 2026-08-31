'use client';

import { cn } from '@/lib/utils';

/**
 * 3D flip card — front/back content supplied by the caller, flip state
 * controlled by the caller (not internal), so the same component serves
 * both the guest trial on the landing page (wireframe 1a) and the real
 * study session (1g/1i front, 2a back). Uses the perspective-1000 /
 * preserve-3d / backface-hidden / rotate-y-180 utilities scaffolded in
 * Phase 0's globals.css specifically for this component.
 */
export function Flashcard({
  front,
  back,
  flipped,
  onToggle,
  className,
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  flipped: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <div className={cn('perspective-1000', className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={flipped ? 'Show word' : 'Show answer'}
        className={cn(
          'preserve-3d relative h-full w-full text-left transition-transform duration-500',
          flipped && 'rotate-y-180',
        )}
      >
        <div className="backface-hidden relative">{front}</div>
        <div className="backface-hidden rotate-y-180 absolute inset-0">{back}</div>
      </button>
    </div>
  );
}
