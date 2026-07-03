# KitchenComponents — Context

**Type**: React client components
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
The board keeps the historical `KanbanBoard` export name but now renders a single visual-only open-order list.

## Key dependencies
`@/lib/sse` — event types; `@/lib/kitchen/order-items` — item grouping; `@/components/live-elapsed-timer` — open-order timer.

## Patterns
Kitchen components should not call `atualizarStatus`; waiter delivery confirmation owns completion.

## Notes
Updated by waiter delivery confirmation flow.
