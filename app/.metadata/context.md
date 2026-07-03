# AppRoot — Context

**Type**: App Router root
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Root App Router files establish pt-BR HTML metadata, app-wide styles, toast rendering, and home redirect based on the current authenticated user access.

## Key dependencies
- `next/navigation` — redirects authenticated users.
- `@/lib/auth/*` — session and access routing.
- `@/components/ui/sonner` — global toast host.

## Patterns
The home route is marked `force-dynamic` because it reads cookies through the first-party session helpers.

## Notes
Keep artifacts and UI copy in pt-BR because the existing app UI is pt-BR. Do not add business logic to layout beyond global providers/chrome.
