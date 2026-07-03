# TableNumberAliasRoute — Context

**Type**: App Router page
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Validates numeric table number, requires active table, then redirects to `/garcom/mesa/{uuid}`.

## Key dependencies
`@/lib/db/index` — table lookup; `next/navigation` — notFound/redirect; `drizzle-orm` — table number lookup.

## Patterns
This route expects a table number, while waiter canonical route uses table UUID.

## Notes
Added to support simple table-number entry/QR-like aliases.
