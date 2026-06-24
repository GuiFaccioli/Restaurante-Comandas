Status: DONE_WITH_CONCERNS
Commits created: pending
One-line test summary: `npm test -- tests/unit/business/order-flow.test.ts` now passes the cart-drawer confirmation assertions and still fails only on the unrelated pre-created pedido/admin-surface checks.
Concerns: `app/(garcom)/mesa/[id]/page.tsx` still creates a pedido early, and `app/(admin)/pedidos/page.tsx` is absent in this tree, so the focused business suite remains red by design outside Task 2.
Report file path: .superpowers/sdd/task-2-report.md

Additional notes:
- Replaced `adicionarItem`/`enviarPedido` with the official `confirmarPedido(mesaId, items)` boundary in `components/garcom/cart-drawer.tsx`.
- Renamed the submit handler to `handleConfirmar` and updated the CTA/status copy to `Confirmar pedido` / `Confirmando...`.
- Preserved local cart behavior: item quantity controls, observation sheet, cart clearing, and drawer close on success.
- Added inline error feedback for the confirmation failure path.
