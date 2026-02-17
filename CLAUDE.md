# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Teclas is a piano education website built with **Next.js 15 (App Router)**, **React 19**, and **TypeScript**. It is a static site (`output: 'export'` in next.config.mjs) with interactive features including a piano learning game.

## Commands

```bash
npm run dev       # Start dev server (port 3000)
npm run build     # Production build (static export)
npm run lint      # ESLint
npx prettier --write .  # Format all files
```

Run `npx prettier --write .` and `npm run lint` before committing.

## Architecture

- **App Router** (`app/`) — pages use slugified folder names (e.g., `app/piano-player/`)
- **Components** (`components/`) — reusable UI components
- **UI primitives** (`components/ui/`) — shadcn/ui components (Radix UI based)
- **Styles** (`styles/`) — `globals.scss`, `_variables.scss` (colors, breakpoints, font sizes), `_components.scss` (shared classes like `.container`, `.btnPrimary`)
- **Lib** (`lib/`) — utilities, metadata definitions, SEO/JSON-LD schemas, piano game constants/types
- **Hooks** (`hooks/`) — custom React hooks (`use-mobile`, `use-on-click-outside`, `use-toast`)

## Styling

Hybrid approach: **SCSS Modules** for component styles + **Tailwind CSS** for utilities.

- SCSS variables in `styles/_variables.scss` (colors, breakpoints at 768px/1024px, font sizes)
- Shared classes in `styles/_components.scss`
- The `cn()` utility (`lib/utils.ts`) merges Tailwind classes via `clsx` + `tailwind-merge`
- Avoid Sass deprecation: place declarations before nested rules, or wrap overrides in `& {}`

## Component Conventions

**Reusable components** in `components/`:

```
components/NavBar/
├── index.tsx
└── NavBar.module.scss
```

**Page-specific components** go directly inside the page folder (never in a nested `components/` subfolder):

```
app/page-name/
├── page.tsx
└── MyComponent/
    ├── index.tsx
    └── MyComponent.module.scss
```

## Key Libraries

- **Tone.js** — audio synthesis for the piano game
- **VexFlow** — sheet music rendering
- **FontAwesome** — icons (free solid + brands)
- **React Hook Form + Zod** — form handling and validation
- **Fonts** — Delius, Comic Neue, Lobster loaded via Next.js Font API (CSS vars: `--font-delius`, `--font-comic-neue`, `--font-lobster`)

## SEO — DO NOT MODIFY

**Never change SEO content or text.** This includes:

- Metadata in `lib/metadata/index.tsx` (titles, descriptions, Open Graph)
- JSON-LD schemas in `lib/seo/`
- `public/sitemap.xml`
- `<title>`, `<meta>`, and structured data in page files
- Any user-facing marketing copy on landing pages (home, events, FAQ, resources)

If a new page is added, create new metadata — do not alter existing entries.

## Code Style

- TypeScript strict mode with path alias `@/*` mapping to project root
- Prettier: single quotes, semicolons, trailing commas
- Always check for and remove unused imports
- Prefer reusing existing code over creating new abstractions
