# AdminOrdersRoute — Context

**Type**: App Router page + live client component
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Server page builds initial order list with item data; client subscribes to SSE and patches status/new-order events.

## Key dependencies
`@/lib/auth/access` — requires caixa access; `@/lib/db/index` — persisted order queries; `@/components/cozinha/sse-listener` — live updates; `@/lib/date-format` — deterministic date formatting.

## Patterns
This is a persisted-order surface, not the kitchen operational board.

## Notes
Created during admin management and later stabilized by deterministic date rendering.
