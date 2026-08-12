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

