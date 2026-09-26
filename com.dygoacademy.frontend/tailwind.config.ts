import type { Config } from 'tailwindcss';

// Design tokens per dygo_academy_tech_spec_and_conventions.md §3.3 —
// shadcn/ui-compatible CSS variables, defined in src/app/globals.css.
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    // Pinned explicitly (live-requested 2026-09-17, "standardize for the
    // whole application") rather than left as Tailwind's implicit
    // defaults -- these numbers ARE Tailwind's defaults today, so nothing
    // about existing `sm:`/`md:`/`lg:` usage (Navbar, PublicNavbar, the
    // container below) changes. Pinning them means a future Tailwind
    // major version changing its own defaults can't silently reflow
    // every screen in the app, and gives this table one home in code
    // instead of only living in dygo_academy_frontend_architecture.md §16.
    // Mapped against real current-device CSS viewport widths (portrait):
    //   base (no prefix) < 640px — every iPhone in portrait (375–440px,
    //     SE up through Pro Max) — the mobile-first design target.
    //   sm:  640px  — iPhone landscape (667–956px), iPad mini portrait (744px).
    //   md:  768px  — iPad / iPad Air / iPad Pro 11" portrait (820–834px)
    //     — the practical "tablet" breakpoint for this app.
    //   lg:  1024px — iPad Air 13"/Pro 13" portrait (1024–1032px), and
    //     every iPad in landscape (1133–1376px).
    //   xl:  1280px, 2xl: 1536px — kept at Tailwind's defaults; nothing in
    //     the current iPhone/iPad lineup needs them, reserved for a future
    //     desktop-width layout.
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      // Word Garden size classes (design system §2.2/§2.3, UI-1 of the
      // rebuild plan). The spec wants `md` at 600px, but `md:` is 768px
      // above and still used by classic screens (search page, navigation
      // menu), so moving it now would reflow them. Garden screens use
      // these names instead; UI-8 renames them to md/lg when the classic
      // UI is deleted. Listed last so they never reorder the classic
      // media queries.
      medium: '600px', // iPad portrait, Split View 1/2 and 2/3
      expanded: '1024px', // iPad landscape, 13" iPad portrait
      short: { raw: '(max-height: 499px)' }, // iPhone landscape
    },
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        // Word Garden tokens (design system §5). Namespaced `garden-`
        // because `muted`, `primary`, `border` and `background` above
        // still belong to the classic UI; the values are CSS variables
        // that only exist under [data-ui="garden"] (globals.css). UI-8
        // drops the prefix (bg-garden-surface -> bg-surface).
        garden: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          'surface-sunken': 'var(--color-surface-sunken)',
          border: 'var(--color-border)',
          text: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          forest: 'var(--color-forest)',
          'forest-deep': 'var(--color-forest-deep)',
          'forest-shadow': 'var(--color-forest-shadow)',
          'forest-muted': 'var(--color-forest-muted)',
          primary: 'var(--color-primary)',
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
          'card-lift': 'var(--color-card-lift)',
          // Canvas colours (UI-fidelity 2), see globals.css.
          track: 'var(--color-track)',
          'gold-light': 'var(--color-gold-light)',
          'on-forest': 'var(--color-on-forest)',
          'on-forest-muted': 'var(--color-on-forest-muted)',
          'gold-wash': 'var(--color-gold-wash)',
          'gold-border': 'var(--color-gold-border)',
          'sprout-border': 'var(--color-sprout-border)',
          example: 'var(--color-example-text)',
          'water-due': 'var(--color-water-due)',
          'water-border': 'var(--color-water-border)',
          'water-strong': 'var(--color-water-strong)',
          'water-text-soft': 'var(--color-water-text-soft)',
          divider: 'var(--color-divider)',
          dashed: 'var(--color-dashed)',
          'locked-bg': 'var(--color-locked-bg)',
          'locked-border': 'var(--color-locked-border)',
          'locked-text': 'var(--color-locked-text)',
          'calendar-1': 'var(--color-calendar-1)',
          'avatar-flower-text': 'var(--color-avatar-flower-text)',
          'avatar-sprout-text': 'var(--color-avatar-sprout-text)',
          'avatar-due-text': 'var(--color-avatar-due-text)',
        },
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
      // the iPad sizes at 600px without a `medium:` prefix on every use.
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
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // §7.1 Garden radii, named by use so they can't be confused with
        // the classic sm/md/lg above.
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
  plugins: [require('tailwindcss-animate')],
};

export default config;
