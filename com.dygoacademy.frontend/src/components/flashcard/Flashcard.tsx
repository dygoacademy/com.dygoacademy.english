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
  // A real <button> here is invalid HTML the moment front/back render one
  // of their own (AudioButton's Play control does) — a <button> can't
  // contain another <button>, and worse, a click on the inner one bubbles
  // up and fires this onToggle too, flipping the card out from under
  // whatever was actually tapped (live-reported 2026-09-04, AudioButton's
  // Play button triggering a swipe). A div styled and keyboard-operable
  // like a button gets the same flip-on-tap/Enter/Space behavior without
  // that nesting problem — inner buttons can stopPropagation() against it
  // safely, which they now do.
  return (
    <div className={cn('perspective-1000', className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-label={flipped ? 'Show word' : 'Show answer'}
        className={cn(
          'preserve-3d relative h-full w-full cursor-pointer text-left transition-transform duration-500',
          flipped && 'rotate-y-180',
        )}
      >
        <div className="backface-hidden relative">{front}</div>
        <div className="backface-hidden rotate-y-180 absolute inset-0">{back}</div>
      </div>
    </div>
  );
}
