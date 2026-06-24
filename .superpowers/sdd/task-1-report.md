Status: DONE_WITH_CONCERNS
Commits created: fad28d1 (test: lock waiter confirmation dispatch boundary)
One-line test summary: `npm test -- tests/unit/business/order-flow.test.ts tests/unit/actions/pedidos.test.ts` now fails only on the intended boundary assertions, with no Vitest auth/next import crash.
Concerns: `app/(admin)/pedidos/page.tsx` is still absent in this tree, so the persisted-orders test now fails red by design instead of falling back.
Report file path: .superpowers/sdd/task-1-report.md

Additional notes:
- Replaced the opaque namespace-cast pattern in `tests/unit/actions/pedidos.test.ts` with a direct named import of `confirmarPedido`.
- Kept the Vitest mocks above the import so hoisting still applies cleanly.
- This keeps the boundary explicit while preserving the intended RED state until `lib/actions/pedidos.ts` exports `confirmarPedido`.

Fix notes:
- Verified the reported leading `?import` characters are not literal in the inspected files, so no code change was needed for that point.
- Removed the fallback from `tests/unit/business/order-flow.test.ts`; admin persisted-orders visibility now hard-requires `app/(admin)/pedidos/page.tsx`, while kitchen checks `app/(cozinha)/dashboard/page.tsx` independently.
- Test command: `npm test -- tests/unit/business/order-flow.test.ts tests/unit/actions/pedidos.test.ts`
- Output summary: the focused suite still fails on the current implementation, including the intentional red check for the missing admin pedidos surface and existing waiter/action boundary mismatches.
- Added an explicit call-order assertion in `tests/unit/actions/pedidos.test.ts` so the happy-path now proves the item insert happens before `notifyKitchen`.
- The assertion uses Vitest's `mock.invocationCallOrder` on the item insert `values` mock and `notifyKitchen`, keeping the check readable and robust.
