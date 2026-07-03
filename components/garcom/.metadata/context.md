# WaiterComponents — Context

**Type**: React client components
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Cart is local Zustand state until order confirmation; pending deliveries update through both direct action success and SSE.

## Key dependencies
`@/lib/store/cart` — local cart state; `@/lib/actions/pedidos` — confirm order/delivery actions; `@/lib/kitchen/order-items` — shared grouping; `@/components/cozinha/sse-listener` — live delivery queue.

## Patterns
Confirming delivery currently removes the card locally after action success; errors are not shown inline in the pending-delivery card.

## Notes
Built through waiter ordering and delivery confirmation work.
