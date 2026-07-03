# WaiterTablesRoute — Context

**Type**: App Router page
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Server component lists active tables and links to `/garcom/mesa/[id]`.

## Key dependencies
`@/lib/db/index` — table query; `drizzle-orm` — active filter/order; `next/link` — route links.

## Patterns
Uses a SQLite-compatible active-table SQL predicate.

## Notes
Built as part of waiter ordering flow.
