import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Class merger — combines conditional Tailwind classes and resolves
 * conflicting utilities (e.g. `p-2` vs `p-4`) in favor of the last one.
 * Used by every shadcn/ui primitive in components/ui.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * iOS Safari's zoom-out-on-blur animation is tied to an actual `blur`
 * event firing on the previously-focused element. Every modal in this app
 * (AddWordModal, CreateTopicModal, WordCardModal) uses `autoFocus` on its
 * first field, then unmounts itself (`if (!open) return null`) the moment
 * `close()` runs -- including right after a successful submit. Removing a
 * focused element from the DOM does NOT fire `blur`, so iOS never gets the
 * signal to reset the viewport scale and the page is left zoomed in --
 * live-reported 2026-09-05 ("after I added the word the screen still zoom
 * in") even though every field involved was already >=16px, ruling out
 * the font-size zoom trigger fixed earlier in globals.css.
 *
 * Call this as the first line of any modal's close()/submit-success
 * handler, before flipping the `open`/`onOpenChange` state, so the active
 * field gets a real blur while it's still attached to the DOM.
 */
export function blurActiveElement() {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur();
  }
}

