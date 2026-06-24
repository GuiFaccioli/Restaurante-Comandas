## Task 3 Report

- Implemented `confirmarPedido(mesaId, items)` as the only waiter dispatch boundary in `lib/actions/pedidos.ts`.
- Added pre-write validation for `mesaId`, empty carts, invalid items, and invalid products before creating `pedido`.
- Persisted `pedido` first, then all `item_pedido` rows, and only then emitted `notifyKitchen`.
- Removed the waiter page pre-created pedido flow from `app/(garcom)/mesa/[id]/page.tsx` and dropped obsolete `pedidoId` prop from `client.tsx`.
- Added minimal persisted admin pedidos surface at `app/(admin)/pedidos/page.tsx` backed by `from(pedido)`.
- Fixed critical review finding by wrapping `pedido` + `item_pedido` inserts in `db.transaction(...)` and moving `notifyKitchen` to run only after commit.
- Extended `tests/unit/actions/pedidos.test.ts` to prove transaction usage and that failed transactions never emit kitchen notifications.
- Verified focused tests pass:
  - `tests/unit/business/order-flow.test.ts`
  - `tests/unit/actions/pedidos.test.ts`
