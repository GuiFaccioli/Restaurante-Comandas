# AdminReportsRoute — Context

**Type**: App Router page
**Specialist**: backend-dev
**Last updated**: 2026-07-03

## Purpose
Builds management reports from persisted orders, item snapshots, products, categories, and delivery timestamps.

## Key dependencies
- `@/lib/db/index` — aggregate source data.
- `drizzle-orm` — joins/order.
- `@/lib/auth/access` — admin guard.

## Patterns
Computes simple metrics in the server component: estimated revenue, average ticket, top products/categories, status counts, and average delivery duration from delivered orders only.

## Notes
Delivery duration uses `entregueEm - criadoEm` and ignores delivered orders where `entregueEm` is missing, matching the delivery-flow spec migration note.
