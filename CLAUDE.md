# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `bun dev`
- **Build**: `bun run build`
- **Lint**: `bun run lint`
- **Install deps**: `bun install`

## Tech Stack

- Next.js 16 (App Router) with React 19
- TypeScript (strict mode)
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- Bun as package manager (uses `bun.lock`)

## Architecture

- `app/` — Next.js App Router: pages, layouts, and global styles
- `public/` — Static assets
- Path alias `@/*` maps to project root
- Tailwind v4 uses `@theme inline` in `globals.css` for design tokens (no `tailwind.config` file)
- Fonts: Geist Sans and Geist Mono loaded via `next/font/google`, exposed as CSS variables
