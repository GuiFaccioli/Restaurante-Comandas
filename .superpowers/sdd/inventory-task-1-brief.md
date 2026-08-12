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

