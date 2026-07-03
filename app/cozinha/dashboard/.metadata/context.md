# KitchenDashboardRoute — Context

**Type**: App Router page
**Specialist**: backend-dev
**Last updated**: 2026-07-03

## Purpose
Fetches only `pedido.status = novo`, joins mesa and item/category/product data, and passes open orders to the board.

## Key dependencies
`@/lib/db/index` — query source; `drizzle-orm` — joins/filter; `@/components/cozinha/kanban-board` — live board component.

## Patterns
Kitchen no longer mutates status; delivery is confirmed by waiter.

## Notes
Implemented by waiter delivery confirmation flow.
