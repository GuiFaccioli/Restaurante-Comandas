# Inventory Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a pre-launch inventory workflow with one stock catalog, technical recipes, a persistent shopping list, and quantity-safe waiter ordering.

**Architecture:** Keep `insumo` as the tenant-scoped inventory record and surface it as **Estoque**. Persist active shopping-list rows. Use shared availability calculation in the waiter UI and PostgreSQL row locks as the authoritative order-acceptance guard.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, PostgreSQL/Neon, Server Actions, Zustand, Vitest, Tailwind CSS.

## Global Constraints

- Staging data is fictitious; change or reset it only when needed for a coherent implementation.
- Navigation exposes exactly Estoque, Ficha Técnica, and Lista de Compras.
- Create automatic replenishment at `estoqueAtual <= estoqueMinimo`; save `estoqueIdeal - estoqueAtual` as its immutable pending suggestion.
- At most one active automatic row exists per tenant and inventory item.
- Automatic completion records the editable received amount and removes its row atomically; manual completion only removes its row.
- The waiter can add exactly the available portions; the next addition shows `Sem estoque: <item>` for one second.
- Every database operation is tenant-scoped and no accepted order can leave stock negative.

---

## File Structure

- `db/migrations/202608101000_add_shopping_list.sql`, `lib/db/schema.ts` — active shopping-list persistence.
- `lib/shopping-list/service.ts`, `lib/actions/estoque.ts` — transactional reconciliation, completion, and admin actions.
- `app/admin/estoque/data.ts`, `client.tsx`, `lista-de-compras/page.tsx`, `components/admin/inventory-navigation.tsx` — three-tab admin UX.
- `lib/stock/availability.ts`, waiter page/client, menu/card/drawer, and `lib/store/cart.ts` — cart-aware availability.
- `lib/stock/order-consumption.ts` — atomic server-side stock validation at order acceptance.

### Task 1: Persist active shopping-list items

**Files:**
- Create: `db/migrations/202608101000_add_shopping_list.sql`
- Modify: `lib/db/schema.ts`
- Modify: `tests/unit/db/schema.test.ts`

**Interfaces:** Produces `shoppingListItem` with `id`, `tenantId`, `kind`, `insumoId`, `nome`, `unidade`, `quantidadeSugerida`, and `criadoEm`.

- [ ] **Step 1: Write the failing schema test**

```ts
it('declares tenant-scoped shopping-list items', () => {
  expect(Object.keys(shoppingListItem)).toEqual(expect.arrayContaining([
    'id', 'tenantId', 'kind', 'insumoId', 'nome', 'unidade', 'quantidadeSugerida', 'criadoEm',
  ]))
})
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- tests/unit/db/schema.test.ts --maxWorkers=1`

Expected: FAIL because `shoppingListItem` does not exist.

- [ ] **Step 3: Add schema and migration**

```sql
CREATE TABLE shopping_list_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('automatic', 'manual')),
  insumo_id UUID REFERENCES insumo(id), nome TEXT NOT NULL, unidade TEXT NOT NULL,
  quantidade_sugerida NUMERIC(12,3) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((kind = 'automatic' AND insumo_id IS NOT NULL) OR (kind = 'manual' AND insumo_id IS NULL))
);
CREATE UNIQUE INDEX shopping_list_active_automatic_item_unique
  ON shopping_list_item (tenant_id, insumo_id) WHERE kind = 'automatic';
```

Declare the matching Drizzle `pgTable`, including tenant/item composite foreign-key scope.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/unit/db/schema.test.ts --maxWorkers=1`

Expected: PASS.

```bash
git add db/migrations/202608101000_add_shopping_list.sql lib/db/schema.ts tests/unit/db/schema.test.ts
git commit -m "feat: persist shopping list items"
```

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

### Task 3: Consolidate the admin inventory UI

**Files:**
- Create: `app/admin/estoque/lista-de-compras/page.tsx`
- Modify: `components/admin/inventory-navigation.tsx`
- Modify: `app/admin/estoque/page.tsx`, `insumos/page.tsx`, `saldos/page.tsx`
- Modify: `app/admin/estoque/data.ts`, `app/admin/estoque/client.tsx`
- Test: `tests/unit/business/inventory-ui.test.ts`

**Interfaces:** `loadInventoryData(tenantId)` returns `{ insumos, produtos, fichas, shoppingListItems }`; client `view` becomes `'estoque' | 'ficha' | 'lista'`.

- [ ] **Step 1: Write a failing navigation contract**

```ts
expect(source('components/admin/inventory-navigation.tsx')).toContain(
  "{ href: '/admin/estoque/lista-de-compras', label: 'Lista de compras' }",
)
expect(source('components/admin/inventory-navigation.tsx')).not.toContain("label: 'Insumos'")
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/unit/business/inventory-ui.test.ts --maxWorkers=1`

Expected: FAIL because the third link and route are absent.

- [ ] **Step 3: Implement the three views**

Render stock registration and balances together at `/admin/estoque`; retain unit conversion and cost support but use `Item`, `Saldo atual`, `Mínimo`, and `Ideal` labels. Redirect legacy `insumos` and `saldos` URLs to this route. Keep the recipe relation unchanged but call its selected components `Item de estoque`.

The shopping-list view separates automatic and manual rows. Automatic confirmation opens an editable field prefilled from `quantidadeSugerida`; manual creation accepts exactly name, quantity, and unit. Generate one UUID intent key per payload, disable duplicate submissions, display action errors, and refresh after success.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/unit/business/inventory-ui.test.ts --maxWorkers=1 && npm run build`

Expected: PASS and build exit code 0.

```bash
git add app/admin/estoque components/admin/inventory-navigation.tsx tests/unit/business/inventory-ui.test.ts
git commit -m "feat: unify inventory administration"
```

### Task 4: Add cart-aware availability

**Files:**
- Modify: `lib/stock/availability.ts`, `lib/store/cart.ts`
- Create: `tests/unit/stock/availability.test.ts`
- Modify: `app/garcom/mesa/[id]/page.tsx`, `app/garcom/mesa/[id]/client.tsx`
- Modify: `components/garcom/menu-grid.tsx`, `item-card.tsx`, `cart-drawer.tsx`

**Interfaces:**

```ts
export function getProductAvailability(
  produtoId: string,
  cartItems: Array<{ produtoId: string; quantidade: number }>,
  recipes: ReceitaDisponibilidade[],
  balances: Array<{ id: string; nome: string; estoqueAtual: string }>,
): { maxAdditionalQuantity: number | null; limitingItemName: string | null }
```

`null` means uncontrolled stock. `useCart.addItem(item, maxQuantity?)` returns `boolean` and does not mutate when at its cap.

- [ ] **Step 1: Write failing availability tests**

```ts
expect(getProductAvailability('prato', [], recipes, balances)).toEqual({
  maxAdditionalQuantity: 5, limitingItemName: 'Farinha',
})
expect(getProductAvailability('prato', [{ produtoId: 'prato', quantidade: 5 }], recipes, balances))
  .toEqual({ maxAdditionalQuantity: 0, limitingItemName: 'Farinha' })
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- tests/unit/stock/availability.test.ts --maxWorkers=1`

Expected: FAIL because only boolean availability exists.

- [ ] **Step 3: Implement the capacity calculation and UI guard**

Aggregate cart demand by inventory item, subtract it from balances, and use the lowest `floor(remaining / recipe quantity)` as the candidate cap. Pass recipes and named balances from the waiter page to the client. Disable additions at the cap in both product cards and drawer. On rejection, show:

```ts
toast.error(`Sem estoque: ${availability.limitingItemName}`, { duration: 1000 })
```

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/unit/stock/availability.test.ts tests/unit/store/cart.test.ts --maxWorkers=1`

Expected: PASS; five available portions are accepted and the sixth does not mutate cart state.

```bash
git add lib/stock/availability.ts lib/store/cart.ts app/garcom/mesa components/garcom tests/unit/stock/availability.test.ts tests/unit/store/cart.test.ts
git commit -m "feat: cap waiter orders by stock availability"
```

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

### Task 6: Full verification on staging

**Files:** Modify only a concrete defect found by verification.

- [ ] **Step 1: Run focused regression suites**

Run: `npm test -- tests/unit/actions/estoque.test.ts tests/unit/stock/availability.test.ts tests/unit/stock/order-consumption.test.ts tests/unit/store/cart.test.ts tests/unit/business/inventory-ui.test.ts --maxWorkers=1`

Expected: PASS.

- [ ] **Step 2: Build production bundle**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 3: Apply migration to staging and manually accept**

Run: `npm run db:migrate`

Expected: migration applies once. In staging, verify: `2 kg` minimum and `10 kg` ideal creates frozen `8 kg`; edit receipt to `7 kg`; list row disappears and stock increases; manual `2 unidades` row disappears without stock mutation; five available portions can be added and sixth is blocked with the limiting item.

- [ ] **Step 4: Review scope**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and no unrelated files staged. Do not create an empty verification commit.
