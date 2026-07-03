# WaiterPendingDeliveriesRoute — Context

**Type**: App Router page
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Server page fetches all `novo` pedidos and item groups, then client removes delivered orders via action/SSE.

## Key dependencies
`@/lib/auth/access` — garcom guard; `@/lib/db/index` — open order query; `@/components/garcom/pending-deliveries-client` — delivery queue.

## Patterns
Waiters see all pending deliveries, not just their own.

## Notes
Implemented by waiter delivery confirmation flow.
