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
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
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
