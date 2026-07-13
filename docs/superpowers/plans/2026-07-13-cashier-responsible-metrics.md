# Cashier Responsible Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three `/admin/pedidos` metrics accessible interactive controls that reveal the tenant-safe waiter or cashier responsible for each listed order.

**Architecture:** Persist an optional order creator and keep historical rows nullable. Enrich `getCashierOrders` with tenant-scoped user membership resolution and minimal registered-payment metadata, then derive the selected responsibility panel entirely from the existing `pedidos` client state so polling and SSE refresh data without resetting the selection. Extend `AdminStatCard` with optional button behavior while preserving its current static `<div>` rendering contract.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Drizzle ORM (PostgreSQL and SQLite schemas), Vitest 4, Testing Library, Tailwind CSS 4.

## Global Constraints

- `Pedidos na fila` uses the waiter who created the order.
- `Pagamentos pendentes` uses the waiter who created the order.
- `Pagos` uses the cashier who registered the active payment.
- Historical or tenant-unresolvable users render exactly `Responsável não registrado`; do not backfill or infer them.
- Resolve user names only through a `tenant_user` membership constrained by the order/payment `tenantId`; never resolve names globally from `usuario.id` alone.
- Keep `pedido.created_by_user_id` nullable and populate it only for newly confirmed waiter orders.
- Reuse `pagamento_pedido.registrado_por_usuario_id`; do not change payment rules or assign a cashier to pending payments.
- Do not change routes, permissions, order status transitions, delivery behavior, SSE/polling frequency (`5000` ms), or existing payment-form/order-expansion preservation rules.
- `AdminStatCard` must remain backward compatible: without an activation callback it renders a non-interactive static card.
- Interactive cards must use real `button` elements, visible focus, `aria-expanded`, `aria-controls`, a comfortable touch target, and a non-color-only expanded-state cue.
- Keep responsibility-panel composition in `AdminPedidosLive`; do not create a second source of server/client state.
- Keep current responsive behavior from 320 px through desktop; panel rows stack on small screens and scan horizontally on wider screens.
- Use strict TDD: add each failing test first, observe the expected failure, implement only enough to pass, then commit that independently reviewable slice.
- Preserve all unrelated working-tree edits, especially `app/admin/layout.tsx`, `app/globals.css`, `components/admin/admin-page.tsx`, `tests/unit/business/order-flow.test.ts`, `DESIGNTESTE.MD`, and `.impeccable/critique/2026-07-10T18-36-09Z__app-admin.md`. When editing `components/admin/admin-page.tsx`, patch the current working copy; never restore or overwrite its redesign changes.
- Never add `Co-Authored-By` or AI attribution; use only the conventional commits listed below.
- The five task commit subjects are required checkpoints, not an exclusive commit list. Fresh review may add zero or more precise conventional `fix(<scope>): <correction>` commits; every such commit must stay inside the recorded feature range and describe the actual correction.

## File Structure

- `db/migrations/202607131200_add_pedido_creator.sql` — additive production migration for nullable order authorship and its lookup index.
- `lib/db/schema.ts` — PostgreSQL Drizzle field for `pedido.createdByUserId`.
- `lib/db/schema-sqlite.ts` — SQLite development/test mirror of the nullable field.
- `db/schema.sql` — reference/bootstrap SQL kept aligned with the migration; its FK is added after `usuario` exists because `pedido` is declared first.
- `tests/unit/db/schema.test.ts` — schema/migration regression coverage.
- `lib/actions/pedidos.ts` — writes authenticated waiter `usuarioId` into new orders.
- `tests/unit/actions/pedidos.test.ts` — action persistence regression.
- `lib/orders/queries.ts` — tenant-scoped responsible lookup and enriched `CashierOrder` contract.
- `tests/unit/business/cashier-orders.test.ts` — cashier response-contract regression.
- `tests/unit/business/cashier-orders-query.test.ts` — `getCashierOrders` integration tests with realistic chained-DB mocks, mixed-tenant candidates, and reversed payments.
- `components/admin/admin-page.tsx` — optional interactive behavior for `AdminStatCard`, retaining static behavior.
- `app/admin/pedidos/client.tsx` — selected-metric state and responsive responsibility panel derived from `pedidos`.
- `tests/unit/business/cashier-responsible-metrics.test.ts` — component interaction, fallback, empty-state, SSE, polling, and static-card regressions.

## Recorded Feature Base

Before Task 1 changes any file, record the exact starting commit in Git's local metadata:

```bash
git rev-parse HEAD > .git/cashier-responsible-metrics.base
cat .git/cashier-responsible-metrics.base
```

Expected: the second command prints one 40-character commit hash. Keep this untracked `.git/` marker through Task 6. All final range audits must use `$(cat .git/cashier-responsible-metrics.base)..HEAD`; never assume a fixed number of feature commits because review/correction commits may be added during execution.

---

### Task 1: Add nullable order authorship to every schema source

**Files:**
- Create: `db/migrations/202607131200_add_pedido_creator.sql`
- Modify: `lib/db/schema.ts:91-106`
- Modify: `lib/db/schema-sqlite.ts:51-66`
- Modify: `db/schema.sql:69-80,108-121,160-178`
- Modify: `tests/unit/db/schema.test.ts:39-58,109-132`

**Interfaces:**
- Consumes: existing `usuario.id` identity and `pedido` table.
- Produces: nullable Drizzle property `pedido.createdByUserId: string | null`, backed by SQL column `pedido.created_by_user_id` and index `idx_pedido_created_by_user_id`.

- [ ] **Step 1: Write the failing schema and migration tests**

Add `existsSync` to the Node FS import and add these assertions to the existing `pedido table`, `sqlite schema source`, and `schema reference files` sections:

```ts
import { existsSync, readFileSync } from 'node:fs'

// Inside describe('pedido table'):
it('stores nullable creator identity for new orders', () => {
  expect(Object.keys(pedido)).toContain('createdByUserId')
})

// Inside describe('sqlite schema source'):
it('mirrors nullable order creator identity in SQLite', () => {
  const sqliteSchema = readFileSync(join(process.cwd(), 'lib/db/schema-sqlite.ts'), 'utf8')

  expect(sqliteSchema).toContain("createdByUserId: text('created_by_user_id')")
  expect(sqliteSchema).not.toMatch(/createdByUserId:[\s\S]{0,100}\.notNull\(\)/)
})

// Inside describe('schema reference files'):
it('ships an additive nullable order creator migration without speculative backfill', () => {
  const migrationPath = join(
    process.cwd(),
    'db/migrations/202607131200_add_pedido_creator.sql'
  )

  expect(existsSync(migrationPath)).toBe(true)
  const migration = readFileSync(migrationPath, 'utf8')
  expect(migration).toContain('ADD COLUMN IF NOT EXISTS created_by_user_id UUID')
  expect(migration).toContain('REFERENCES usuario(id)')
  expect(migration).toContain('idx_pedido_created_by_user_id')
  expect(migration).not.toMatch(/UPDATE\s+pedido/i)
})

it('declares the reference-schema creator foreign key only after usuario exists', () => {
  const sqlSchema = readFileSync(join(process.cwd(), 'db/schema.sql'), 'utf8')
  const pedidoStart = sqlSchema.indexOf('CREATE TABLE pedido')
  const pedidoEnd = sqlSchema.indexOf(');', pedidoStart)
  const usuarioStart = sqlSchema.indexOf('CREATE TABLE usuario')
  const usuarioEnd = sqlSchema.indexOf(');', usuarioStart)
  const creatorForeignKey = sqlSchema.indexOf(
    'ADD CONSTRAINT pedido_created_by_user_id_fkey'
  )

  expect(pedidoStart).toBeGreaterThanOrEqual(0)
  expect(usuarioStart).toBeGreaterThan(pedidoEnd)
  expect(creatorForeignKey).toBeGreaterThan(usuarioEnd)
  const pedidoDefinition = sqlSchema.slice(pedidoStart, pedidoEnd)
  expect(pedidoDefinition).toContain('created_by_user_id UUID')
  expect(pedidoDefinition).not.toMatch(/created_by_user_id\s+UUID\s+NOT NULL/)
  expect(sqlSchema.slice(pedidoStart, pedidoEnd)).not.toContain(
    'created_by_user_id UUID REFERENCES usuario(id)'
  )
})
```

- [ ] **Step 2: Run the schema test to verify RED**

Run:

```bash
npm test -- tests/unit/db/schema.test.ts
```

Expected: FAIL because `pedido.createdByUserId`, the migration file, and the post-`usuario` reference-schema FK do not exist.

- [ ] **Step 3: Add the PostgreSQL and SQLite Drizzle fields**

Add this property immediately after `mesaId` in both `pedido` definitions.

In `lib/db/schema.ts`:

```ts
createdByUserId: uuid('created_by_user_id').references(() => usuario.id, {
  onDelete: 'set null',
}),
```

In `lib/db/schema-sqlite.ts`:

```ts
createdByUserId: text('created_by_user_id').references(() => usuario.id, {
  onDelete: 'set null',
}),
```

Do not append `.notNull()` in either schema. The lazy reference callback is intentional even though `usuario` is declared later in each module.

- [ ] **Step 4: Create the additive production migration**

Create `db/migrations/202607131200_add_pedido_creator.sql` with exactly:

```sql
ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID
  REFERENCES usuario(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedido_created_by_user_id
  ON pedido(created_by_user_id);
```

- [ ] **Step 5: Align the reference SQL without an invalid forward reference**

In the `CREATE TABLE pedido` block in `db/schema.sql`, add the column without an inline FK because `usuario` is created later:

```sql
  created_by_user_id UUID,
```

Immediately after the closing `);` of `CREATE TABLE usuario`, add:

```sql
ALTER TABLE pedido
  ADD CONSTRAINT pedido_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES usuario(id) ON DELETE SET NULL;
```

Add this index alongside the other `pedido` indexes:

```sql
CREATE INDEX idx_pedido_created_by_user_id ON pedido(created_by_user_id);
```

- [ ] **Step 6: Run the schema test to verify GREEN**

Run:

```bash
npm test -- tests/unit/db/schema.test.ts
```

Expected: PASS with all schema sources and the no-backfill assertion aligned.

- [ ] **Step 7: Commit the schema slice**

```bash
git add db/migrations/202607131200_add_pedido_creator.sql db/schema.sql lib/db/schema.ts lib/db/schema-sqlite.ts tests/unit/db/schema.test.ts
git commit -m "feat(db): add nullable order creator"
```

---

### Task 2: Persist the authenticated waiter on new orders

**Files:**
- Modify: `tests/unit/actions/pedidos.test.ts:7-78,80-132`
- Modify: `lib/actions/pedidos.ts:19-73`

**Interfaces:**
- Consumes: `requireAccess('garcom'): Promise<{ usuarioId: string; tenantId: string; access: AcessoUsuario }>` and `pedido.createdByUserId` from Task 1.
- Produces: unchanged public signature `confirmarPedido(mesaId: string, items: ConfirmarPedidoItem[]): Promise<{ id: string }>`; new orders include `createdByUserId` in the atomic insert.

- [ ] **Step 1: Extend the action mock schema and failing persistence assertion**

Add the mocked column:

```ts
pedido: {
  id: 'pedido.id',
  tenantId: 'pedido.tenant_id',
  mesaId: 'pedido.mesa_id',
  createdByUserId: 'pedido.created_by_user_id',
  status: 'pedido.status',
  criadoEm: 'pedido.criado_em',
  entregueEm: 'pedido.entregue_em',
  atualizadoEm: 'pedido.atualizado_em',
},
```

In `persists the official order atomically and emits novo_pedido after confirmation`, require the creator in the first inserted value:

```ts
expect(itemValues).toHaveBeenNthCalledWith(1, {
  id: expect.any(String),
  tenantId: 'tenant-1',
  mesaId: 'mesa-1',
  createdByUserId: 'user-1',
  status: 'novo',
  criadoEm: expect.any(Date),
  entregueEm: null,
  atualizadoEm: expect.any(Date),
})
```

Also add this focused access regression:

```ts
it('uses the authenticated waiter as the order creator', async () => {
  const { confirmarPedido } = await import('@/lib/actions/pedidos')
  const values = vi.fn()
  const txInsert = vi.fn().mockReturnValue({
    values: values.mockReturnValue({ run: vi.fn() }),
  })

  mockSynchronousTransaction(txInsert)
  mockProductSelect({ nome: 'Mussarela', preco: '48.00', categoriaNome: 'Pizzas' })
  mocks.db.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ numero: 4 }]),
    }),
  })

  await confirmarPedido('mesa-1', [{ produtoId: 'produto-1', quantidade: 1 }])

  expect(mocks.requireAccess).toHaveBeenCalledWith('garcom')
  expect(values).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      tenantId: 'tenant-1',
      createdByUserId: 'user-1',
    })
  )
})
```

- [ ] **Step 2: Run the action test to verify RED**

Run:

```bash
npm test -- tests/unit/actions/pedidos.test.ts
```

Expected: FAIL because the insert does not contain `createdByUserId`.

- [ ] **Step 3: Persist the authenticated user in the existing transaction**

Change the access destructuring and order values in `confirmarPedido`:

```ts
const { usuarioId, tenantId } = await requireAccess('garcom')

// Existing validation and lookups remain unchanged.

const pedidoValues = {
  id: novoPedidoId,
  tenantId,
  mesaId,
  createdByUserId: usuarioId,
  status: 'novo' as const,
  criadoEm: now,
  entregueEm: null,
  atualizadoEm: now,
}
```

Do not add a second insert/update, and do not change the transaction or notification ordering.

- [ ] **Step 4: Run the action test to verify GREEN**

Run:

```bash
npm test -- tests/unit/actions/pedidos.test.ts
```

Expected: PASS; the order and items remain atomic, and SSE notification still occurs only after persistence.

- [ ] **Step 5: Commit the action slice**

```bash
git add lib/actions/pedidos.ts tests/unit/actions/pedidos.test.ts
git commit -m "feat(orders): record authenticated waiter"
```

---

### Task 3: Return tenant-safe creators and payment registrars to the cashier

**Files:**
- Modify: `tests/unit/business/cashier-orders.test.ts`
- Create: `tests/unit/business/cashier-orders-query.test.ts`
- Modify: `lib/orders/queries.ts:1-17,83-158`

**Interfaces:**
- Consumes: `pedido.createdByUserId`, registered `pagamentoPedido` rows, `tenantUser(tenantId, usuarioId)`, and `usuario.nome`.
- Produces:

```ts
export type CashierResponsible = {
  usuarioId: string
  nome: string
}

export type CashierPayment = {
  valor: number
  registradoEm: string
  registradoPor: CashierResponsible | null
}

export type CashierOrder = TableOrder & {
  mesaNumero: number
  pagamentoStatus: 'pendente' | 'pago'
  criadoPor: CashierResponsible | null
  pagamento: CashierPayment | null
}

export type CashierResponsibleMembership = CashierResponsible & {
  tenantId: string
}

export function resolveTenantResponsible(
  memberships: CashierResponsibleMembership[],
  tenantId: string,
  usuarioId: string | null
): CashierResponsible | null

export function findRegisteredPayment<
  T extends { pedidoId: string; status: StatusPagamento },
>(payments: T[], pedidoId: string): T | undefined
```

- [ ] **Step 1: Add the failing cashier response-contract assertions**

Extend `tests/unit/business/cashier-orders.test.ts` with:

```ts
it('returns optional order creator and registered payment metadata', () => {
  const queries = readProjectFile('lib/orders/queries.ts')

  expect(queries).toContain('export type CashierResponsible')
  expect(queries).toContain('criadoPor: CashierResponsible | null')
  expect(queries).toContain('pagamento: CashierPayment | null')
  expect(queries).toContain('createdByUserId: pedido.createdByUserId')
  expect(queries).toContain('registradoPorUsuarioId: pagamentoPedido.registradoPorUsuarioId')
  expect(queries).toContain('valor: pagamentoPedido.valor')
  expect(queries).toContain('registradoEm: pagamentoPedido.registradoEm')
})
```

Do not add source-string assertions for tenant safety or reversed payments. Those behaviors require executable fixtures in the next step.

- [ ] **Step 2: Add behavioral tenant-separated and reversed-payment tests**

Create `tests/unit/business/cashier-orders-query.test.ts` with exactly:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
}))

vi.mock('@/lib/db/index', () => ({ db: mocks.db }))

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conditions: unknown[]) => conditions),
  desc: vi.fn((column: unknown) => column),
  eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  inArray: vi.fn((left: unknown, right: unknown[]) => ({ left, right })),
  ne: vi.fn((left: unknown, right: unknown) => ({ left, right })),
}))

vi.mock('@/lib/db/schema', () => ({
  pedido: {
    id: 'pedido.id', tenantId: 'pedido.tenant_id', mesaId: 'pedido.mesa_id',
    createdByUserId: 'pedido.created_by_user_id', status: 'pedido.status',
    criadoEm: 'pedido.criado_em', entregueEm: 'pedido.entregue_em',
  },
  mesa: { id: 'mesa.id', tenantId: 'mesa.tenant_id', numero: 'mesa.numero' },
  itemPedido: {
    pedidoId: 'item_pedido.pedido_id', produtoId: 'item_pedido.produto_id',
    quantidade: 'item_pedido.quantidade', precoUnitario: 'item_pedido.preco_unitario',
    observacao: 'item_pedido.observacao',
  },
  produto: { id: 'produto.id', nome: 'produto.nome' },
  pagamentoPedido: {
    pedidoId: 'pagamento_pedido.pedido_id', tenantId: 'pagamento_pedido.tenant_id',
    status: 'pagamento_pedido.status',
    registradoPorUsuarioId: 'pagamento_pedido.registrado_por_usuario_id',
    valor: 'pagamento_pedido.valor', registradoEm: 'pagamento_pedido.registrado_em',
  },
  tenantUser: {
    tenantId: 'tenant_user.tenant_id', usuarioId: 'tenant_user.usuario_id',
  },
  usuario: { id: 'usuario.id', nome: 'usuario.nome' },
}))

import { getCashierOrders } from '@/lib/orders/queries'

type PaymentRow = {
  pedidoId: string
  status: 'registrado' | 'estornado'
  registradoPorUsuarioId: string
  valor: string
  registradoEm: Date
}

type MembershipRow = { tenantId: string; usuarioId: string; nome: string }

function mockCashierQuery(input: {
  createdByUserId: string | null
  payments: PaymentRow[]
  memberships: MembershipRow[]
}) {
  const order = {
    id: 'order-a', status: 'entregue' as const,
    criadoEm: new Date('2026-07-13T12:00:00.000Z'),
    entregueEm: new Date('2026-07-13T12:15:00.000Z'),
    mesaNumero: 4, createdByUserId: input.createdByUserId,
  }

  mocks.db.select
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy: vi.fn(async () => [order]) })),
        })),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn(async () => []) })),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({ where: vi.fn(async () => input.payments) })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn(async () => input.memberships) })),
      })),
    })
}

beforeEach(() => {
  mocks.db.select.mockReset()
})

describe('getCashierOrders responsible integration', () => {
  it('does not leak mixed-tenant creator or registrar names from query candidates', async () => {
    mockCashierQuery({
      createdByUserId: 'waiter-b',
      payments: [{
        pedidoId: 'order-a', status: 'registrado',
        registradoPorUsuarioId: 'cashier-b', valor: '90.00',
        registradoEm: new Date('2026-07-13T12:30:00.000Z'),
      }],
      memberships: [
        { tenantId: 'tenant-a', usuarioId: 'waiter-a', nome: 'Alice Garçom' },
        { tenantId: 'tenant-b', usuarioId: 'waiter-b', nome: 'Bruno Garçom' },
        { tenantId: 'tenant-b', usuarioId: 'cashier-b', nome: 'Bianca Caixa' },
      ],
    })

    const [order] = await getCashierOrders({ tenantId: 'tenant-a' })

    expect(order.criadoPor).toBeNull()
    expect(order.pagamentoStatus).toBe('pago')
    expect(order.pagamento?.registradoPor).toBeNull()
  })

  it('treats an estornado-only order as pending with no payment metadata', async () => {
    mockCashierQuery({
      createdByUserId: 'waiter-a',
      payments: [{
        pedidoId: 'order-a', status: 'estornado',
        registradoPorUsuarioId: 'cashier-a', valor: '48.00',
        registradoEm: new Date('2026-07-13T12:30:00.000Z'),
      }],
      memberships: [
        { tenantId: 'tenant-a', usuarioId: 'waiter-a', nome: 'Alice Garçom' },
        { tenantId: 'tenant-a', usuarioId: 'cashier-a', nome: 'Carlos Caixa' },
      ],
    })

    const [order] = await getCashierOrders({ tenantId: 'tenant-a' })

    expect(order.criadoPor).toEqual({ usuarioId: 'waiter-a', nome: 'Alice Garçom' })
    expect(order.pagamentoStatus).toBe('pendente')
    expect(order.pagamento).toBeNull()
  })

  it('returns matching-tenant creator and active payment registrar', async () => {
    mockCashierQuery({
      createdByUserId: 'waiter-a',
      payments: [{
        pedidoId: 'order-a', status: 'registrado',
        registradoPorUsuarioId: 'cashier-a', valor: '48.00',
        registradoEm: new Date('2026-07-13T12:30:00.000Z'),
      }],
      memberships: [
        { tenantId: 'tenant-a', usuarioId: 'waiter-a', nome: 'Alice Garçom' },
        { tenantId: 'tenant-a', usuarioId: 'cashier-a', nome: 'Carlos Caixa' },
        { tenantId: 'tenant-b', usuarioId: 'cashier-b', nome: 'Bianca Caixa' },
      ],
    })

    const [order] = await getCashierOrders({ tenantId: 'tenant-a' })

    expect(order.criadoPor).toEqual({ usuarioId: 'waiter-a', nome: 'Alice Garçom' })
    expect(order.pagamento).toEqual({
      valor: 48,
      registradoEm: '2026-07-13T12:30:00.000Z',
      registradoPor: { usuarioId: 'cashier-a', nome: 'Carlos Caixa' },
    })
  })
})
```

These tests execute `getCashierOrders`, feed mixed-tenant membership rows through its real mapping path, and feed `estornado` through its real payment selection path. Calling the helpers only in isolation is insufficient.

- [ ] **Step 3: Run both cashier tests to verify RED**

Run:

```bash
npm test -- tests/unit/business/cashier-orders.test.ts tests/unit/business/cashier-orders-query.test.ts
```

Expected: FAIL because `CashierOrder` has no responsible/payment fields and `resolveTenantResponsible`/`findRegisteredPayment` are not exported.

- [ ] **Step 4: Extend imports, the cashier data contract, and behavioral helpers**

Change the schema import and replace the current `CashierOrder` declaration:

```ts
import {
  itemPedido,
  mesa,
  pagamentoPedido,
  pedido,
  produto,
  tenantUser,
  usuario,
} from '@/lib/db/schema'
import type { StatusPagamento } from '@/lib/db/schema'

export type CashierResponsible = {
  usuarioId: string
  nome: string
}

export type CashierPayment = {
  valor: number
  registradoEm: string
  registradoPor: CashierResponsible | null
}

export type CashierOrder = TableOrder & {
  mesaNumero: number
  pagamentoStatus: 'pendente' | 'pago'
  criadoPor: CashierResponsible | null
  pagamento: CashierPayment | null
}

export type CashierResponsibleMembership = CashierResponsible & {
  tenantId: string
}

export function resolveTenantResponsible(
  memberships: CashierResponsibleMembership[],
  tenantId: string,
  usuarioId: string | null
): CashierResponsible | null {
  if (!usuarioId) return null

  const membership = memberships.find(
    (candidate) => candidate.tenantId === tenantId && candidate.usuarioId === usuarioId
  )

  return membership
    ? { usuarioId: membership.usuarioId, nome: membership.nome }
    : null
}

export function findRegisteredPayment<
  T extends { pedidoId: string; status: StatusPagamento },
>(payments: T[], pedidoId: string): T | undefined {
  return payments.find(
    (payment) => payment.pedidoId === pedidoId && payment.status === 'registrado'
  )
}
```

- [ ] **Step 5: Select creator and payment metadata**

Add `createdByUserId` to the order select:

```ts
createdByUserId: pedido.createdByUserId,
```

Replace the payment select with:

```ts
const pagamentos =
  orderIds.length > 0
    ? await db
        .select({
          pedidoId: pagamentoPedido.pedidoId,
          status: pagamentoPedido.status,
          registradoPorUsuarioId: pagamentoPedido.registradoPorUsuarioId,
          valor: pagamentoPedido.valor,
          registradoEm: pagamentoPedido.registradoEm,
        })
        .from(pagamentoPedido)
        .where(
          and(
            eq(pagamentoPedido.tenantId, input.tenantId),
            inArray(pagamentoPedido.pedidoId, orderIds)
          )
        )
    : []
```

- [ ] **Step 6: Resolve names through the selected tenant only**

Insert this block after loading payments and before mapping orders:

```ts
const responsibleUserIds = [
  ...new Set([
    ...orders.map((order) => order.createdByUserId),
    ...pagamentos.map((pagamento) => pagamento.registradoPorUsuarioId),
  ].filter((usuarioId): usuarioId is string => Boolean(usuarioId))),
]

const responsibleUsers =
  responsibleUserIds.length > 0
    ? await db
        .select({
          tenantId: tenantUser.tenantId,
          usuarioId: tenantUser.usuarioId,
          nome: usuario.nome,
        })
        .from(tenantUser)
        .innerJoin(usuario, eq(tenantUser.usuarioId, usuario.id))
        .where(
          and(
            eq(tenantUser.tenantId, input.tenantId),
            inArray(tenantUser.usuarioId, responsibleUserIds)
          )
        )
    : []

```

The SQL predicate limits fetched memberships, and `resolveTenantResponsible` independently requires `tenantId` again when mapping. This defense in depth makes the behavioral tenant-separated fixtures pass even if a future query accidentally supplies mixed-tenant candidates.

- [ ] **Step 7: Map active payment and optional responsible records through the tested helpers**

Replace the current `pagamentoStatus` calculation and extend the return object:

```ts
const pagamentoRegistrado = findRegisteredPayment(pagamentos, order.id)
const criadoPor = resolveTenantResponsible(
  responsibleUsers,
  input.tenantId,
  order.createdByUserId
)
const registradoPor = pagamentoRegistrado
  ? resolveTenantResponsible(
      responsibleUsers,
      input.tenantId,
      pagamentoRegistrado.registradoPorUsuarioId
    )
  : null

return {
  id: order.id,
  status: order.status,
  criadoEm: order.criadoEm.toISOString(),
  entregueEm: order.entregueEm?.toISOString() ?? null,
  mesaNumero: order.mesaNumero,
  total,
  pagamentoStatus: pagamentoRegistrado ? 'pago' : 'pendente',
  criadoPor,
  pagamento: pagamentoRegistrado
    ? {
        valor: Number(pagamentoRegistrado.valor),
        registradoEm: pagamentoRegistrado.registradoEm.toISOString(),
        registradoPor,
      }
    : null,
  itens,
}
```

- [ ] **Step 8: Run behavioral and contract coverage to verify GREEN**

Run:

```bash
npm test -- tests/unit/business/cashier-orders.test.ts tests/unit/business/cashier-orders-query.test.ts
```

Expected: PASS. Mixed-tenant creator/registrar fixtures resolve to `null`, matching-tenant fixtures resolve to names, and an `estornado` payment is ignored.

- [ ] **Step 9: Commit the query slice**

```bash
git add lib/orders/queries.ts tests/unit/business/cashier-orders.test.ts tests/unit/business/cashier-orders-query.test.ts
git commit -m "feat(cashier): return tenant-safe responsibles"
```

---

### Task 4: Make `AdminStatCard` optionally interactive without breaking static cards

**Files:**
- Create: `tests/unit/business/cashier-responsible-metrics.test.ts`
- Modify: `components/admin/admin-page.tsx:40-84`

**Interfaces:**
- Consumes: existing `label`, `value`, `detail`, and `tone` props.
- Produces optional props `onClick?: () => void`, `expanded?: boolean`, and `controls?: string`. Static calls remain source-compatible and render a `<div>`; interactive calls render `<button type="button">`.

- [ ] **Step 1: Create failing static and interactive card tests**

Create `tests/unit/business/cashier-responsible-metrics.test.ts` with:

```ts
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AdminStatCard } from '@/components/admin/admin-page'

afterEach(() => {
  cleanup()
})

describe('AdminStatCard', () => {
  it('keeps existing usages static when no activation callback is provided', () => {
    const { container } = render(
      createElement(AdminStatCard, {
        label: 'Pedidos registrados',
        value: 12,
        detail: 'Resumo estático',
      })
    )

    expect(container.querySelector('button')).toBeNull()
    expect(screen.getByText('Pedidos registrados').closest('div')).toBeInTheDocument()
  })

  it('renders an accessible real button with explicit expanded state', () => {
    const onClick = vi.fn()
    render(
      createElement(AdminStatCard, {
        label: 'Pagos',
        value: 3,
        detail: 'Pedidos baixados',
        onClick,
        expanded: true,
        controls: 'cashier-responsibility-panel',
      })
    )

    const button = screen.getByRole('button', { name: /Pagos/ })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('aria-controls', 'cashier-responsibility-panel')
    expect(screen.getByText('Ocultar responsáveis')).toBeInTheDocument()

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the component test to verify RED**

Run:

```bash
npm test -- tests/unit/business/cashier-responsible-metrics.test.ts
```

Expected: FAIL at TypeScript transform/runtime because `AdminStatCard` does not accept interactive props and still renders only a `<div>`.

- [ ] **Step 3: Isolate and preserve the pre-existing dirty admin page**

Before editing, save both the original file and its binary/full-index patch, record the clean base blob, then restore only this working-tree file to `HEAD`:

```bash
cp components/admin/admin-page.tsx .git/admin-page.before-responsible.tsx
git diff --binary --full-index HEAD -- components/admin/admin-page.tsx > .git/admin-page.before-responsible.patch
git rev-parse HEAD:components/admin/admin-page.tsx > .git/admin-page.before-responsible.blob
test -s .git/admin-page.before-responsible.patch
git restore --worktree --source=HEAD -- components/admin/admin-page.tsx
git diff --quiet -- components/admin/admin-page.tsx
```

Expected: every command exits 0. The patch is non-empty, the original user-edited file is recoverable from `.git/admin-page.before-responsible.tsx`, and `components/admin/admin-page.tsx` is now clean relative to `HEAD`. This temporary isolation is what makes later path-selective staging provable: no pre-existing dirty hunk is present in the file being edited or staged.

- [ ] **Step 4: Add optional interactive props and shared card content**

In the clean-`HEAD` copy of `components/admin/admin-page.tsx`, retain its amber warning tone maps and use this public signature and return structure. Do not copy the saved dirty color-mix lines into this commit; Step 6 reapplies them afterward:

```tsx
export function AdminStatCard({
  label,
  value,
  detail,
  tone = 'default',
  onClick,
  expanded = false,
  controls,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger'
  onClick?: () => void
  expanded?: boolean
  controls?: string
}) {
  const toneClass = {
    default: 'border-border bg-card',
    success: 'border-[var(--success)]/25 bg-[color-mix(in_oklch,var(--success),white_95%)]',
    warning: 'border-amber-300/50 bg-amber-50',
    danger: 'border-destructive/25 bg-destructive/5',
  }[tone]
  const markerClass = {
    default: 'bg-foreground',
    success: 'bg-[var(--success)]',
    warning: 'bg-amber-500',
    danger: 'bg-destructive',
  }[tone]
  const cardClassName = cn(
    'min-h-11 w-full rounded-[var(--radius)] border p-4 text-left',
    toneClass,
    onClick && 'transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    onClick && expanded && 'ring-2 ring-foreground ring-offset-2'
  )
  const content = (
    <>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full w-10 rounded-full', markerClass)} />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-[-0.03em]">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
      {onClick ? (
        <span className="mt-3 block text-xs font-semibold underline underline-offset-4">
          {expanded ? 'Ocultar responsáveis' : 'Ver responsáveis'}
        </span>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={cardClassName}
        onClick={onClick}
        aria-expanded={expanded}
        aria-controls={controls}
      >
        {content}
      </button>
    )
  }

  return <div className={cardClassName}>{content}</div>
}
```

The expanded action copy is the non-color-only visual cue; `aria-expanded` is the assistive-technology cue. Do not convert static cards elsewhere into buttons.

- [ ] **Step 5: Run the component test to verify GREEN**

Run:

```bash
npm test -- tests/unit/business/cashier-responsible-metrics.test.ts
```

Expected: PASS for both static and interactive rendering.

- [ ] **Step 6: Path-selectively stage, prove the commit boundary, and restore the dirty redesign**

Because Step 3 removed the unrelated working-tree version before implementation, stage only the two planned paths and inspect the complete cached diff:

```bash
git add -- components/admin/admin-page.tsx tests/unit/business/cashier-responsible-metrics.test.ts
git diff --cached --check
git diff --cached --name-only
git diff --cached -- components/admin/admin-page.tsx tests/unit/business/cashier-responsible-metrics.test.ts
git diff --quiet -- components/admin/admin-page.tsx
git status --short
```

Expected:

- cached names are exactly `components/admin/admin-page.tsx` and `tests/unit/business/cashier-responsible-metrics.test.ts`;
- the cached admin diff contains only `onClick`, `expanded`, `controls`, focus/expanded styling, the conditional real `<button>`, and expanded-state copy;
- `git diff --quiet` exits 0 because the isolated admin file has no unstaged hunks;
- none of the unrelated dirty paths appear in `git diff --cached --name-only`.

Commit the isolated feature, verify that the commit parent contains the exact base blob recorded before isolation, then reapply the preserved dirty patch onto the new commit and return it to unstaged state:

```bash
git commit -m "feat(admin): make stat cards optionally interactive"
test "$(git rev-parse HEAD^:components/admin/admin-page.tsx)" = "$(cat .git/admin-page.before-responsible.blob)"
git show --check --format= HEAD -- components/admin/admin-page.tsx
git apply --3way .git/admin-page.before-responsible.patch
git restore --staged -- components/admin/admin-page.tsx
git status --short
git diff -- components/admin/admin-page.tsx
```

Expected:

- the parent-blob equality exits 0, proving the commit was based on the clean pre-feature `HEAD` file, not the dirty working copy;
- `git show` contains only the Step 4 `AdminStatCard` feature;
- `git apply --3way` exits 0 and restores the approved redesign on top of the feature;
- `git status --short` reports ` M components/admin/admin-page.tsx`, with that path unstaged;
- `git diff` shows the restored user redesign relative to the new feature commit.

If `git apply --3way` reports a conflict, preserve the original user file with these exact recovery commands, then stop and report the conflict for fresh review:

```bash
git restore --staged -- components/admin/admin-page.tsx
cp .git/admin-page.before-responsible.tsx components/admin/admin-page.tsx
git status --short
```

Expected recovery state: `components/admin/admin-page.tsx` is unstaged and its bytes match the pre-task user snapshot; the feature remains safely committed. Do not stage or commit a conflict resolution under this task.

---

### Task 5: Add the live responsibility panel and preserve selection through refreshes

**Files:**
- Modify: `tests/unit/business/cashier-responsible-metrics.test.ts`
- Modify: `app/admin/pedidos/client.tsx:1-125`

**Interfaces:**
- Consumes: Task 3 `CashierOrder.criadoPor` and `CashierOrder.pagamento`, Task 4 interactive `AdminStatCard` props, and the existing `pedidos` state refreshed by `refreshPedidos()`.
- Produces local `selectedMetric: 'queue' | 'pending' | 'paid' | null`; panel DOM id `cashier-responsibility-panel`; no API, route, event, or polling contract changes.

- [ ] **Step 1: Add deterministic order fixtures and client-module mocks**

Extend the imports and top of `tests/unit/business/cashier-responsible-metrics.test.ts`:

```ts
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { KitchenEvent } from '@/lib/sse'
import type { CashierOrder } from '@/lib/orders/queries'

const realtime = vi.hoisted(() => ({
  onEvent: null as ((event: KitchenEvent) => void) | null,
}))

vi.mock('@/components/cozinha/sse-listener', () => ({
  SseListener: ({ onEvent }: { onEvent: (event: KitchenEvent) => void }) => {
    realtime.onEvent = onEvent
    return null
  },
}))

vi.mock('@/lib/actions/pedidos', () => ({
  registrarPagamentoPedido: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

import { AdminPedidosLive } from '@/app/admin/pedidos/client'

function makeOrder(overrides: Partial<CashierOrder> = {}): CashierOrder {
  return {
    id: 'pedido-00000001',
    status: 'entregue',
    criadoEm: '2026-07-13T12:00:00.000Z',
    entregueEm: '2026-07-13T12:15:00.000Z',
    total: 48,
    itens: [{ nome: 'Mussarela', quantidade: 1, precoUnitario: '48.00' }],
    mesaNumero: 4,
    pagamentoStatus: 'pendente',
    criadoPor: { usuarioId: 'waiter-1', nome: 'João Garçom' },
    pagamento: null,
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  realtime.onEvent = null
})
```

Keep the two Task 4 tests below this setup.

- [ ] **Step 2: Add failing open/switch/close, content, fallback, and empty tests**

Add this suite:

```ts
describe('AdminPedidosLive responsible metrics', () => {
  const pending = makeOrder()
  const historical = makeOrder({
    id: 'pedido-00000002',
    mesaNumero: 7,
    criadoPor: null,
  })
  const paid = makeOrder({
    id: 'pedido-00000003',
    mesaNumero: 9,
    total: 52,
    pagamentoStatus: 'pago',
    pagamento: {
      valor: 52,
      registradoEm: '2026-07-13T12:30:00.000Z',
      registradoPor: { usuarioId: 'cashier-1', nome: 'Ana Caixa' },
    },
  })

  it('opens, switches, and closes the responsibility panel', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [pending, paid] }))

    const queueButton = screen.getByRole('button', { name: /Pedidos na fila/ })
    const pendingButton = screen.getByRole('button', { name: /Pagamentos pendentes/ })
    fireEvent.click(queueButton)
    expect(queueButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: 'Responsáveis · Pedidos na fila' })).toBeInTheDocument()

    fireEvent.click(pendingButton)
    expect(queueButton).toHaveAttribute('aria-expanded', 'false')
    expect(pendingButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: 'Responsáveis · Pagamentos pendentes' })).toBeInTheDocument()

    fireEvent.click(pendingButton)
    expect(pendingButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('cashier-responsibility-panel')).not.toBeInTheDocument()
  })

  it('shows waiter for pending orders, cashier and paid value for paid orders', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [pending, paid] }))

    fireEvent.click(screen.getByRole('button', { name: /Pagamentos pendentes/ }))
    expect(screen.getByText('Lançado por')).toBeInTheDocument()
    expect(screen.getByText('João Garçom')).toBeInTheDocument()
    expect(screen.getByText('R$ 48,00')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Pagos/ }))
    expect(screen.getByText('Recebido por')).toBeInTheDocument()
    expect(screen.getByText('Ana Caixa')).toBeInTheDocument()
    expect(screen.getByText('R$ 52,00')).toBeInTheDocument()
  })

  it('uses the historical fallback instead of inferring a user', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [historical] }))

    fireEvent.click(screen.getByRole('button', { name: /Pedidos na fila/ }))
    expect(screen.getByText('Responsável não registrado')).toBeInTheDocument()
  })

  it('renders a category-specific empty state', () => {
    render(createElement(AdminPedidosLive, { initialPedidos: [pending] }))

    fireEvent.click(screen.getByRole('button', { name: /^Pagos/ }))
    expect(screen.getByText('Nenhum pedido pago.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Add failing SSE and polling selection-preservation tests**

Append inside the same suite:

```ts
it('keeps the active metric selected when SSE refreshes to an empty category', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ pedidos: [] }),
  })
  vi.stubGlobal('fetch', fetchMock)
  render(createElement(AdminPedidosLive, { initialPedidos: [pending] }))

  const pendingButton = screen.getByRole('button', { name: /Pagamentos pendentes/ })
  fireEvent.click(pendingButton)
  await act(async () => {
    realtime.onEvent?.({
      type: 'status_atualizado',
      payload: { pedidoId: pending.id, status: 'entregue' },
    })
  })

  expect(await screen.findByText('Nenhum pagamento pendente.')).toBeInTheDocument()
  expect(pendingButton).toHaveAttribute('aria-expanded', 'true')
})

it('keeps the active metric selected when polling refreshes its orders', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ pedidos: [] }),
  }))
  render(createElement(AdminPedidosLive, { initialPedidos: [pending] }))

  const queueButton = screen.getByRole('button', { name: /Pedidos na fila/ })
  fireEvent.click(queueButton)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000)
  })

  expect(queueButton).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('Nenhum pedido na fila.')).toBeInTheDocument()
})
```

- [ ] **Step 4: Run the client test to verify RED**

Run:

```bash
npm test -- tests/unit/business/cashier-responsible-metrics.test.ts
```

Expected: FAIL because the metrics are not buttons, no responsibility panel exists, and no selected metric state is preserved.

- [ ] **Step 5: Add metric selection and derive panel rows from `pedidos`**

Add above the component:

```ts
type CashierMetric = 'queue' | 'pending' | 'paid'

const metricCopy: Record<CashierMetric, { title: string; empty: string }> = {
  queue: { title: 'Pedidos na fila', empty: 'Nenhum pedido na fila.' },
  pending: { title: 'Pagamentos pendentes', empty: 'Nenhum pagamento pendente.' },
  paid: { title: 'Pagos', empty: 'Nenhum pedido pago.' },
}
```

Add this state beside the existing local UI state:

```ts
const [selectedMetric, setSelectedMetric] = useState<CashierMetric | null>(null)
```

After calculating metric totals, derive the selected orders without an effect:

```ts
const selectedPedidos = selectedMetric === 'paid'
  ? pedidos.filter((pedido) => pedido.pagamentoStatus === 'pago')
  : selectedMetric === 'pending'
    ? pedidos.filter((pedido) => pedido.pagamentoStatus === 'pendente')
    : selectedMetric === 'queue'
      ? pedidos
      : []

function toggleMetric(metric: CashierMetric) {
  setSelectedMetric((current) => current === metric ? null : metric)
}
```

Do not add `selectedMetric` to `refreshPedidos`, `handleEvent`, or an effect; this intentional independence preserves selection through both refresh paths.

- [ ] **Step 6: Convert only the cashier metrics into interactive cards**

Replace the three cashier cards with:

```tsx
<AdminStatsGrid className="xl:grid-cols-3">
  <AdminStatCard
    label="Pedidos na fila"
    value={pedidos.length}
    detail="Pedidos carregados no caixa."
    onClick={() => toggleMetric('queue')}
    expanded={selectedMetric === 'queue'}
    controls="cashier-responsibility-panel"
  />
  <AdminStatCard
    label="Pagamentos pendentes"
    value={pagamentosPendentes}
    detail={formatCurrency(valorPendente)}
    tone={pagamentosPendentes ? 'warning' : 'success'}
    onClick={() => toggleMetric('pending')}
    expanded={selectedMetric === 'pending'}
    controls="cashier-responsibility-panel"
  />
  <AdminStatCard
    label="Pagos"
    value={pedidosPagos}
    detail="Pedidos já baixados no caixa."
    onClick={() => toggleMetric('paid')}
    expanded={selectedMetric === 'paid'}
    controls="cashier-responsibility-panel"
  />
</AdminStatsGrid>
```

- [ ] **Step 7: Render the responsive panel immediately after the metrics grid**

Insert this block immediately after `</AdminStatsGrid>` and before `lastEvent`:

```tsx
{selectedMetric ? (
  <div
    id="cashier-responsibility-panel"
    data-testid="cashier-responsibility-panel"
  >
    <AdminPanel title={`Responsáveis · ${metricCopy[selectedMetric].title}`}>
      {selectedPedidos.length === 0 ? (
        <AdminEmptyState
          title={metricCopy[selectedMetric].empty}
          description="A lista será atualizada automaticamente quando houver mudanças no caixa."
        />
      ) : (
        <ul className="grid gap-2">
          {selectedPedidos.map((pedido) => {
            const paidMetric = selectedMetric === 'paid'
            const responsible = paidMetric
              ? pedido.pagamento?.registradoPor
              : pedido.criadoPor
            const value = paidMetric
              ? pedido.pagamento?.valor ?? pedido.total
              : selectedMetric === 'pending'
                ? pedido.total
                : null

            return (
              <li
                key={pedido.id}
                className="grid gap-3 rounded-[var(--radius)] border bg-background p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              >
                <div>
                  <p className="font-semibold">Mesa {pedido.mesaNumero}</p>
                  <p className="text-xs text-muted-foreground">
                    Pedido {pedido.id.slice(0, 8)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {paidMetric ? 'Recebido por' : 'Lançado por'}
                  </p>
                  <p className="truncate font-medium">
                    {responsible?.nome ?? 'Responsável não registrado'}
                  </p>
                </div>
                {value !== null ? (
                  <p className="font-semibold sm:text-right">{formatCurrency(value)}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </AdminPanel>
  </div>
) : null}
```

This uses actual payment value for paid orders, total due for pending orders, and no amount for the queue.

- [ ] **Step 8: Run interaction coverage to verify GREEN**

Run:

```bash
npm test -- tests/unit/business/cashier-responsible-metrics.test.ts
```

Expected: PASS for open/switch/close, labels, values, historical fallback, category-specific empty states, SSE preservation, polling preservation, and static `AdminStatCard` compatibility.

- [ ] **Step 9: Run adjacent cashier/action/schema regressions**

Run:

```bash
npm test -- tests/unit/business/cashier-responsible-metrics.test.ts tests/unit/business/cashier-orders.test.ts tests/unit/business/cashier-orders-query.test.ts tests/unit/actions/pedidos.test.ts tests/unit/db/schema.test.ts
```

Expected: PASS for all targeted files.

- [ ] **Step 10: Commit the live panel slice**

```bash
git add app/admin/pedidos/client.tsx tests/unit/business/cashier-responsible-metrics.test.ts
git commit -m "feat(cashier): show responsible metric details"
```

---

### Task 6: Verify the complete change and guard the working tree

**Files:**
- Verify only: all files from Tasks 1-5
- Preserve without staging: `app/admin/layout.tsx`, `app/globals.css`, `tests/unit/business/order-flow.test.ts`, `DESIGNTESTE.MD`, `.impeccable/critique/2026-07-10T18-36-09Z__app-admin.md`, and unrelated hunks in `components/admin/admin-page.tsx`

**Interfaces:**
- Consumes: complete schema → action → query → component flow.
- Produces: a buildable, tested implementation with no unrelated files accidentally committed.

- [ ] **Step 1: Run the full unit suite**

```bash
npm test -- --maxWorkers=1
```

Expected: all Vitest tests PASS. If an existing unrelated dirty test fails, record the exact pre-existing failure and do not alter it to hide the failure.

- [ ] **Step 2: Run lint and production build**

```bash
npm run lint
npm run build
```

Expected: both exit 0 with no TypeScript errors. If `npm run lint` reports `Missing script: "lint"` (the current `package.json` has no lint script), record that as unavailable and rely on `npm run build` plus Vitest; do not add a new lint dependency or script in this feature.

- [ ] **Step 3: Re-run the refresh-preservation test to catch timer flakiness**

```bash
npm test -- tests/unit/business/cashier-responsible-metrics.test.ts
npm test -- tests/unit/business/cashier-responsible-metrics.test.ts
```

Expected: both runs PASS; SSE/polling tests are deterministic.

- [ ] **Step 4: Audit tenant safety and scope from the final diff**

```bash
git diff --check
FEATURE_BASE="$(cat .git/cashier-responsible-metrics.base)"
git cat-file -e "$FEATURE_BASE^{commit}"
git diff --stat "$FEATURE_BASE"..HEAD
git diff --name-only "$FEATURE_BASE"..HEAD
git log --reverse --oneline "$FEATURE_BASE"..HEAD
git status --short
```

Expected:

- no whitespace errors;
- `git cat-file` exits 0, proving the recorded base still identifies a commit;
- only the planned schema, migration, order action/query, cashier UI, and tests appear in the complete recorded feature range, regardless of how many review/correction commits were added;
- the pre-existing unrelated dirty files remain present and uncommitted;
- no global `usuario.id`-only responsible-name query exists;
- no backfill, route, access, payment-rule, status-flow, or polling-interval change exists.

- [ ] **Step 5: Manually verify keyboard and responsive behavior**

Run:

```bash
npm run dev
```

Expected at `/admin/pedidos`:

- Tab reaches each metric button with visible focus;
- Enter/Space opens, switches, and closes the panel;
- expanded copy changes between `Ver responsáveis` and `Ocultar responsáveis`;
- panel appears directly below metrics;
- at 320 px, each row stacks without horizontal overflow;
- at desktop width, mesa/order, responsible, and payment value scan in columns;
- an open payment form and expanded order remain open when a metric is toggled and after a refresh;
- the selected metric stays expanded when polling or SSE changes its contents.

- [ ] **Step 6: Confirm the recorded feature range is reviewable**

```bash
FEATURE_BASE="$(cat .git/cashier-responsible-metrics.base)"
git log --reverse --format="%h %s" "$FEATURE_BASE"..HEAD
```

Expected: the range contains these required subjects in implementation order, with any legitimate review/correction commits visible rather than hidden by a fixed `-5` limit:

```text
feat(db): add nullable order creator
feat(orders): record authenticated waiter
feat(cashier): return tenant-safe responsibles
feat(admin): make stat cards optionally interactive
feat(cashier): show responsible metric details
```

Zero or more review-generated commits such as `fix(cashier): enforce tenant responsible boundary` or `fix(db): preserve nullable creator migration` are explicitly allowed between or after those checkpoints when they describe a real correction. If verification required a legitimate code/test correction, use a precise conventional `fix(<scope>): <correction>` subject and confirm it appears in this same recorded range; otherwise leave verification without a commit. Do not rename, squash away, or require the range to contain only the five checkpoint commits.

## Self-Review

- **Spec coverage:** Tasks 1-3 cover nullable persistence, authenticated creation, payment registrar reuse, minimal payment metadata, historical nulls, behavioral tenant-separated resolution, reversed-payment exclusion, and tenant isolation. Tasks 4-5 cover static compatibility, real buttons, keyboard/ARIA/focus, explicit selection cue, open/switch/close, contextual labels, values, fallback, empty states, responsive rows, and refresh-preserved selection. Task 6 covers full regression and manual accessibility/responsiveness checks. No spec requirement is uncovered.
- **Placeholder scan:** No `TBD`, `TODO`, “implement later,” “similar to,” unspecified error handling, or empty test instruction remains. Every code-changing step includes the exact addition/replacement and every test step includes a command and expected RED/GREEN result.
- **Type consistency:** `CashierResponsible`, `CashierResponsibleMembership`, `CashierPayment`, `CashierOrder.criadoPor`, and `CashierOrder.pagamento` names match between query production, integration fixtures, and UI. `findRegisteredPayment` accepts the real `StatusPagamento` union, and `resolveTenantResponsible` consumes the same membership rows selected by `getCashierOrders`. `selectedMetric` values match `metricCopy` keys. `AdminStatCard` uses the same `onClick`, `expanded`, and `controls` names at definition and call sites.
- **Risk review:** Temporarily isolating the dirty admin file to clean `HEAD`, checking the cached paths/diff, validating the parent blob, and only then reapplying the saved dirty patch proves unrelated redesign hunks cannot enter the feature commit without relying on serialized-diff equality. The schema test asserts the nullable UUID column exists and that its FK appears after `usuario`. Integration tests execute `getCashierOrders` with mixed-tenant query candidates and `estornado` payments, proving its production mapping cannot bypass the helpers. The recorded base commit and explicit allowance for precise review `fix` commits make the final audit robust to correction commits. A registered payment whose user no longer has a membership safely renders the required fallback.
- **Scope check:** This is one vertical feature, not multiple independent subsystems: schema, write path, read path, and UI are necessary parts of the same responsibility display and each task leaves an independently testable boundary.
