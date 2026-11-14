import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

// Design tokens: the Word Garden CSS variables in src/app/globals.css
// (design system §5). The shadcn/ui colour names below (border, primary,
// card…) point at garden tokens since UI-8 U8-3 deleted the classic
// palette, so components/ui/* keep working without their own colours.
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    // Breakpoints, pinned explicitly (2026-09-17) so a future Tailwind major
    // can't reflow the app. UI-8 U8-4 gave md/lg to the Word Garden size
    // classes (design system §2.2/§2.3), against real CSS viewport widths:
    //   base (no prefix) < 600px — every iPhone in portrait (375–440px).
    //   md:  600px  — iPad portrait, Split View 1/2 and 2/3 (was `medium:`).
    //   sm:  640px  — iPhone landscape, iPad mini portrait (744px).
    //   tablet: 768px — the old 768px `md:`, kept for the search page and
    //     components/ui/navigation-menu so nothing reflows.
    //   lg:  1024px — iPad landscape, 13" iPad portrait (was `expanded:`).
    //   xl:  1280px, 2xl: 1536px — Tailwind defaults, reserved for desktop.
    //   short: iPhone landscape (max-height 499px).
    // Listed by width so the cascade keeps min-width order.
    screens: {
      md: '600px',
      sm: '640px',
      tablet: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      short: { raw: '(max-height: 499px)' },
    },
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'var(--color-border)',
        input: 'var(--color-border)',
        ring: 'var(--color-forest)',
        background: 'var(--color-bg)',
        foreground: 'var(--color-text)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-surface)',
        },
        secondary: {
          DEFAULT: 'var(--color-surface-sunken)',
          foreground: 'var(--color-text)',
        },
        destructive: {
          DEFAULT: 'var(--color-primary-text)',
          foreground: 'var(--color-surface)',
        },
        muted: {
          DEFAULT: 'var(--color-surface-sunken)',
          foreground: 'var(--color-text-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-surface-sunken)',
          foreground: 'var(--color-text)',
        },
        card: {
          DEFAULT: 'var(--color-surface)',
          foreground: 'var(--color-text)',
        },
        popover: {
          DEFAULT: 'var(--color-surface)',
          foreground: 'var(--color-text)',
        },
        // Word Garden tokens (design system §5), CSS variables on :root and
        // [data-ui="garden"] (globals.css). UI-8 U8-4 dropped the `garden-`
        // prefix. Not repeated here: border / primary (above, same variable)
        // and text-muted (= muted.foreground, so text-muted-foreground).
        // Renamed to avoid Tailwind clashes: dashed -> dashed-line
        // (border-dashed is a border style), card-lift -> card-lift-bg
        // (shadow-card-lift is the box shadow).
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-sunken': 'var(--color-surface-sunken)',
        text: 'var(--color-text)',
        forest: 'var(--color-forest)',
        'forest-deep': 'var(--color-forest-deep)',
        'forest-shadow': 'var(--color-forest-shadow)',
        'forest-muted': 'var(--color-forest-muted)',
        'primary-shadow': 'var(--color-primary-shadow)',
        'primary-text': 'var(--color-primary-text)',
        water: 'var(--color-water)',
        'water-soft': 'var(--color-water-soft)',
        'water-text': 'var(--color-water-text)',
        gold: 'var(--color-gold)',
        'gold-text': 'var(--color-gold-text)',
        'gold-soft': 'var(--color-gold-soft)',
        'gold-soft-text': 'var(--color-gold-soft-text)',
        success: 'var(--color-success)',
        disabled: 'var(--color-disabled)',
        'card-lift-bg': 'var(--color-card-lift)',
        // Canvas colours (UI-fidelity 2), see globals.css.
        track: 'var(--color-track)',
        'gold-light': 'var(--color-gold-light)',
        'on-forest': 'var(--color-on-forest)',
        'on-forest-muted': 'var(--color-on-forest-muted)',
        'gold-wash': 'var(--color-gold-wash)',
        'forest-wash': 'var(--color-forest-wash)',
        'forest-wash-border': 'var(--color-forest-wash-border)',
        'wilt-wash': 'var(--color-wilt-wash)',
        'primary-soft': 'var(--color-primary-soft)',
        'primary-border': 'var(--color-primary-border)',
        'gold-border': 'var(--color-gold-border)',
        'sprout-border': 'var(--color-sprout-border)',
        example: 'var(--color-example-text)',
        'water-due': 'var(--color-water-due)',
        'water-border': 'var(--color-water-border)',
        'water-strong': 'var(--color-water-strong)',
        'water-text-soft': 'var(--color-water-text-soft)',
        'water-panel': 'var(--color-water-panel)',
        'water-track': 'var(--color-water-track)',
        'water-deep': 'var(--color-water-deep)',
        'soft-text': 'var(--color-text-soft)',
        divider: 'var(--color-divider)',
        'text-faint': 'var(--color-text-faint)',
        sidebar: 'var(--color-sidebar)',
        'dashed-line': 'var(--color-dashed)',
        'locked-bg': 'var(--color-locked-bg)',
        'locked-border': 'var(--color-locked-border)',
        'locked-text': 'var(--color-locked-text)',
        'calendar-1': 'var(--color-calendar-1)',
        'avatar-flower-text': 'var(--color-avatar-flower-text)',
        'avatar-sprout-text': 'var(--color-avatar-sprout-text)',
        'avatar-due-text': 'var(--color-avatar-due-text)',
        'avatar-gold-text': 'var(--color-avatar-gold-text)',
        placeholder: 'var(--color-placeholder)',
        scrim: 'var(--color-scrim)',
        'on-forest-line': 'var(--color-on-forest-line)',
        'speak-faded': 'var(--color-speak-faded)',
        // §5.2 plant stages — one colour per SRS state.
        stage: {
          seed: 'var(--stage-seed)',
          sprout: 'var(--stage-sprout)',
          'sprout-leaf': 'var(--stage-sprout-leaf)',
          flower: 'var(--stage-flower)',
          tree: 'var(--stage-tree)',
          'tree-canopy': 'var(--stage-tree-canopy)',
          'tree-fruit': 'var(--stage-tree-fruit)',
          wilt: 'var(--stage-wilt)',
          'wilt-light': 'var(--stage-wilt-light)',
          'wilt-soil': 'var(--stage-wilt-soil)',
          due: 'var(--stage-due)',
        },
        // §5.2 rating buttons (bg + text pairs).
        rating: {
          again: 'var(--rating-again)',
          'again-text': 'var(--rating-again-text)',
          hard: 'var(--rating-hard)',
          'hard-text': 'var(--rating-hard-text)',
          good: 'var(--rating-good)',
          'good-text': 'var(--rating-good-text)',
          easy: 'var(--rating-easy)',
          'easy-text': 'var(--rating-easy-text)',
        },
      },
      // §4.1 Garden fonts (stacks defined in globals.css).
      fontFamily: {
        display: ['var(--font-stack-display)'],
        body: ['var(--font-stack-body)'],
      },
      // §4.2 Garden type scale. Sizes are CSS variables so they switch to
      // the iPad sizes at 600px without an `md:` prefix on every use.
      fontSize: {
        'display-xl': ['var(--text-display-xl)', { lineHeight: '1.05', fontWeight: '600' }],
        'display-l': ['var(--text-display-l)', { lineHeight: '1.1', fontWeight: '600' }],
        'display-m': ['var(--text-display-m)', { lineHeight: '1.15', fontWeight: '600' }],
        'display-s': ['var(--text-display-s)', { lineHeight: '1.2', fontWeight: '600' }],
        'body-l': ['var(--text-body-l)', { lineHeight: '1.35', fontWeight: '600' }],
        'body-m': ['var(--text-body-m)', { lineHeight: '1.4' }],
        'body-s': ['var(--text-body-s)', { lineHeight: '1.4' }],
        label: ['var(--text-label)', { lineHeight: '1.3', fontWeight: '600' }],
      },
      borderRadius: {
        // §7.1 Garden radii, named by use so they can't be confused with
        // Tailwind's default sm/md/lg.
        tile: 'var(--radius-sm)', // 12 — small tiles, icon wells, banners
        control: 'var(--radius-md)', // 16 — buttons, stat tiles, list rows
        card: 'var(--radius-lg)', // 20 — standard cards
        hero: 'var(--radius-xl)', // 26 — hero garden card, review card
      },
      // §7.2 pressable shadows (the only shadows in the garden).
      boxShadow: {
        'press-primary': 'var(--shadow-press-primary)',
        'press-primary-down': 'var(--shadow-press-primary-down)',
        'press-forest': 'var(--shadow-press-forest)',
        'press-forest-down': 'var(--shadow-press-forest-down)',
        'card-lift': 'var(--shadow-card-lift)',
      },
      // §6.2 page margin per size class (switches via CSS variable).
      spacing: {
        page: 'var(--page-margin)',
      },
      // §12 motion tokens.
      transitionDuration: {
        press: 'var(--motion-press)',
        quick: 'var(--motion-quick)',
        bloom: 'var(--motion-bloom)',
      },
      transitionTimingFunction: {
        garden: 'var(--ease-out)',
        bloom: 'var(--ease-bloom)',
      },
      // 3D flip-card utilities used by src/components/flashcard (Phase 2).
      transitionProperty: {
        transform: 'transform',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Home page HP-2: `home-lg:` = `lg:` (1024px) for the public home page,
    // unless an ancestor's data-home-layout forces the phone or desktop
    // layout (the H1/H2 reference fixtures, whatever the window width).
    plugin(({ addVariant }) => {
      addVariant('home-lg', [
        '@media (min-width: 1024px) { &:not([data-home-layout="phone"] *) }',
        '[data-home-layout="desktop"] &',
      ]);
    }),
    // UI-7 U7-2: the Word Garden iPad layouts (design system §10). `ipad:` =
    // `md:` (600px) and `ipad-lg:` = `lg:` (1024px), but only under
    // GardenRoot's data-garden-ipad, which is set when
    // NEXT_PUBLIC_GARDEN_IPAD_NAV is on (the rail / sidebar show). With the
    // flag off the garden keeps its 560px phone column at every width.
    plugin(({ addVariant }) => {
      addVariant('ipad', '@media (min-width: 600px) { [data-garden-ipad] & }');
      addVariant('ipad-lg', '@media (min-width: 1024px) { [data-garden-ipad] & }');
    }),
  ],
};

export default config;
