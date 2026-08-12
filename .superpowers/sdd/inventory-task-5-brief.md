### Task 5: Enforce stock at order acceptance

**Files:**
- Modify: `lib/stock/order-consumption.ts`, `components/garcom/cart-drawer.tsx`
- Modify: `tests/unit/stock/order-consumption.test.ts`, `tests/unit/actions/pedidos.test.ts`

**Interfaces:** `createOrderInPostgresTransaction` consumes snapshots before it succeeds; new-order cancellation creates a single matching `estorno`; later kitchen transition must not consume twice.

- [ ] **Step 1: Write failing transactional tests**

```ts
it('rejects creation when locked aggregate demand exceeds stock', async () => {
  mocks.lockStockItemInPostgresTransaction.mockResolvedValue({ nome: 'Farinha', estoqueAtual: '4.000' })
  await expect(createOrderInPostgresTransaction(tx as never, twoPortionInput))
    .rejects.toThrow('Não há estoque suficiente para Farinha')
})
it('consumes at creation and reverses a cancelled new order once', async () => {
  await createOrderInPostgresTransaction(tx as never, input)
  await cancelOrderInPostgresTransaction(tx as never, cancelInput)
  expect(mocks.applyStockMovementInPostgresTransaction).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'estorno' }))
})
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/unit/stock/order-consumption.test.ts --maxWorkers=1`

Expected: FAIL because the current implementation consumes only on kitchen transition.

- [ ] **Step 3: Move the authoritative guard**

After `itemPedidoInsumo` snapshots are inserted, prepare deterministic movements, lock stock IDs in sorted order, validate aggregated demand, and apply `saida` movements before returning order success. In cancellation of a `novo` order, lock/load snapshots and apply idempotent `estorno` movements before status update. Remove the creation-to-preparation consumption branch to avoid double consumption. Preserve the specific insufficient-stock error in `CartDrawer` so the cart remains editable.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/unit/stock/order-consumption.test.ts tests/unit/actions/pedidos.test.ts --maxWorkers=1`

Expected: PASS for insufficient stock, idempotency, cancellation reversal, and no-negative concurrency boundary.

```bash
git add lib/stock/order-consumption.ts components/garcom/cart-drawer.tsx tests/unit/stock/order-consumption.test.ts tests/unit/actions/pedidos.test.ts
git commit -m "fix: validate stock when accepting orders"
```

