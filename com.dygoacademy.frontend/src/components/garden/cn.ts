import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Class merger for Word Garden components.
 *
 * lib/utils' `cn` uses tailwind-merge's default config, which doesn't know
 * the garden's custom names: it reads `text-body-l` as a text *colour* and
 * silently drops it when merged with `text-white`. This teaches it the
 * garden font sizes, radii and shadows (tailwind.config.ts) so conflicts
 * resolve by group like any built-in utility.
 */
const gardenMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-xl',
            'display-l',
            'display-m',
            'display-s',
            'body-l',
            'body-m',
            'body-s',
            'label',
          ],
        },
      ],
      rounded: [{ rounded: ['tile', 'control', 'card', 'hero'] }],
      shadow: [
        {
          shadow: [
            'press-primary',
            'press-primary-down',
            'press-forest',
            'press-forest-down',
            'card-lift',
          ],
        },
      ],
    },
  },
});

export function gcn(...inputs: ClassValue[]): string {
  return gardenMerge(clsx(inputs));
}
