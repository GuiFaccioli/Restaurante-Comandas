# Waiter Delivery Confirmation Flow Design

## Summary

The order flow changes from a kitchen-controlled status workflow to a waiter-controlled delivery workflow.

The kitchen becomes a visual-only command board. A waiter sends an order, the order appears as open in the kitchen and in the waiter delivery queue, and the waiter confirms delivery after taking the order to the table. Confirming delivery records the delivery timestamp and removes the order from active kitchen/waiter views.

## Goals

- Make the kitchen screen a single, visual-only list of open comandas.
- Make the first waiter screen show all pending deliveries.
- Keep the waiter workflow simple and low-noise.
- Record delivery duration for future reports.
- Avoid fake operational statuses such as `em_preparo` or `pronto` when the real kitchen signal is a physical bell.

## Non-goals

- No kitchen status buttons.
- No `ready` or `in preparation` tracking.
- No time-based visual alerting.
- No full analytics dashboard in this change.
- No per-waiter ownership filter; the waiter sees all pending deliveries.

## Business Flow

1. The waiter selects a table and sends an order.
2. The order is persisted as `status = 'novo'`.
3. The kitchen displays all `novo` orders as open comandas.
4. The kitchen uses the physical bell to call a waiter when food/drinks are ready.
5. The waiter starts from a delivery queue showing all `novo` orders.
6. The waiter delivers the order to the table.
7. The waiter taps `Confirmar entrega`.
8. The system updates the order to `status = 'entregue'` and sets `entregueEm`.
9. The order disappears from:
   - kitchen active comandas
   - waiter pending deliveries

## Data Model

Add a nullable delivery timestamp to `pedido`:

```ts
entregueEm: timestamp | null
```

Semantics:

- `criadoEm`: when the waiter sent the order; starts the timer.
- `entregueEm`: when the waiter confirmed delivery; stops the timer.
- `status = 'novo'`: open order, visible to kitchen and waiter delivery queue.
- `status = 'entregue'`: delivered order, hidden from active operational views.

Existing statuses may remain in the enum for backward compatibility, but the new operational flow only uses `novo` and `entregue`.

## Backend Actions

### `confirmarPedido`

Current behavior is mostly correct:

- requires `garcom`
- creates `pedido`
- inserts `itemPedido`
- notifies kitchen via SSE

Required adjustment:

- ensure new orders have `entregueEm = null`.

### New waiter delivery action

Create a waiter-owned action:

```ts
confirmarEntrega(pedidoId: string): Promise<void>
```

Rules:

- requires `garcom`
- loads current pedido status
- only allows transition from `novo` to `entregue`
- sets:
  - `status = 'entregue'`
  - `entregueEm = new Date()`
  - `atualizadoEm = new Date()`
- emits SSE `status_atualizado` with `status = 'entregue'`

The existing kitchen status action should no longer be used by the kitchen UI.

For this implementation, keep the existing `atualizarStatus` function for backward compatibility, but remove every kitchen UI path that calls it.

## Kitchen UI

### Current issue

The kitchen card currently has status buttons and a kanban board with multiple columns:

- `novo`
- `em_preparo`
- `pronto`
- `entregue`

This no longer matches the business process.

### New behavior

The kitchen dashboard becomes one visual list/grid of open comandas:

- fetch only `pedido.status = 'novo'`
- show mesa number
- show grouped items by category
- show a live timer from `criadoEm`
- do not render any status mutation button
- update live through SSE:
  - `novo_pedido`: add to list
  - `status_atualizado` with `entregue`: remove from list

### Timer

Display a compact timer format:

- `< 1h`: `MM:SS`
- `>= 1h`: `HH:MM:SS`

The timer is visual only while the order is open; persistence is handled by `criadoEm` and `entregueEm`.

## Waiter UI

### Entry point

The first waiter screen should be the pending delivery queue.

The access redirect for `garcom` should point to this delivery queue instead of directly to table selection.

### Pending deliveries page

Repurpose the existing waiter page:

```txt
/garcom/pedidos
```

Behavior:

- requires `garcom`
- fetches all `pedido.status = 'novo'`
- shows a clean pending delivery list
- each card shows:
  - mesa number
  - live timer since `criadoEm`
  - grouped items by category
  - button `Confirmar entrega`
- if no pending deliveries:
  - show a calm empty state
  - provide primary action to go to `Mesas`

### Navigation

Waiter should still be able to create new orders:

- link/button to `/garcom/mesas`
- existing table/menu flow stays intact

## Reporting Foundation

This change records the delivery endpoint needed for future reports.

Future report metrics can derive:

- delivery duration per order: `entregueEm - criadoEm`
- average delivery time
- slowest deliveries
- average delivery time by day/hour
- average delivery time by category/product mix
- average delivery time by table

No report UI is required in this change beyond preserving the data.

## SSE Contract

Current `novo_pedido` payload already includes structured item data with category metadata.

Required behavior:

- `novo_pedido`: kitchen and waiter queues add a new open order.
- `status_atualizado` with `entregue`: kitchen and waiter queues remove the order.

This keeps both active views in sync without requiring refresh.

## Testing Plan

### Unit/business tests

- Kitchen page fetches only `novo` pedidos.
- Kitchen card does not contain status mutation buttons.
- Waiter pending delivery page exists and requires `garcom`.
- Waiter redirect/default entry points to pending deliveries.
- `confirmarEntrega`:
  - requires `garcom`
  - rejects non-`novo` pedido
  - updates status to `entregue`
  - sets `entregueEm`
  - emits `status_atualizado`

### UI behavior tests

- Timer formatting returns `MM:SS` and `HH:MM:SS` correctly.
- Pending delivery cards group items by category.

### Regression checks

- Sending a new order still persists items atomically.
- Kitchen still receives live new orders.
- Admin persisted order views still load.

## Migration Notes

SQLite and PostgreSQL schemas both need `pedido.entregueEm` / `entregue_em`.

Existing orders with `status = 'entregue'` and `entregueEm = null` should be tolerated. Reports should ignore delivered-duration calculations when `entregueEm` is missing.

## Open Decisions Resolved

- The kitchen does not mark orders ready.
- The physical bell is the readiness signal.
- The waiter sees all pending deliveries, not only their own.
- Timer starts at order creation (`criadoEm`).
- Delivery confirmation by the waiter is the only operational status transition.
