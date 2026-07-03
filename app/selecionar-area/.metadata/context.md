# AreaSelectionRoute — Context

**Type**: App Router page
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Renders the area chooser for users with multiple operational accesses.

## Key dependencies
- `@/lib/auth/access` — loads accesses and route destinations.
- `next/navigation` — redirects single/no-access users.

## Patterns
The page is marked `force-dynamic` because it reads cookie-backed access data.

## Notes
Uses hard-coded pt-BR labels/descriptions for the four access types.
