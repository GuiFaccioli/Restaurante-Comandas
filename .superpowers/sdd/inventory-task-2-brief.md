### Task 2: Implement transactional shopping-list operations

**Files:**
- Create: `lib/shopping-list/service.ts`
- Modify: `lib/actions/estoque.ts`
- Modify: `tests/unit/actions/estoque.test.ts`

**Interfaces:**

```ts
export type CompleteShoppingListItemInput = {
  itemId: string; receivedQuantity?: string; idempotencyKey: string
}
export async function reconcileShoppingListInPostgresTransaction(
  tx: PostgresStockTransaction, tenantId: string, insumoId: string,
): Promise<void>
export async function completeShoppingListItem(
  input: CompleteShoppingListItemInput,
): Promise<void>
```

- [ ] **Step 1: Write failing action tests**

```ts
it('creates one automatic snapshot at minimum stock', async () => {
  await reconcileShoppingListInPostgresTransaction(tx as never, 'tenant-1', 'insumo-1')
  expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'automatic', insumoId: 'insumo-1', quantidadeSugerida: '8.000',
  }))
})
it('records edited receipt and removes automatic item atomically', async () => {
  await completeShoppingListItem({ itemId: 'row-1', receivedQuantity: '7', idempotencyKey: KEY })
  expect(deleteWhere).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/unit/actions/estoque.test.ts --maxWorkers=1`

Expected: FAIL because no shopping-list operation exists.

- [ ] **Step 3: Implement the operations**

Lock the inventory item and active list row with `FOR UPDATE`. Reconciliation inserts only if `atual <= minimo`, `ideal - atual > 0`, and no automatic row exists. Completion validates admin access and UUID key; manual rows are deleted only. Automatic rows normalize the edited received quantity, call `applyStockMovementInPostgresTransaction`, delete the row, and then reconcile the item again in the same transaction.

```ts
await applyStockMovementInPostgresTransaction(tx, {
  tenantId, usuarioId, insumoId: item.id, tipo: 'entrada', quantidade: Number(received),
  chaveIdempotencia: `shopping-list:${row.id}:${key}`,
  observacao: 'Entrada confirmada pela lista de compras',
})
```

Export `adicionarItemManualListaCompra({ nome, quantidade, unidade })` and `confirmarItemListaCompra(...)` from `lib/actions/estoque.ts`; never receive tenant ID from the browser.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/unit/actions/estoque.test.ts --maxWorkers=1`

Expected: PASS for tenant scope, duplicate click, frozen suggestion, automatic receipt, and manual removal.

```bash
git add lib/shopping-list/service.ts lib/actions/estoque.ts tests/unit/actions/estoque.test.ts
git commit -m "feat: manage shopping list replenishment"
```

