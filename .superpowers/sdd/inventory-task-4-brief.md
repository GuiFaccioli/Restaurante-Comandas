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

