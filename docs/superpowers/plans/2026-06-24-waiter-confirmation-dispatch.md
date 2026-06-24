# Waiter Confirmation Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure waiter cart edits stay local and kitchen/admin only receive an official order after explicit waiter confirmation.

**Architecture:** Keep the existing Zustand cart as the only draft state. Treat `confirmarPedido(mesaId, items)` as the single officialization boundary that persists `pedido`/`item_pedido` rows and emits `novo_pedido` only after persistence succeeds. Remove waiter-flow ambiguity by avoiding `criarPedido`/`adicionarItem`/`enviarPedido` from cart submission paths and making UI copy say confirmation, not generic sending.

**Tech Stack:** Next.js 16 App Router, React 19, Server Actions, Drizzle ORM, Zustand, SSE via `lib/sse.ts`, Vitest.

## Global Constraints

- Draft orders are not persisted.
- Kitchen/admin visibility starts only after waiter confirmation.
- `notifyKitchen({ type: 'novo_pedido', ... })` must run only after the official order and items are persisted.
- Do not introduce a new draft-order table or persistent draft state.
- Keep UI strings in Portuguese because the existing waiter/admin/cozinha UI is Portuguese.
- Do not mix unrelated existing working tree changes into commits.

---

## File Structure

- `components/garcom/cart-drawer.tsx`  
  Final confirmation UI for the waiter cart. It should call only `confirmarPedido` for order officialization, use confirmation copy, clear local cart after success, and close the drawer.

- `lib/actions/pedidos.ts`  
  Server-side order actions. `confirmarPedido` is the officialization boundary. `criarPedido`, `adicionarItem`, and `enviarPedido` should either be removed if unused or kept only if another active route still needs them. They must not be used by the waiter cart flow.

- `tests/unit/business/order-flow.test.ts`  
  Source-level business-boundary tests. These lock the architectural rule that the waiter cart does not create visible kitchen/admin orders before confirmation.

- `tests/unit/actions/pedidos.test.ts`  
  Action-level tests. These verify `confirmarPedido` validates input, persists order/items, and emits `novo_pedido` after persistence.

---

### Task 1: Lock the Waiter Confirmation Boundary with Tests

**Files:**
- Modify: `tests/unit/business/order-flow.test.ts`
- Modify: `tests/unit/actions/pedidos.test.ts`

**Interfaces:**
- Consumes: Existing `confirmarPedido(mesaId: string, items: ConfirmarPedidoItem[]): Promise<{ id: string }>` from `lib/actions/pedidos.ts`.
- Produces: Tests that later tasks must satisfy:
  - waiter cart uses `confirmarPedido`
  - waiter cart does not use `criarPedido`, `adicionarItem`, or `enviarPedido`
  - `confirmarPedido` emits `novo_pedido`
  - invalid/empty confirmation does not emit `novo_pedido`

- [ ] **Step 1: Update the business-boundary test**

Replace `tests/unit/business/order-flow.test.ts` with:

```ts
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const root = process.cwd()

function source(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('pedido business flow', () => {
  test('garcom mesa screen does not create a kitchen-visible pedido before confirmation', () => {
    const pageSource = source('app/garcom/mesa/[id]/page.tsx')
    const clientSource = source('app/garcom/mesa/[id]/client.tsx')

    expect(pageSource).not.toContain('criarPedido')
    expect(pageSource).not.toContain('adicionarItem')
    expect(pageSource).not.toContain('enviarPedido')
    expect(clientSource).not.toContain('criarPedido')
    expect(clientSource).not.toContain('adicionarItem')
    expect(clientSource).not.toContain('enviarPedido')
    expect(clientSource).toContain('CartDrawer')
  })

  test('garcom confirms the full cart in one official business action', () => {
    const drawerSource = source('components/garcom/cart-drawer.tsx')

    expect(drawerSource).toContain('confirmarPedido')
    expect(drawerSource).not.toContain('criarPedido')
    expect(drawerSource).not.toContain('adicionarItem')
    expect(drawerSource).not.toContain('enviarPedido')
  })

  test('cart confirmation copy communicates officialization', () => {
    const drawerSource = source('components/garcom/cart-drawer.tsx')

    expect(drawerSource).toContain('Confirmar pedido')
    expect(drawerSource).toContain('Confirmando')
    expect(drawerSource).toContain('Não foi possível confirmar o pedido')
  })

  test('kitchen and admin read persisted pedidos instead of cart state', () => {
    const kitchenSource = source('app/cozinha/dashboard/page.tsx')
    const adminSource = source('app/admin/pedidos/page.tsx')

    expect(existsSync(join(root, 'app/cozinha/dashboard/page.tsx'))).toBe(true)
    expect(existsSync(join(root, 'app/admin/pedidos/page.tsx'))).toBe(true)
    expect(kitchenSource).toContain('from(pedido)')
    expect(adminSource).toContain('from(pedido)')
    expect(kitchenSource).not.toContain('useCart')
    expect(adminSource).not.toContain('useCart')
  })
})
```

- [ ] **Step 2: Replace action tests with confirmation-focused tests**

Replace `tests/unit/actions/pedidos.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const redirectMock = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/auth/server', () => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    }),
  },
}))

vi.mock('@/lib/db/schema', () => ({
  pedido: {
    id: 'pedido.id',
    mesaId: 'pedido.mesa_id',
    status: 'pedido.status',
    atualizadoEm: 'pedido.atualizado_em',
  },
  itemPedido: {
    pedidoId: 'item_pedido.pedido_id',
    produtoId: 'item_pedido.produto_id',
    quantidade: 'item_pedido.quantidade',
    precoUnitario: 'item_pedido.preco_unitario',
    observacao: 'item_pedido.observacao',
  },
  mesa: {
    id: 'mesa.id',
    numero: 'mesa.numero',
  },
  produto: {
    id: 'produto.id',
    nome: 'produto.nome',
    preco: 'produto.preco',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((left, right) => ({ left, right })),
}))

vi.mock('@/lib/sse', () => ({ notifyKitchen: vi.fn() }))

const db = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}

vi.mock('@/lib/db/index', () => ({ db }))

import { notifyKitchen } from '@/lib/sse'
import { confirmarPedido } from '@/lib/actions/pedidos'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('confirmarPedido', () => {
  it('persists the official order and emits novo_pedido after confirmation', async () => {
    const values = vi.fn()
    const returning = vi.fn().mockResolvedValue([{ id: 'pedido-1' }])

    db.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({ returning }),
      })
      .mockReturnValueOnce({
        values,
      })

    db.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ nome: 'Margherita', preco: '45.00' }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ numero: 7 }]),
        }),
      })

    const result = await confirmarPedido('mesa-1', [
      { produtoId: 'produto-1', quantidade: 2, observacao: 'Sem cebola' },
    ])

    expect(result).toEqual({ id: 'pedido-1' })
    expect(returning).toHaveBeenCalledWith({ id: 'pedido.id' })
    expect(values).toHaveBeenCalledWith({
      pedidoId: 'pedido-1',
      produtoId: 'produto-1',
      quantidade: 2,
      precoUnitario: '45.00',
      observacao: 'Sem cebola',
    })
    expect(notifyKitchen).toHaveBeenCalledWith({
      type: 'novo_pedido',
      payload: {
        pedidoId: 'pedido-1',
        mesaNumero: 7,
        itens: ['2x Margherita'],
      },
    })
  })

  it('does not emit novo_pedido for an empty cart', async () => {
    await expect(confirmarPedido('mesa-1', [])).rejects.toThrow('Pedido vazio')

    expect(db.insert).not.toHaveBeenCalled()
    expect(notifyKitchen).not.toHaveBeenCalled()
  })

  it('does not emit novo_pedido for an invalid item', async () => {
    await expect(
      confirmarPedido('mesa-1', [{ produtoId: '', quantidade: 1 }])
    ).rejects.toThrow('Item inválido')

    expect(db.insert).not.toHaveBeenCalled()
    expect(notifyKitchen).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run the focused tests and verify the expected failures**

Run:

```bash
npm test -- tests/unit/business/order-flow.test.ts tests/unit/actions/pedidos.test.ts
```

Expected before implementation:

- `cart confirmation copy communicates officialization` fails if the UI still says `Enviar Pedido`, `Enviando…`, or the old error copy.
- `persists the official order and emits novo_pedido after confirmation` may fail if existing mocks expose a mismatch in the action implementation.

- [ ] **Step 4: Commit the failing tests**

```bash
git add tests/unit/business/order-flow.test.ts tests/unit/actions/pedidos.test.ts
git commit -m "test: lock waiter confirmation dispatch boundary"
```

---

### Task 2: Make the Cart Drawer Confirmation UX Explicit

**Files:**
- Modify: `components/garcom/cart-drawer.tsx`

**Interfaces:**
- Consumes: `confirmarPedido(mesaId, items)` from `lib/actions/pedidos.ts`.
- Produces: A waiter cart drawer whose only officialization action is `handleConfirmar`, with Portuguese confirmation copy.

- [ ] **Step 1: Rename the submit handler and copy**

In `components/garcom/cart-drawer.tsx`, replace the current `handleEnviar` function with:

```tsx
async function handleConfirmar() {
  setSending(true)
  setError(null)
  try {
    await confirmarPedido(
      mesaId,
      items.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        observacao: item.observacao,
      }))
    )
    clearCart()
    onClose()
  } catch {
    setError('Não foi possível confirmar o pedido. Tente novamente.')
  } finally {
    setSending(false)
  }
}
```

- [ ] **Step 2: Update the primary button**

In the same file, replace the submit button with:

```tsx
<Button
  size="lg"
  className="h-12 w-full"
  onClick={handleConfirmar}
  disabled={sending || items.length === 0}
>
  {sending ? 'Confirmando...' : 'Confirmar pedido'}
</Button>
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm test -- tests/unit/business/order-flow.test.ts
```

Expected:

- PASS for all `pedido business flow` tests.

- [ ] **Step 4: Commit the UX boundary change**

```bash
git add components/garcom/cart-drawer.tsx
git commit -m "feat: clarify waiter order confirmation"
```

---

### Task 3: Keep `confirmarPedido` as the Only Dispatch Boundary

**Files:**
- Modify: `lib/actions/pedidos.ts`
- Modify: `tests/unit/actions/pedidos.test.ts` only if implementation details require mock alignment

**Interfaces:**
- Consumes:
  - `ConfirmarPedidoItem = { produtoId: string; quantidade: number; observacao?: string }`
  - `notifyKitchen(data: object): void`
- Produces:
  - `confirmarPedido(mesaId: string, items: ConfirmarPedidoItem[]): Promise<{ id: string }>`
  - `notifyKitchen({ type: 'novo_pedido', payload: { pedidoId, mesaNumero, itens } })` emitted only after persistence.

- [ ] **Step 1: Verify `confirmarPedido` validates before DB writes**

Ensure the top of `confirmarPedido` keeps this validation order:

```ts
if (!mesaId) throw new Error('Mesa inválida')
if (items.length === 0) throw new Error('Pedido vazio')
if (items.some((item) => !item.produtoId || item.quantidade <= 0)) {
  throw new Error('Item inválido')
}
```

- [ ] **Step 2: Ensure products are validated before creating the official order**

Keep product lookup before inserting `pedido`:

```ts
const itensPreparados: {
  item: ConfirmarPedidoItem
  produto: { nome: string; preco: string }
}[] = []

for (const item of items) {
  const [prod] = await db
    .select({ nome: produto.nome, preco: produto.preco })
    .from(produto)
    .where(eq(produto.id, item.produtoId))

  if (!prod) throw new Error('Produto inválido')

  itensPreparados.push({ item, produto: prod })
}
```

- [ ] **Step 3: Ensure notification happens after all item inserts**

The final part of `confirmarPedido` must preserve this sequence:

```ts
const [novo] = await db
  .insert(pedido)
  .values({ mesaId, status: 'novo' })
  .returning({ id: pedido.id })

const itensNotificacao: string[] = []

for (const { item, produto: prod } of itensPreparados) {
  await db.insert(itemPedido).values({
    pedidoId: novo.id,
    produtoId: item.produtoId,
    quantidade: item.quantidade,
    precoUnitario: prod.preco,
    observacao: item.observacao ?? null,
  })

  itensNotificacao.push(`${item.quantidade}x ${prod.nome}`)
}

const [m] = await db
  .select({ numero: mesa.numero })
  .from(mesa)
  .where(eq(mesa.id, mesaId))

notifyKitchen({
  type: 'novo_pedido',
  payload: { pedidoId: novo.id, mesaNumero: m?.numero ?? 0, itens: itensNotificacao },
})

return { id: novo.id }
```

- [ ] **Step 4: Remove unused waiter-dispatch paths if they are not referenced**

Search:

```bash
rg -n "criarPedido|adicionarItem|enviarPedido"
```

If only `lib/actions/pedidos.ts` and tests reference these functions, remove `criarPedido`, `adicionarItem`, and `enviarPedido` from `lib/actions/pedidos.ts` and remove their tests. Keep `atualizarStatus`, because the kitchen status flow still needs it.

If any active route still imports them, do not remove them in this task. Instead, leave them exported but confirm no waiter cart UI calls them.

- [ ] **Step 5: Run action tests**

Run:

```bash
npm test -- tests/unit/actions/pedidos.test.ts
```

Expected:

- PASS for all `confirmarPedido` tests.

- [ ] **Step 6: Commit the action boundary change**

```bash
git add lib/actions/pedidos.ts tests/unit/actions/pedidos.test.ts
git commit -m "fix: dispatch waiter orders only on confirmation"
```

---

### Task 4: Verify Kitchen/Admin Visibility and Full Regression

**Files:**
- Test: `tests/unit/business/order-flow.test.ts`
- Test: `tests/unit/actions/pedidos.test.ts`
- Test: existing suite via `npm test`

**Interfaces:**
- Consumes: All prior tasks.
- Produces: Verified behavior that local waiter cart drafts do not affect kitchen/admin, while confirmed orders do.

- [ ] **Step 1: Run the focused boundary tests**

Run:

```bash
npm test -- tests/unit/business/order-flow.test.ts tests/unit/actions/pedidos.test.ts
```

Expected:

- PASS.

- [ ] **Step 2: Run the full unit suite**

Run:

```bash
npm test
```

Expected:

- PASS.

- [ ] **Step 3: Inspect the final diff**

Run:

```bash
git diff --stat HEAD
git diff HEAD -- components/garcom/cart-drawer.tsx lib/actions/pedidos.ts tests/unit/business/order-flow.test.ts tests/unit/actions/pedidos.test.ts
```

Expected:

- Diff only contains confirmation-boundary changes.
- No unrelated route move or existing dirty work is included.

- [ ] **Step 4: Commit verification-only adjustments if any were needed**

If Task 4 required code/test fixes:

```bash
git add components/garcom/cart-drawer.tsx lib/actions/pedidos.ts tests/unit/business/order-flow.test.ts tests/unit/actions/pedidos.test.ts
git commit -m "test: verify waiter confirmation visibility"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

**Spec coverage:** Covered. The plan enforces local-only cart state, confirmation-only persistence, `novo_pedido` after persistence, kitchen/admin visibility from persisted orders, and excludes persistent drafts.

**Marker scan:** No unresolved markers. Each implementation step includes exact files, code, commands, and expected results.

**Type consistency:** `ConfirmarPedidoItem`, `confirmarPedido(mesaId, items)`, and the `novo_pedido` payload match the current code and design spec.
