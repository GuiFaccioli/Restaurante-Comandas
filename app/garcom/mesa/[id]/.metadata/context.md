# WaiterTableOrderRoute — Context

**Type**: App Router page + client component
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Server page validates active table and loads available products; client composes menu grid, cart FAB, and cart drawer.

## Key dependencies
`@/lib/db/index` — table/menu query; `@/components/garcom/*` — menu/cart UI; `drizzle-orm` — filters/order.

## Patterns
Unavailable products are filtered out at query time; cart state is client-side until confirmation.

## Notes
Built as part of waiter mobile PWA/order flow.
