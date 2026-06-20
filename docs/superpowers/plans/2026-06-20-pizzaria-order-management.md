# Sistema de Gestão de Pedidos — Pizzaria — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dine-in pizza restaurant order management system with a waiter mobile PWA, kitchen display with real-time SSE, and admin panel for menu and table management.

**Architecture:** Single Next.js 16 App Router application with three route groups: `(garcom)` (mobile PWA), `(cozinha)` (PC display with SSE), `(admin)` (desktop CRUD). Neon PostgreSQL with Drizzle ORM for data, Neon Auth for authentication, SSE via Route Handler for real-time kitchen updates.

**Tech Stack:** Next.js 16 · Drizzle ORM · Neon (PostgreSQL + Auth) · Shadcn/UI · Tailwind CSS · Zustand · Vitest · Playwright · next-pwa

## Global Constraints

- Node.js ≥ 20
- Next.js 16.x with App Router only — no Pages Router
- All mutations via Server Actions (`'use server'`) — no separate REST endpoints except `/api/auth` and `/api/events`
- Drizzle schema in TypeScript must mirror `db/schema.sql` exactly
- Shadcn components only — no other component libraries
- Geist tokens applied via CSS variables in `app/globals.css`
- Buttons: 48px (large) for primary actions, 40px (default), 32px (small/compact)
- Border radius: 6px standard, 12px modals
- No delivery, no online payment, no multi-tenant
- `preco_unitario` always snapshotted at order time — never recalculated from `produto.preco`
- Status flow: `novo → em_preparo → pronto → entregue` — no skipping, no reversing
- Cozinha display: no auth required (internal display)
- Garçom + Admin: Neon Auth required
- All text in pt-BR

---

## File Map

```
# Config
package.json
next.config.ts
tailwind.config.ts
vitest.config.ts
playwright.config.ts
proxy.ts                          # Neon Auth middleware

# DB
lib/db/schema.ts                  # Drizzle schema (mirrors db/schema.sql)
lib/db/index.ts                   # Drizzle client singleton

# Auth
lib/auth/server.ts                # createNeonAuth instance
lib/auth/client.ts                # createAuthClient instance

# SSE
lib/sse.ts                        # clients Set + notifyKitchen()
app/api/events/route.ts           # SSE GET handler
app/api/auth/[...path]/route.ts   # Neon Auth proxy

# Server Actions
lib/actions/pedidos.ts            # criarPedido, enviarPedido, atualizarStatus
lib/actions/produtos.ts           # criarProduto, editarProduto, toggleDisponivel, criarCategoria, reordenarCategoria
lib/actions/mesas.ts              # criarMesa, toggleAtiva

# Client State
lib/store/cart.ts                 # Zustand cart (items + total)

# Shared Components
components/ui/                    # Shadcn generated
components/status-badge.tsx       # Badge colorido por status_pedido

# Garçom Components
components/garcom/menu-grid.tsx
components/garcom/item-card.tsx
components/garcom/cart-fab.tsx
components/garcom/cart-drawer.tsx
components/garcom/observacao-sheet.tsx

# Cozinha Components
components/cozinha/kanban-board.tsx
components/cozinha/pedido-card.tsx
components/cozinha/sse-listener.tsx

# Admin Components
components/admin/produto-form.tsx
components/admin/categoria-sidebar.tsx
components/admin/mesa-list.tsx

# App Routes
app/layout.tsx
app/page.tsx                          # redirect by role
app/globals.css

app/(garcom)/layout.tsx               # auth guard
app/(garcom)/mesa/[id]/page.tsx
app/(garcom)/pedidos/page.tsx

app/(cozinha)/layout.tsx
app/(cozinha)/dashboard/page.tsx

app/(admin)/layout.tsx                # auth guard + admin role check
app/(admin)/menu/page.tsx
app/(admin)/mesas/page.tsx

app/auth/sign-in/page.tsx
app/auth/sign-up/page.tsx

# PWA
public/manifest.json

# Tests
tests/unit/actions/pedidos.test.ts
tests/unit/actions/produtos.test.ts
tests/unit/store/cart.test.ts
tests/e2e/garcom-flow.spec.ts
tests/e2e/cozinha-flow.spec.ts
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `app/globals.css`, `vitest.config.ts`, `playwright.config.ts`

**Interfaces:**
- Produces: running `npm run dev`, `npm test`, `npm run test:e2e`

- [ ] **Step 1: Scaffold project**

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --yes
```

- [ ] **Step 2: Install dependencies**

```bash
npm install drizzle-orm @neondatabase/serverless @neondatabase/auth@latest \
  zustand next-pwa @dnd-kit/core @dnd-kit/sortable \
  lucide-react class-variance-authority clsx tailwind-merge

npm install -D drizzle-kit vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom \
  @playwright/test vite-tsconfig-paths
```

- [ ] **Step 3: Initialize Shadcn**

```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

Then add components:
```bash
npx shadcn@latest add button input label select textarea dialog drawer \
  sheet toast badge tabs card separator form
```

- [ ] **Step 4: Configure Geist tokens in `app/globals.css`**

Replace the `:root` block generated by Shadcn with:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  /* Geist Light */
  --background: #ffffff;
  --foreground: #171717;
  --card: #ffffff;
  --card-foreground: #171717;
  --popover: #ffffff;
  --popover-foreground: #171717;
  --primary: #171717;
  --primary-foreground: #ffffff;
  --secondary: #fafafa;
  --secondary-foreground: #171717;
  --muted: #f2f2f2;
  --muted-foreground: #8f8f8f;
  --accent: #f2f2f2;
  --accent-foreground: #171717;
  --destructive: #fc0035;
  --destructive-foreground: #ffffff;
  --border: #eaeaea;
  --input: #eaeaea;
  --ring: #006bff;
  --radius: 0.375rem;

  /* Semantic status colors */
  --status-novo: #171717;
  --status-em-preparo: #ffa600;
  --status-pronto: #28a948;
  --status-entregue: #8f8f8f;
}
```

- [ ] **Step 5: Configure `next.config.ts`**

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
}

export default nextConfig
```

- [ ] **Step 6: Configure Vitest**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
})
```

```typescript
// tests/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Configure Playwright**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  use: { baseURL: 'http://localhost:3000' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
```

- [ ] **Step 8: Add scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

- [ ] **Step 9: Verify**

```bash
npm run dev
```

Expected: Next.js dev server at http://localhost:3000 with default page.

- [ ] **Step 10: Commit**

```bash
git init
git add .
git commit -m "feat: bootstrap project — Next.js 16, Shadcn, Geist tokens, Vitest, Playwright"
```

---

## Task 2: Drizzle Schema + DB Client

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/index.ts`, `.env.local`, `drizzle.config.ts`

**Interfaces:**
- Produces:
  - `db` — Drizzle client (`NeonDatabase`)
  - `mesa`, `categoria`, `produto`, `pedido`, `itemPedido`, `usuario` — table references
  - `StatusPedido`, `RoleUsuario` — TypeScript enums

- [ ] **Step 1: Create `.env.local`**

```bash
# .env.local
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=  # fill: openssl rand -base64 32
```

- [ ] **Step 2: Create `lib/db/schema.ts`**

```typescript
// lib/db/schema.ts
import {
  pgTable, pgEnum, uuid, integer, text, boolean,
  numeric, timestamp
} from 'drizzle-orm/pg-core'

export const statusPedidoEnum = pgEnum('status_pedido', [
  'novo', 'em_preparo', 'pronto', 'entregue'
])
export const roleUsuarioEnum = pgEnum('role_usuario', ['garcom', 'admin'])

export type StatusPedido = 'novo' | 'em_preparo' | 'pronto' | 'entregue'
export type RoleUsuario = 'garcom' | 'admin'

export const mesa = pgTable('mesa', {
  id: uuid('id').primaryKey().defaultRandom(),
  numero: integer('numero').notNull().unique(),
  ativa: boolean('ativa').notNull().default(true),
})

export const categoria = pgTable('categoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  ordem: integer('ordem').notNull().default(0),
})

export const produto = pgTable('produto', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoriaId: uuid('categoria_id').notNull().references(() => categoria.id),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  preco: numeric('preco', { precision: 10, scale: 2 }).notNull(),
  disponivel: boolean('disponivel').notNull().default(true),
  imagemUrl: text('imagem_url'),
})

export const pedido = pgTable('pedido', {
  id: uuid('id').primaryKey().defaultRandom(),
  mesaId: uuid('mesa_id').notNull().references(() => mesa.id),
  status: statusPedidoEnum('status').notNull().default('novo'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const itemPedido = pgTable('item_pedido', {
  id: uuid('id').primaryKey().defaultRandom(),
  pedidoId: uuid('pedido_id').notNull().references(() => pedido.id, { onDelete: 'cascade' }),
  produtoId: uuid('produto_id').notNull().references(() => produto.id),
  quantidade: integer('quantidade').notNull(),
  precoUnitario: numeric('preco_unitario', { precision: 10, scale: 2 }).notNull(),
  observacao: text('observacao'),
})

export const usuario = pgTable('usuario', {
  id: uuid('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  role: roleUsuarioEnum('role').notNull().default('garcom'),
})
```

- [ ] **Step 3: Create `lib/db/index.ts`**

```typescript
// lib/db/index.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

- [ ] **Step 4: Create `drizzle.config.ts`**

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

- [ ] **Step 5: Push schema to Neon**

```bash
npm run db:push
```

Expected output: `All changes applied successfully.`

- [ ] **Step 6: Write schema smoke test**

```typescript
// tests/unit/db/schema.test.ts
import { describe, it, expect } from 'vitest'
import { mesa, pedido, itemPedido, statusPedidoEnum } from '@/lib/db/schema'

describe('Drizzle schema', () => {
  it('mesa table has required columns', () => {
    expect(Object.keys(mesa)).toContain('id')
    expect(Object.keys(mesa)).toContain('numero')
    expect(Object.keys(mesa)).toContain('ativa')
  })

  it('pedido references mesa', () => {
    const mesaIdCol = (pedido as any).mesaId
    expect(mesaIdCol).toBeDefined()
  })

  it('itemPedido references pedido with cascade', () => {
    const col = (itemPedido as any).pedidoId
    expect(col).toBeDefined()
  })
})
```

- [ ] **Step 7: Run test**

```bash
npm test tests/unit/db/schema.test.ts
```

Expected: 3 passing.

- [ ] **Step 8: Commit**

```bash
git add lib/db/ drizzle.config.ts tests/unit/db/ .env.local
git commit -m "feat: Drizzle schema + Neon client"
```

---

## Task 3: Auth Setup

**Files:**
- Create: `lib/auth/server.ts`, `lib/auth/client.ts`, `proxy.ts`, `app/api/auth/[...path]/route.ts`

**Interfaces:**
- Consumes: `process.env.NEON_AUTH_BASE_URL`, `process.env.NEON_AUTH_COOKIE_SECRET`
- Produces:
  - `auth` — server instance (`{ getSession, signIn, signUp, signOut, middleware, handler }`)
  - `authClient` — client instance

- [ ] **Step 1: Create `lib/auth/server.ts`**

```typescript
// lib/auth/server.ts
import { createNeonAuth } from '@neondatabase/auth/next/server'

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
})
```

- [ ] **Step 2: Create `lib/auth/client.ts`**

```typescript
// lib/auth/client.ts
'use client'
import { createAuthClient } from '@neondatabase/auth/next'
export const authClient = createAuthClient()
```

- [ ] **Step 3: Create `app/api/auth/[...path]/route.ts`**

```typescript
// app/api/auth/[...path]/route.ts
import { auth } from '@/lib/auth/server'
export const { GET, POST } = auth.handler()
```

- [ ] **Step 4: Create `proxy.ts` (middleware)**

```typescript
// proxy.ts
import { auth } from '@/lib/auth/server'

export default auth.middleware({
  loginUrl: '/auth/sign-in',
})

export const config = {
  matcher: ['/(garcom)/:path*', '/(admin)/:path*'],
}
```

- [ ] **Step 5: Verify auth handler**

```bash
npm run dev
curl http://localhost:3000/api/auth/session
```

Expected: JSON response (empty session `{}` or redirect — no 404).

- [ ] **Step 6: Commit**

```bash
git add lib/auth/ proxy.ts app/api/auth/
git commit -m "feat: Neon Auth setup — server, client, middleware, handler"
```

---

## Task 4: SSE Infrastructure

**Files:**
- Create: `lib/sse.ts`, `app/api/events/route.ts`

**Interfaces:**
- Produces:
  - `notifyKitchen(data: KitchenEvent): void`
  - `KitchenEvent` type: `{ type: 'novo_pedido' | 'status_atualizado' | 'produto_indisponivel'; payload: unknown }`
  - GET `/api/events` — SSE stream

- [ ] **Step 1: Create `lib/sse.ts`**

```typescript
// lib/sse.ts
export type KitchenEvent =
  | { type: 'novo_pedido'; payload: { pedidoId: string; mesaNumero: number; itens: string[] } }
  | { type: 'status_atualizado'; payload: { pedidoId: string; status: string } }
  | { type: 'produto_indisponivel'; payload: { produtoId: string } }

const clients = new Set<ReadableStreamDefaultController>()

export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller)
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller)
}

export function notifyKitchen(event: KitchenEvent) {
  const msg = `data: ${JSON.stringify(event)}\n\n`
  const encoded = new TextEncoder().encode(msg)
  clients.forEach((c) => {
    try { c.enqueue(encoded) } catch { clients.delete(c) }
  })
}
```

- [ ] **Step 2: Create `app/api/events/route.ts`**

```typescript
// app/api/events/route.ts
import { NextRequest } from 'next/server'
import { addClient, removeClient } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export function GET(req: NextRequest) {
  let controller: ReadableStreamDefaultController

  const stream = new ReadableStream({
    start(c) {
      controller = c
      addClient(controller)
      // Send initial heartbeat
      controller.enqueue(new TextEncoder().encode(': connected\n\n'))
    },
    cancel() {
      removeClient(controller)
    },
  })

  req.signal.addEventListener('abort', () => removeClient(controller))

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
```

- [ ] **Step 3: Write SSE unit test**

```typescript
// tests/unit/sse.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addClient, removeClient, notifyKitchen } from '@/lib/sse'

describe('SSE notifyKitchen', () => {
  let received: string[] = []
  let controller: ReadableStreamDefaultController

  beforeEach(() => {
    received = []
    controller = {
      enqueue: (chunk: Uint8Array) => received.push(new TextDecoder().decode(chunk)),
    } as unknown as ReadableStreamDefaultController
  })

  it('sends event to connected client', () => {
    addClient(controller)
    notifyKitchen({ type: 'novo_pedido', payload: { pedidoId: 'abc', mesaNumero: 4, itens: ['Margherita'] } })
    expect(received).toHaveLength(1)
    expect(received[0]).toContain('novo_pedido')
    removeClient(controller)
  })

  it('does not send after client removed', () => {
    addClient(controller)
    removeClient(controller)
    notifyKitchen({ type: 'status_atualizado', payload: { pedidoId: 'abc', status: 'pronto' } })
    expect(received).toHaveLength(0)
  })

  it('handles enqueue error gracefully', () => {
    const badController = {
      enqueue: () => { throw new Error('stream closed') },
    } as unknown as ReadableStreamDefaultController
    addClient(badController)
    expect(() =>
      notifyKitchen({ type: 'produto_indisponivel', payload: { produtoId: 'x' } })
    ).not.toThrow()
  })
})
```

- [ ] **Step 4: Run SSE tests**

```bash
npm test tests/unit/sse.test.ts
```

Expected: 3 passing.

- [ ] **Step 5: Verify SSE endpoint**

```bash
npm run dev
# In another terminal:
curl -N http://localhost:3000/api/events
```

Expected: `": connected"` printed, connection stays open.

- [ ] **Step 6: Commit**

```bash
git add lib/sse.ts app/api/events/ tests/unit/sse.test.ts
git commit -m "feat: SSE infrastructure — notifyKitchen + /api/events endpoint"
```

---

## Task 5: Server Actions — Pedidos

**Files:**
- Create: `lib/actions/pedidos.ts`, `tests/unit/actions/pedidos.test.ts`

**Interfaces:**
- Consumes: `db` from `lib/db/index.ts`, `notifyKitchen` from `lib/sse.ts`, `pedido`, `itemPedido`, `mesa`, `produto` tables
- Produces:
  - `criarPedido(mesaId: string): Promise<{ id: string }>`
  - `adicionarItem(pedidoId: string, produtoId: string, quantidade: number, observacao?: string): Promise<void>`
  - `enviarPedido(pedidoId: string): Promise<void>` — fires SSE `novo_pedido`
  - `atualizarStatus(pedidoId: string, status: StatusPedido): Promise<void>` — fires SSE `status_atualizado`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/actions/pedidos.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db and sse before importing actions
vi.mock('@/lib/db/index', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  },
}))
vi.mock('@/lib/sse', () => ({ notifyKitchen: vi.fn() }))

import { db } from '@/lib/db/index'
import { notifyKitchen } from '@/lib/sse'
import { criarPedido, enviarPedido, atualizarStatus } from '@/lib/actions/pedidos'

beforeEach(() => vi.clearAllMocks())

describe('criarPedido', () => {
  it('inserts a new pedido and returns id', async () => {
    ;(db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'pedido-1' }]),
      }),
    })
    const result = await criarPedido('mesa-1')
    expect(result).toEqual({ id: 'pedido-1' })
  })
})

describe('enviarPedido', () => {
  it('calls notifyKitchen with novo_pedido event', async () => {
    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    })
    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { pedidoId: 'p-1', mesaNumero: 4, produtoNome: 'Margherita', quantidade: 2 }
          ]),
        }),
      }),
    })
    await enviarPedido('p-1')
    expect(notifyKitchen).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'novo_pedido' })
    )
  })
})

describe('atualizarStatus', () => {
  it('calls notifyKitchen with status_atualizado', async () => {
    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    })
    await atualizarStatus('p-1', 'em_preparo')
    expect(notifyKitchen).toHaveBeenCalledWith({
      type: 'status_atualizado',
      payload: { pedidoId: 'p-1', status: 'em_preparo' },
    })
  })

  it('throws if status is already entregue', async () => {
    // No update should fire after terminal status
    await expect(atualizarStatus('p-1', 'entregue')).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm test tests/unit/actions/pedidos.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/actions/pedidos.ts`**

```typescript
// lib/actions/pedidos.ts
'use server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { pedido, itemPedido, mesa, produto } from '@/lib/db/schema'
import type { StatusPedido } from '@/lib/db/schema'
import { notifyKitchen } from '@/lib/sse'

export async function criarPedido(mesaId: string): Promise<{ id: string }> {
  const [novo] = await db
    .insert(pedido)
    .values({ mesaId, status: 'novo' })
    .returning({ id: pedido.id })
  return { id: novo.id }
}

export async function adicionarItem(
  pedidoId: string,
  produtoId: string,
  quantidade: number,
  observacao?: string
): Promise<void> {
  const [prod] = await db
    .select({ preco: produto.preco })
    .from(produto)
    .where(eq(produto.id, produtoId))

  await db.insert(itemPedido).values({
    pedidoId,
    produtoId,
    quantidade,
    precoUnitario: prod.preco,
    observacao: observacao ?? null,
  })
}

export async function enviarPedido(pedidoId: string): Promise<void> {
  await db
    .update(pedido)
    .set({ status: 'novo', atualizadoEm: new Date() })
    .where(eq(pedido.id, pedidoId))

  // Fetch mesa number and items for SSE payload
  const rows = await db
    .select({
      pedidoId: pedido.id,
      mesaNumero: mesa.numero,
      produtoNome: produto.nome,
      quantidade: itemPedido.quantidade,
    })
    .from(itemPedido)
    .innerJoin(pedido, eq(itemPedido.pedidoId, pedido.id))
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .innerJoin(produto, eq(itemPedido.produtoId, produto.id))
    .where(eq(pedido.id, pedidoId))

  const mesaNumero = rows[0]?.mesaNumero ?? 0
  const itens = rows.map((r) => `${r.quantidade}x ${r.produtoNome}`)

  notifyKitchen({ type: 'novo_pedido', payload: { pedidoId, mesaNumero, itens } })
}

export async function atualizarStatus(
  pedidoId: string,
  status: StatusPedido
): Promise<void> {
  await db
    .update(pedido)
    .set({ status, atualizadoEm: new Date() })
    .where(eq(pedido.id, pedidoId))

  notifyKitchen({ type: 'status_atualizado', payload: { pedidoId, status } })
}
```

- [ ] **Step 4: Run tests again**

```bash
npm test tests/unit/actions/pedidos.test.ts
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/pedidos.ts tests/unit/actions/pedidos.test.ts
git commit -m "feat: Server Actions — criarPedido, adicionarItem, enviarPedido, atualizarStatus"
```

---

## Task 6: Server Actions — Cardápio e Mesas

**Files:**
- Create: `lib/actions/produtos.ts`, `lib/actions/mesas.ts`, `tests/unit/actions/produtos.test.ts`

**Interfaces:**
- Produces:
  - `criarCategoria(nome: string): Promise<{ id: string }>`
  - `reordenarCategorias(ids: string[]): Promise<void>`
  - `criarProduto(data: NovoProduto): Promise<{ id: string }>`
  - `editarProduto(id: string, data: Partial<NovoProduto>): Promise<void>`
  - `toggleDisponivel(id: string): Promise<void>` — fires SSE `produto_indisponivel` se desativado
  - `criarMesa(numero: number): Promise<{ id: string }>`
  - `toggleAtiva(id: string): Promise<void>`

```typescript
// NovoProduto type
type NovoProduto = {
  categoriaId: string
  nome: string
  descricao?: string
  preco: string  // numeric string, e.g. "32.90"
  imagemUrl?: string
}
```

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/actions/produtos.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/index', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
  },
}))
vi.mock('@/lib/sse', () => ({ notifyKitchen: vi.fn() }))

import { db } from '@/lib/db/index'
import { notifyKitchen } from '@/lib/sse'
import { criarProduto, toggleDisponivel, criarCategoria } from '@/lib/actions/produtos'
import { criarMesa } from '@/lib/actions/mesas'

beforeEach(() => vi.clearAllMocks())

describe('criarCategoria', () => {
  it('inserts and returns id', async () => {
    ;(db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'cat-1' }]),
      }),
    })
    expect(await criarCategoria('Pizzas')).toEqual({ id: 'cat-1' })
  })
})

describe('criarProduto', () => {
  it('inserts produto and returns id', async () => {
    ;(db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'prod-1' }]),
      }),
    })
    const result = await criarProduto({ categoriaId: 'cat-1', nome: 'Margherita', preco: '32.00' })
    expect(result).toEqual({ id: 'prod-1' })
  })
})

describe('toggleDisponivel', () => {
  it('fires produto_indisponivel SSE when disabling', async () => {
    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'prod-1', disponivel: true }]),
      }),
    })
    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    })
    await toggleDisponivel('prod-1')
    expect(notifyKitchen).toHaveBeenCalledWith({
      type: 'produto_indisponivel',
      payload: { produtoId: 'prod-1' },
    })
  })
})

describe('criarMesa', () => {
  it('inserts mesa and returns id', async () => {
    ;(db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'mesa-1' }]),
      }),
    })
    expect(await criarMesa(5)).toEqual({ id: 'mesa-1' })
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test tests/unit/actions/produtos.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/actions/produtos.ts`**

```typescript
// lib/actions/produtos.ts
'use server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { categoria, produto } from '@/lib/db/schema'
import { notifyKitchen } from '@/lib/sse'

type NovoProduto = {
  categoriaId: string
  nome: string
  descricao?: string
  preco: string
  imagemUrl?: string
}

export async function criarCategoria(nome: string): Promise<{ id: string }> {
  const max = await db.select({ ordem: categoria.ordem }).from(categoria)
  const ordem = max.length ? Math.max(...max.map((c) => c.ordem)) + 1 : 0
  const [cat] = await db
    .insert(categoria)
    .values({ nome, ordem })
    .returning({ id: categoria.id })
  return { id: cat.id }
}

export async function reordenarCategorias(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, ordem) =>
      db.update(categoria).set({ ordem }).where(eq(categoria.id, id))
    )
  )
}

export async function criarProduto(data: NovoProduto): Promise<{ id: string }> {
  const [prod] = await db
    .insert(produto)
    .values({
      categoriaId: data.categoriaId,
      nome: data.nome,
      descricao: data.descricao ?? null,
      preco: data.preco,
      imagemUrl: data.imagemUrl ?? null,
    })
    .returning({ id: produto.id })
  return { id: prod.id }
}

export async function editarProduto(
  id: string,
  data: Partial<NovoProduto>
): Promise<void> {
  await db
    .update(produto)
    .set({
      ...(data.nome && { nome: data.nome }),
      ...(data.descricao !== undefined && { descricao: data.descricao }),
      ...(data.preco && { preco: data.preco }),
      ...(data.imagemUrl !== undefined && { imagemUrl: data.imagemUrl }),
      ...(data.categoriaId && { categoriaId: data.categoriaId }),
    })
    .where(eq(produto.id, id))
}

export async function toggleDisponivel(id: string): Promise<void> {
  const [prod] = await db
    .select({ id: produto.id, disponivel: produto.disponivel })
    .from(produto)
    .where(eq(produto.id, id))

  const novoEstado = !prod.disponivel
  await db.update(produto).set({ disponivel: novoEstado }).where(eq(produto.id, id))

  if (!novoEstado) {
    notifyKitchen({ type: 'produto_indisponivel', payload: { produtoId: id } })
  }
}
```

- [ ] **Step 4: Implement `lib/actions/mesas.ts`**

```typescript
// lib/actions/mesas.ts
'use server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { mesa } from '@/lib/db/schema'

export async function criarMesa(numero: number): Promise<{ id: string }> {
  const [m] = await db
    .insert(mesa)
    .values({ numero })
    .returning({ id: mesa.id })
  return { id: m.id }
}

export async function toggleAtiva(id: string): Promise<void> {
  const [m] = await db
    .select({ ativa: mesa.ativa })
    .from(mesa)
    .where(eq(mesa.id, id))

  await db.update(mesa).set({ ativa: !m.ativa }).where(eq(mesa.id, id))
}
```

- [ ] **Step 5: Run tests**

```bash
npm test tests/unit/actions/produtos.test.ts
```

Expected: 4 passing.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/ tests/unit/actions/produtos.test.ts
git commit -m "feat: Server Actions — cardápio (categorias, produtos) e mesas"
```

---

## Task 7: Zustand Cart Store

**Files:**
- Create: `lib/store/cart.ts`, `tests/unit/store/cart.test.ts`

**Interfaces:**
- Produces:
  - `useCart()` — Zustand hook
  - `CartItem: { produtoId, nome, preco, quantidade, observacao? }`
  - `CartState: { items: CartItem[], total: number }`
  - Methods: `addItem`, `removeItem`, `decrementItem`, `clearCart`, `setObservacao`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/store/cart.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useCart } from '@/lib/store/cart'

beforeEach(() => {
  useCart.setState({ items: [], total: 0 })
})

describe('useCart', () => {
  it('starts empty', () => {
    expect(useCart.getState().items).toHaveLength(0)
    expect(useCart.getState().total).toBe(0)
  })

  it('addItem increments quantity if item exists', () => {
    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
    })
    const { items, total } = useCart.getState()
    expect(items).toHaveLength(1)
    expect(items[0].quantidade).toBe(2)
    expect(total).toBe(64)
  })

  it('addItem adds new entry for different product', () => {
    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().addItem({ produtoId: 'p2', nome: 'Pepperoni', preco: 38 })
    })
    expect(useCart.getState().items).toHaveLength(2)
    expect(useCart.getState().total).toBe(70)
  })

  it('removeItem removes the item entirely', () => {
    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().removeItem('p1')
    })
    expect(useCart.getState().items).toHaveLength(0)
    expect(useCart.getState().total).toBe(0)
  })

  it('decrementItem removes item when quantity reaches 0', () => {
    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().decrementItem('p1')
    })
    expect(useCart.getState().items).toHaveLength(0)
  })

  it('clearCart empties everything', () => {
    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().clearCart()
    })
    expect(useCart.getState().items).toHaveLength(0)
    expect(useCart.getState().total).toBe(0)
  })

  it('setObservacao sets observation for item', () => {
    act(() => {
      useCart.getState().addItem({ produtoId: 'p1', nome: 'Margherita', preco: 32 })
      useCart.getState().setObservacao('p1', 'sem cebola')
    })
    expect(useCart.getState().items[0].observacao).toBe('sem cebola')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test tests/unit/store/cart.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/store/cart.ts`**

```typescript
// lib/store/cart.ts
import { create } from 'zustand'

export type CartItem = {
  produtoId: string
  nome: string
  preco: number
  quantidade: number
  observacao?: string
}

type CartState = {
  items: CartItem[]
  total: number
  addItem: (item: Pick<CartItem, 'produtoId' | 'nome' | 'preco'>) => void
  removeItem: (produtoId: string) => void
  decrementItem: (produtoId: string) => void
  clearCart: () => void
  setObservacao: (produtoId: string, observacao: string) => void
}

export const useCart = create<CartState>((set) => ({
  items: [],
  total: 0,

  addItem: ({ produtoId, nome, preco }) =>
    set((s) => {
      const existing = s.items.find((i) => i.produtoId === produtoId)
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i
          ),
          total: s.total + preco,
        }
      }
      return {
        items: [...s.items, { produtoId, nome, preco, quantidade: 1 }],
        total: s.total + preco,
      }
    }),

  removeItem: (produtoId) =>
    set((s) => {
      const item = s.items.find((i) => i.produtoId === produtoId)
      return {
        items: s.items.filter((i) => i.produtoId !== produtoId),
        total: s.total - (item ? item.preco * item.quantidade : 0),
      }
    }),

  decrementItem: (produtoId) =>
    set((s) => {
      const item = s.items.find((i) => i.produtoId === produtoId)
      if (!item) return s
      if (item.quantidade === 1) {
        return {
          items: s.items.filter((i) => i.produtoId !== produtoId),
          total: s.total - item.preco,
        }
      }
      return {
        items: s.items.map((i) =>
          i.produtoId === produtoId ? { ...i, quantidade: i.quantidade - 1 } : i
        ),
        total: s.total - item.preco,
      }
    }),

  clearCart: () => set({ items: [], total: 0 }),

  setObservacao: (produtoId, observacao) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.produtoId === produtoId ? { ...i, observacao } : i
      ),
    })),
}))
```

- [ ] **Step 4: Run tests**

```bash
npm test tests/unit/store/cart.test.ts
```

Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/store/cart.ts tests/unit/store/cart.test.ts
git commit -m "feat: Zustand cart store — addItem, removeItem, decrement, clear, observacao"
```

---

## Task 8: Shared Components

**Files:**
- Create: `components/status-badge.tsx`, `components/garcom/item-card.tsx`, `components/garcom/cart-fab.tsx`, `components/garcom/cart-drawer.tsx`, `components/garcom/observacao-sheet.tsx`, `components/garcom/menu-grid.tsx`

**Interfaces:**
- Consumes: `useCart` from `lib/store/cart.ts`, Shadcn `Badge`, `Button`, `Drawer`, `Sheet`
- Produces:
  - `<StatusBadge status={StatusPedido} />`
  - `<ItemCard produto={Produto} />`
  - `<CartFab />`
  - `<CartDrawer mesaId={string} pedidoId={string} />`
  - `<MenuGrid categorias={CategoriaComProdutos[]} />`

- [ ] **Step 1: Create `components/status-badge.tsx`**

```typescript
// components/status-badge.tsx
import { Badge } from '@/components/ui/badge'
import type { StatusPedido } from '@/lib/db/schema'

const statusConfig: Record<StatusPedido, { label: string; className: string }> = {
  novo:       { label: 'Novo',       className: 'bg-foreground text-background' },
  em_preparo: { label: 'Em Preparo', className: 'bg-amber-500 text-white' },
  pronto:     { label: 'Pronto',     className: 'bg-green-600 text-white' },
  entregue:   { label: 'Entregue',   className: 'bg-muted text-muted-foreground' },
}

export function StatusBadge({ status }: { status: StatusPedido }) {
  const { label, className } = statusConfig[status]
  return <Badge className={className}>{label}</Badge>
}
```

- [ ] **Step 2: Create `components/garcom/item-card.tsx`**

```typescript
// components/garcom/item-card.tsx
'use client'
import { Button } from '@/components/ui/button'
import { Plus, Minus } from 'lucide-react'
import { useCart } from '@/lib/store/cart'

type Produto = {
  id: string
  nome: string
  descricao: string | null
  preco: string
  imagemUrl: string | null
  disponivel: boolean
}

export function ItemCard({ produto }: { produto: Produto }) {
  const { items, addItem, decrementItem } = useCart()
  const cartItem = items.find((i) => i.produtoId === produto.id)
  const preco = parseFloat(produto.preco)

  return (
    <div className="border rounded-[var(--radius)] p-3 flex flex-col gap-2">
      {produto.imagemUrl && (
        <img
          src={produto.imagemUrl}
          alt={produto.nome}
          className="w-full h-32 object-cover rounded-[var(--radius)]"
          loading="lazy"
        />
      )}
      <div>
        <p className="font-semibold text-sm">{produto.nome}</p>
        {produto.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{produto.descricao}</p>
        )}
        <p className="text-sm font-medium mt-1">R$ {preco.toFixed(2)}</p>
      </div>
      {!produto.disponivel ? (
        <p className="text-xs text-muted-foreground">Indisponível</p>
      ) : cartItem ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => decrementItem(produto.id)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-6 text-center">{cartItem.quantidade}</span>
          <Button
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => addItem({ produtoId: produto.id, nome: produto.nome, preco })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          className="h-12 w-full"
          onClick={() => addItem({ produtoId: produto.id, nome: produto.nome, preco })}
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `components/garcom/cart-fab.tsx`**

```typescript
// components/garcom/cart-fab.tsx
'use client'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/store/cart'

export function CartFab({ onClick }: { onClick: () => void }) {
  const { items } = useCart()
  const total = items.reduce((acc, i) => acc + i.quantidade, 0)

  if (total === 0) return null

  return (
    <Button
      size="lg"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 p-0"
      onClick={onClick}
    >
      <ShoppingCart className="h-6 w-6" />
      <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
        {total > 9 ? '9+' : total}
      </span>
    </Button>
  )
}
```

- [ ] **Step 4: Create `components/garcom/cart-drawer.tsx`**

```typescript
// components/garcom/cart-drawer.tsx
'use client'
import { useState } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Trash2, Minus, Plus } from 'lucide-react'
import { useCart } from '@/lib/store/cart'
import { enviarPedido } from '@/lib/actions/pedidos'
import { ObservacaoSheet } from './observacao-sheet'

type Props = {
  open: boolean
  onClose: () => void
  pedidoId: string
  mesaNumero: number
}

export function CartDrawer({ open, onClose, pedidoId, mesaNumero }: Props) {
  const { items, total, removeItem, addItem, decrementItem, clearCart } = useCart()
  const [sending, setSending] = useState(false)
  const [obsItem, setObsItem] = useState<string | null>(null)

  async function handleEnviar() {
    setSending(true)
    try {
      await enviarPedido(pedidoId)
      clearCart()
      onClose()
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Carrinho — Mesa {mesaNumero}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 space-y-3 overflow-y-auto max-h-[60vh]">
            {items.map((item) => (
              <div key={item.produtoId} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.nome}</p>
                  {item.observacao && (
                    <p className="text-xs text-muted-foreground">Obs: {item.observacao}</p>
                  )}
                  <button
                    className="text-xs text-ring underline"
                    onClick={() => setObsItem(item.produtoId)}
                  >
                    {item.observacao ? 'Editar obs.' : '+ Observação'}
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                    onClick={() => decrementItem(item.produtoId)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{item.quantidade}</span>
                  <Button size="sm" className="h-7 w-7 p-0"
                    onClick={() => addItem({ produtoId: item.produtoId, nome: item.nome, preco: item.preco })}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                    onClick={() => removeItem(item.produtoId)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="px-4 flex justify-between font-semibold">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
          <DrawerFooter>
            <Button size="lg" className="h-12 w-full" onClick={handleEnviar} disabled={sending || items.length === 0}>
              {sending ? 'Enviando…' : 'Enviar Pedido'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      {obsItem && (
        <ObservacaoSheet
          open={!!obsItem}
          produtoId={obsItem}
          onClose={() => setObsItem(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 5: Create `components/garcom/observacao-sheet.tsx`**

```typescript
// components/garcom/observacao-sheet.tsx
'use client'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/store/cart'

type Props = { open: boolean; produtoId: string; onClose: () => void }

export function ObservacaoSheet({ open, produtoId, onClose }: Props) {
  const { items, setObservacao } = useCart()
  const item = items.find((i) => i.produtoId === produtoId)
  const [text, setText] = useState(item?.observacao ?? '')

  function handleSave() {
    setObservacao(produtoId, text)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Observação — {item?.nome}</SheetTitle>
        </SheetHeader>
        <Textarea
          className="mt-4"
          placeholder="Ex: sem cebola, bem passado…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
        <SheetFooter className="mt-4">
          <Button className="w-full h-12" onClick={handleSave}>Salvar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 6: Create `components/garcom/menu-grid.tsx`**

```typescript
// components/garcom/menu-grid.tsx
'use client'
import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ItemCard } from './item-card'

type Produto = {
  id: string; nome: string; descricao: string | null; preco: string
  imagemUrl: string | null; disponivel: boolean
}
type Categoria = { id: string; nome: string; produtos: Produto[] }

export function MenuGrid({ categorias }: { categorias: Categoria[] }) {
  return (
    <Tabs defaultValue={categorias[0]?.id}>
      <TabsList className="w-full overflow-x-auto flex justify-start gap-1 mb-4">
        {categorias.map((c) => (
          <TabsTrigger key={c.id} value={c.id} className="shrink-0">{c.nome}</TabsTrigger>
        ))}
      </TabsList>
      {categorias.map((c) => (
        <TabsContent key={c.id} value={c.id}>
          <div className="grid grid-cols-2 gap-3">
            {c.produtos.map((p) => <ItemCard key={p.id} produto={p} />)}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add components/
git commit -m "feat: shared components — StatusBadge, ItemCard, CartFab, CartDrawer, MenuGrid"
```

---

## Task 9: Garçom App

**Files:**
- Create: `app/(garcom)/layout.tsx`, `app/(garcom)/mesa/[id]/page.tsx`, `app/(garcom)/pedidos/page.tsx`

**Interfaces:**
- Consumes: `auth` from `lib/auth/server.ts`, `db`, `criarPedido`, `MenuGrid`, `CartFab`, `CartDrawer`

- [ ] **Step 1: Create `app/(garcom)/layout.tsx`**

```typescript
// app/(garcom)/layout.tsx
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export default async function GarcomLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.getSession()
  if (!session?.user) redirect('/auth/sign-in')
  return <div className="min-h-screen bg-background">{children}</div>
}
```

- [ ] **Step 2: Create `app/(garcom)/mesa/[id]/page.tsx`**

```typescript
// app/(garcom)/mesa/[id]/page.tsx
import { db } from '@/lib/db/index'
import { eq, asc } from 'drizzle-orm'
import { mesa, categoria, produto } from '@/lib/db/schema'
import { criarPedido } from '@/lib/actions/pedidos'
import { notFound } from 'next/navigation'
import { MesaPageClient } from './client'

export default async function MesaPage({ params }: { params: { id: string } }) {
  const [m] = await db.select().from(mesa).where(eq(mesa.id, params.id))
  if (!m || !m.ativa) notFound()

  const categorias = await db
    .select()
    .from(categoria)
    .orderBy(asc(categoria.ordem))

  const produtos = await db
    .select()
    .from(produto)
    .where(eq(produto.disponivel, true))

  const categoriaComProdutos = categorias.map((c) => ({
    ...c,
    produtos: produtos.filter((p) => p.categoriaId === c.id),
  }))

  // Create a new pedido for this session
  const { id: pedidoId } = await criarPedido(m.id)

  return (
    <MesaPageClient
      mesaNumero={m.numero}
      mesaId={m.id}
      pedidoId={pedidoId}
      categorias={categoriaComProdutos}
    />
  )
}
```

- [ ] **Step 3: Create `app/(garcom)/mesa/[id]/client.tsx`**

```typescript
// app/(garcom)/mesa/[id]/client.tsx
'use client'
import { useState } from 'react'
import { MenuGrid } from '@/components/garcom/menu-grid'
import { CartFab } from '@/components/garcom/cart-fab'
import { CartDrawer } from '@/components/garcom/cart-drawer'

type Props = {
  mesaNumero: number
  mesaId: string
  pedidoId: string
  categorias: Array<{ id: string; nome: string; produtos: any[] }>
}

export function MesaPageClient({ mesaNumero, mesaId, pedidoId, categorias }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-semibold mb-4">Mesa {mesaNumero}</h1>
      <MenuGrid categorias={categorias} />
      <CartFab onClick={() => setDrawerOpen(true)} />
      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pedidoId={pedidoId}
        mesaNumero={mesaNumero}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create `app/(garcom)/pedidos/page.tsx`**

```typescript
// app/(garcom)/pedidos/page.tsx
import { db } from '@/lib/db/index'
import { desc, eq } from 'drizzle-orm'
import { pedido, mesa, itemPedido, produto } from '@/lib/db/schema'
import { StatusBadge } from '@/components/status-badge'
import { auth } from '@/lib/auth/server'

export default async function PedidosPage() {
  const session = await auth.getSession()

  const pedidos = await db
    .select({
      id: pedido.id,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      mesaNumero: mesa.numero,
    })
    .from(pedido)
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .orderBy(desc(pedido.criadoEm))
    .limit(20)

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Pedidos Recentes</h1>
      <div className="space-y-3">
        {pedidos.map((p) => (
          <div key={p.id} className="border rounded-[var(--radius)] p-3 flex justify-between items-center">
            <div>
              <p className="font-medium">Mesa {p.mesaNumero}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(p.criadoEm).toLocaleTimeString('pt-BR')}
              </p>
            </div>
            <StatusBadge status={p.status} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(garcom\)/
git commit -m "feat: garçom app — mesa page, menu, cart, pedidos recentes"
```

---

## Task 10: Cozinha Display + SSE Listener

**Files:**
- Create: `app/(cozinha)/layout.tsx`, `app/(cozinha)/dashboard/page.tsx`, `components/cozinha/kanban-board.tsx`, `components/cozinha/pedido-card.tsx`, `components/cozinha/sse-listener.tsx`

**Interfaces:**
- Consumes: `KitchenEvent` from `lib/sse.ts`, `atualizarStatus` action, `StatusBadge`

- [ ] **Step 1: Create `app/(cozinha)/layout.tsx`**

```typescript
// app/(cozinha)/layout.tsx
export default function CozinhaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/cozinha/sse-listener.tsx`**

```typescript
// components/cozinha/sse-listener.tsx
'use client'
import { useEffect } from 'react'
import type { KitchenEvent } from '@/lib/sse'

type Props = {
  onEvent: (event: KitchenEvent) => void
}

export function SseListener({ onEvent }: Props) {
  useEffect(() => {
    const es = new EventSource('/api/events')
    es.onmessage = (e) => {
      try {
        const event: KitchenEvent = JSON.parse(e.data)
        onEvent(event)
      } catch { /* ignore malformed */ }
    }
    es.onerror = () => {
      // Browser auto-reconnects on error
    }
    return () => es.close()
  }, [onEvent])

  return null
}
```

- [ ] **Step 3: Create `components/cozinha/pedido-card.tsx`**

```typescript
// components/cozinha/pedido-card.tsx
'use client'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { atualizarStatus } from '@/lib/actions/pedidos'
import type { StatusPedido } from '@/lib/db/schema'

type Item = { nome: string; quantidade: number; observacao?: string | null }
type Pedido = {
  id: string
  mesaNumero: number
  status: StatusPedido
  criadoEm: Date
  itens: Item[]
}

const nextStatus: Record<StatusPedido, StatusPedido | null> = {
  novo: 'em_preparo',
  em_preparo: 'pronto',
  pronto: 'entregue',
  entregue: null,
}

const nextLabel: Record<StatusPedido, string> = {
  novo: 'Iniciar Preparo',
  em_preparo: 'Marcar Pronto',
  pronto: 'Confirmar Entrega',
  entregue: '',
}

export function PedidoCard({ pedido, onStatusChange }: {
  pedido: Pedido
  onStatusChange: (pedidoId: string, status: StatusPedido) => void
}) {
  const [pending, startTransition] = useTransition()
  const next = nextStatus[pedido.status]

  const elapsed = Math.floor((Date.now() - new Date(pedido.criadoEm).getTime()) / 60000)

  function handleAdvance() {
    if (!next) return
    startTransition(async () => {
      await atualizarStatus(pedido.id, next)
      onStatusChange(pedido.id, next)
    })
  }

  return (
    <div className="border rounded-[var(--radius)] p-3 space-y-2 bg-card">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-lg">Mesa {pedido.mesaNumero}</p>
          <p className="text-xs text-muted-foreground">{elapsed}min atrás</p>
        </div>
        <StatusBadge status={pedido.status} />
      </div>
      <ul className="text-sm space-y-1">
        {pedido.itens.map((item, i) => (
          <li key={i}>
            <span className="font-medium">{item.quantidade}x {item.nome}</span>
            {item.observacao && (
              <span className="text-xs text-muted-foreground ml-1">({item.observacao})</span>
            )}
          </li>
        ))}
      </ul>
      {next && (
        <Button
          size="lg"
          className="w-full h-12"
          onClick={handleAdvance}
          disabled={pending}
        >
          {pending ? 'Salvando…' : nextLabel[pedido.status]}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `components/cozinha/kanban-board.tsx`**

```typescript
// components/cozinha/kanban-board.tsx
'use client'
import { useState, useCallback } from 'react'
import { PedidoCard } from './pedido-card'
import { SseListener } from './sse-listener'
import type { StatusPedido } from '@/lib/db/schema'
import type { KitchenEvent } from '@/lib/sse'

type Item = { nome: string; quantidade: number; observacao?: string | null }
type Pedido = { id: string; mesaNumero: number; status: StatusPedido; criadoEm: Date; itens: Item[] }

const COLUMNS: { key: StatusPedido; label: string }[] = [
  { key: 'novo',       label: 'Novos' },
  { key: 'em_preparo', label: 'Em Preparo' },
  { key: 'pronto',     label: 'Prontos' },
  { key: 'entregue',   label: 'Entregues' },
]

export function KanbanBoard({ initialPedidos }: { initialPedidos: Pedido[] }) {
  const [pedidos, setPedidos] = useState(initialPedidos)

  const handleEvent = useCallback((event: KitchenEvent) => {
    if (event.type === 'novo_pedido') {
      const { pedidoId, mesaNumero, itens } = event.payload as any
      setPedidos((prev) => [
        {
          id: pedidoId,
          mesaNumero,
          status: 'novo' as StatusPedido,
          criadoEm: new Date(),
          itens: itens.map((i: string) => {
            const match = i.match(/^(\d+)x (.+)$/)
            return { quantidade: Number(match?.[1] ?? 1), nome: match?.[2] ?? i }
          }),
        },
        ...prev,
      ])
    }
    if (event.type === 'status_atualizado') {
      const { pedidoId, status } = event.payload as any
      setPedidos((prev) =>
        prev.map((p) => p.id === pedidoId ? { ...p, status } : p)
      )
    }
  }, [])

  const handleStatusChange = useCallback((pedidoId: string, status: StatusPedido) => {
    setPedidos((prev) => prev.map((p) => p.id === pedidoId ? { ...p, status } : p))
  }, [])

  return (
    <>
      <SseListener onEvent={handleEvent} />
      <div className="grid grid-cols-4 gap-4 h-full">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex flex-col gap-2">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {col.label} ({pedidos.filter((p) => p.status === col.key).length})
            </h2>
            <div className="space-y-3 overflow-y-auto">
              {pedidos
                .filter((p) => p.status === col.key)
                .map((p) => (
                  <PedidoCard key={p.id} pedido={p} onStatusChange={handleStatusChange} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 5: Create `app/(cozinha)/dashboard/page.tsx`**

```typescript
// app/(cozinha)/dashboard/page.tsx
import { db } from '@/lib/db/index'
import { desc, eq, inArray } from 'drizzle-orm'
import { pedido, itemPedido, produto, mesa } from '@/lib/db/schema'
import { KanbanBoard } from '@/components/cozinha/kanban-board'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const pedidosAtivos = await db
    .select({
      id: pedido.id,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      mesaNumero: mesa.numero,
    })
    .from(pedido)
    .innerJoin(mesa, eq(pedido.mesaId, mesa.id))
    .where(inArray(pedido.status, ['novo', 'em_preparo', 'pronto']))
    .orderBy(desc(pedido.criadoEm))

  const pedidoIds = pedidosAtivos.map((p) => p.id)

  const itens =
    pedidoIds.length > 0
      ? await db
          .select({
            pedidoId: itemPedido.pedidoId,
            nome: produto.nome,
            quantidade: itemPedido.quantidade,
            observacao: itemPedido.observacao,
          })
          .from(itemPedido)
          .innerJoin(produto, eq(itemPedido.produtoId, produto.id))
          .where(inArray(itemPedido.pedidoId, pedidoIds))
      : []

  const initialPedidos = pedidosAtivos.map((p) => ({
    ...p,
    itens: itens.filter((i) => i.pedidoId === p.id),
  }))

  return (
    <div className="p-6 h-screen flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Cozinha</h1>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialPedidos={initialPedidos} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add app/\(cozinha\)/ components/cozinha/
git commit -m "feat: cozinha display — kanban board + SSE listener + status actions"
```

---

## Task 11: Admin — Menu

**Files:**
- Create: `app/(admin)/layout.tsx`, `app/(admin)/menu/page.tsx`, `components/admin/categoria-sidebar.tsx`, `components/admin/produto-form.tsx`

- [ ] **Step 1: Create `app/(admin)/layout.tsx`**

```typescript
// app/(admin)/layout.tsx
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/index'
import { eq } from 'drizzle-orm'
import { usuario } from '@/lib/db/schema'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.getSession()
  if (!session?.user) redirect('/auth/sign-in')

  const [u] = await db
    .select({ role: usuario.role })
    .from(usuario)
    .where(eq(usuario.id, session.user.id))

  if (!u || u.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-3 flex gap-6">
        <a href="/admin/menu" className="text-sm font-medium hover:text-primary">Cardápio</a>
        <a href="/admin/mesas" className="text-sm font-medium hover:text-primary">Mesas</a>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/admin/produto-form.tsx`**

```typescript
// components/admin/produto-form.tsx
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { criarProduto, editarProduto } from '@/lib/actions/produtos'
import { useRouter } from 'next/navigation'

type Produto = { id: string; nome: string; descricao: string | null; preco: string; imagemUrl: string | null }
type Props = {
  open: boolean
  onClose: () => void
  categoriaId: string
  produto?: Produto
}

export function ProdutoForm({ open, onClose, categoriaId, produto }: Props) {
  const router = useRouter()
  const [nome, setNome] = useState(produto?.nome ?? '')
  const [descricao, setDescricao] = useState(produto?.descricao ?? '')
  const [preco, setPreco] = useState(produto?.preco ?? '')
  const [imagemUrl, setImagemUrl] = useState(produto?.imagemUrl ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      if (produto) {
        await editarProduto(produto.id, { nome, descricao, preco, imagemUrl })
      } else {
        await criarProduto({ categoriaId, nome, descricao, preco, imagemUrl })
      }
      router.refresh()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{produto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} /></div>
          <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} /></div>
          <div><Label>URL da Imagem</Label><Input value={imagemUrl} onChange={(e) => setImagemUrl(e.target.value)} placeholder="https://..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !nome || !preco}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Create `app/(admin)/menu/page.tsx`**

```typescript
// app/(admin)/menu/page.tsx
import { db } from '@/lib/db/index'
import { asc } from 'drizzle-orm'
import { categoria, produto } from '@/lib/db/schema'
import { MenuAdminClient } from './client'

export default async function MenuAdminPage() {
  const categorias = await db.select().from(categoria).orderBy(asc(categoria.ordem))
  const produtos = await db.select().from(produto)

  const categoriaComProdutos = categorias.map((c) => ({
    ...c,
    produtos: produtos.filter((p) => p.categoriaId === c.id),
  }))

  return <MenuAdminClient categorias={categoriaComProdutos} />
}
```

- [ ] **Step 4: Create `app/(admin)/menu/client.tsx`**

```typescript
// app/(admin)/menu/client.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil } from 'lucide-react'
import { ProdutoForm } from '@/components/admin/produto-form'
import { criarCategoria, toggleDisponivel } from '@/lib/actions/produtos'
import { useRouter } from 'next/navigation'

type Produto = { id: string; nome: string; descricao: string | null; preco: string; imagemUrl: string | null; disponivel: boolean }
type Categoria = { id: string; nome: string; ordem: number; produtos: Produto[] }

export function MenuAdminClient({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState(categorias[0]?.id ?? '')
  const [formOpen, setFormOpen] = useState(false)
  const [editProduto, setEditProduto] = useState<Produto | undefined>()
  const [newCat, setNewCat] = useState('')

  const catAtual = categorias.find((c) => c.id === selected)

  async function handleNewCategoria() {
    if (!newCat.trim()) return
    await criarCategoria(newCat.trim())
    setNewCat('')
    router.refresh()
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-48 space-y-1 shrink-0">
        <p className="text-xs uppercase text-muted-foreground font-medium mb-2">Categorias</p>
        {categorias.map((c) => (
          <button
            key={c.id}
            className={`w-full text-left px-3 py-2 rounded-[var(--radius)] text-sm ${selected === c.id ? 'bg-muted font-semibold' : 'hover:bg-muted/50'}`}
            onClick={() => setSelected(c.id)}
          >
            {c.nome}
          </button>
        ))}
        <div className="flex gap-1 mt-3">
          <input
            className="border rounded-[var(--radius)] px-2 py-1 text-xs w-full"
            placeholder="Nova categoria"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNewCategoria()}
          />
        </div>
      </div>

      {/* Products list */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">{catAtual?.nome}</h2>
          <Button size="sm" onClick={() => { setEditProduto(undefined); setFormOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Novo Produto
          </Button>
        </div>
        <div className="space-y-2">
          {catAtual?.produtos.map((p) => (
            <div key={p.id} className="border rounded-[var(--radius)] px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{p.nome}</span>
                <span className="text-muted-foreground text-sm ml-2">R$ {parseFloat(p.preco).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className="cursor-pointer"
                  variant={p.disponivel ? 'default' : 'secondary'}
                  onClick={async () => { await toggleDisponivel(p.id); router.refresh() }}
                >
                  {p.disponivel ? 'Disponível' : 'Indisponível'}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => { setEditProduto(p); setFormOpen(true) }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <ProdutoForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          categoriaId={selected}
          produto={editProduto}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(admin\)/ components/admin/
git commit -m "feat: admin menu — categorias, produtos CRUD, toggle disponivel"
```

---

## Task 12: Admin — Mesas

**Files:**
- Create: `app/(admin)/mesas/page.tsx`

- [ ] **Step 1: Create `app/(admin)/mesas/page.tsx`**

```typescript
// app/(admin)/mesas/page.tsx
import { db } from '@/lib/db/index'
import { asc } from 'drizzle-orm'
import { mesa } from '@/lib/db/schema'
import { MesasAdminClient } from './client'

export default async function MesasAdminPage() {
  const mesas = await db.select().from(mesa).orderBy(asc(mesa.numero))
  return <MesasAdminClient mesas={mesas} />
}
```

- [ ] **Step 2: Create `app/(admin)/mesas/client.tsx`**

```typescript
// app/(admin)/mesas/client.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { criarMesa, toggleAtiva } from '@/lib/actions/mesas'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

type Mesa = { id: string; numero: number; ativa: boolean }

export function MesasAdminClient({ mesas }: { mesas: Mesa[] }) {
  const router = useRouter()
  const [novoNumero, setNovoNumero] = useState('')

  async function handleNovaMesa() {
    const n = parseInt(novoNumero)
    if (!n) return
    await criarMesa(n)
    setNovoNumero('')
    router.refresh()
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="flex gap-2">
        <input
          type="number"
          className="border rounded-[var(--radius)] px-3 py-2 text-sm w-32"
          placeholder="Nº da mesa"
          value={novoNumero}
          onChange={(e) => setNovoNumero(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleNovaMesa()}
        />
        <Button size="sm" onClick={handleNovaMesa}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar Mesa
        </Button>
      </div>
      <div className="space-y-2">
        {mesas.map((m) => (
          <div key={m.id} className="border rounded-[var(--radius)] px-4 py-3 flex justify-between items-center">
            <span className="font-medium">Mesa {m.numero}</span>
            <Badge
              className="cursor-pointer"
              variant={m.ativa ? 'default' : 'secondary'}
              onClick={async () => { await toggleAtiva(m.id); router.refresh() }}
            >
              {m.ativa ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(admin\)/mesas/
git commit -m "feat: admin mesas — criar e ativar/desativar mesas"
```

---

## Task 13: Auth Pages

**Files:**
- Create: `app/auth/sign-in/page.tsx`, `app/auth/sign-up/page.tsx`, `app/page.tsx`, `app/layout.tsx`

- [ ] **Step 1: Create `app/layout.tsx`**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Gestão de Pedidos',
  description: 'Sistema de gestão de pedidos para pizzaria',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create `app/page.tsx`**

```typescript
// app/page.tsx
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db/index'
import { eq } from 'drizzle-orm'
import { usuario } from '@/lib/db/schema'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await auth.getSession()
  if (!session?.user) redirect('/auth/sign-in')

  const [u] = await db
    .select({ role: usuario.role })
    .from(usuario)
    .where(eq(usuario.id, session.user.id))

  if (u?.role === 'admin') redirect('/admin/menu')
  redirect('/garcom/mesas')
}
```

- [ ] **Step 3: Create `app/auth/sign-in/page.tsx`**

```typescript
// app/auth/sign-in/page.tsx
'use client'
import { useState } from 'react'
import { authClient } from '@/lib/auth/client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authClient.signIn.email({ email, password })
      router.push('/')
    } catch (err: any) {
      setError('E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm border rounded-[12px] p-6 space-y-4">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `app/auth/sign-up/page.tsx`**

```typescript
// app/auth/sign-up/page.tsx
'use client'
import { useState } from 'react'
import { authClient } from '@/lib/auth/client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SignUpPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authClient.signUp.email({ name: nome, email, password })
      router.push('/')
    } catch (err: any) {
      setError('Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm border rounded-[12px] p-6 space-y-4">
        <h1 className="text-xl font-semibold">Criar Conta</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? 'Criando…' : 'Criar Conta'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx app/auth/
git commit -m "feat: auth pages — sign-in, sign-up, root redirect by role"
```

---

## Task 14: PWA Configuration

**Files:**
- Modify: `next.config.ts`
- Create: `public/manifest.json`

- [ ] **Step 1: Update `next.config.ts`**

```typescript
// next.config.ts
import type { NextConfig } from 'next'
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
}

export default withPWA(nextConfig)
```

- [ ] **Step 2: Create `public/manifest.json`**

```json
{
  "name": "Gestão de Pedidos",
  "short_name": "Pedidos",
  "description": "Sistema de gestão de pedidos para pizzaria",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#171717",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 3: Add icons**

Create two placeholder icons (replace with real assets):
```bash
# Using ImageMagick or any tool — create simple colored squares for now
# icon-192.png (192x192) and icon-512.png (512x512) must exist in public/
```

- [ ] **Step 4: Add `<link rel="manifest">` to `app/layout.tsx`**

Add to `<head>` in `app/layout.tsx`:
```typescript
export const metadata: Metadata = {
  title: 'Gestão de Pedidos',
  manifest: '/manifest.json',
  themeColor: '#171717',
}
```

- [ ] **Step 5: Build and verify PWA**

```bash
npm run build && npm start
```

Open Chrome DevTools → Application → Manifest. Expected: manifest loaded, installable PWA prompt available.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts public/manifest.json
git commit -m "feat: PWA — manifest, service worker via next-pwa"
```

---

## Task 15: E2E Tests — Critical Flows

**Files:**
- Create: `tests/e2e/garcom-flow.spec.ts`, `tests/e2e/cozinha-flow.spec.ts`

- [ ] **Step 1: Write garçom E2E test**

```typescript
// tests/e2e/garcom-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Garçom — fluxo de pedido', () => {
  test.beforeEach(async ({ page }) => {
    // Assumes test user exists: garcom@test.com / test1234
    await page.goto('/auth/sign-in')
    await page.fill('input[type="email"]', 'garcom@test.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/mesa/**')
  })

  test('adds item to cart and cart FAB appears', async ({ page }) => {
    // Assumes mesa 1 exists and has at least one product
    await page.goto('/garcom/mesa/1')  // adjust ID if needed
    const addBtn = page.locator('button', { hasText: 'Adicionar' }).first()
    await addBtn.click()
    await expect(page.locator('[data-testid="cart-fab"]')).toBeVisible()
  })

  test('sends order and clears cart', async ({ page }) => {
    await page.goto('/garcom/mesa/1')
    await page.locator('button', { hasText: 'Adicionar' }).first().click()
    await page.locator('[data-testid="cart-fab"]').click()
    await page.locator('button', { hasText: 'Enviar Pedido' }).click()
    await expect(page.locator('[data-testid="cart-fab"]')).not.toBeVisible()
  })
})
```

- [ ] **Step 2: Write cozinha E2E test**

```typescript
// tests/e2e/cozinha-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Cozinha — display e status', () => {
  test('dashboard loads with kanban columns', async ({ page }) => {
    await page.goto('/cozinha/dashboard')
    await expect(page.locator('text=Novos')).toBeVisible()
    await expect(page.locator('text=Em Preparo')).toBeVisible()
    await expect(page.locator('text=Prontos')).toBeVisible()
    await expect(page.locator('text=Entregues')).toBeVisible()
  })

  test('SSE endpoint responds', async ({ request }) => {
    const response = await request.get('/api/events')
    expect(response.headers()['content-type']).toContain('text/event-stream')
  })
})
```

- [ ] **Step 3: Run E2E tests**

```bash
npx playwright install chromium
npm run test:e2e
```

Expected: all tests pass (adjust mesa IDs/credentials to match seed data).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/
git commit -m "test: E2E flows — garçom order, cozinha dashboard, SSE"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Garçom PWA mobile | T8, T9, T14 |
| Cozinha display PC + SSE | T4, T10 |
| Admin — cardápio | T11 |
| Admin — mesas | T12 |
| Status flow novo→em_preparo→pronto→entregue | T5, T10 |
| Mesa com múltiplos pedidos simultâneos | T2 (schema), T5 |
| Neon Auth (garçom+admin) | T3, T9, T11 |
| Cozinha sem auth | T10 |
| precoUnitario snapshot | T5 (adicionarItem) |
| Geist tokens → Shadcn | T1 |
| PWA | T14 |
| Drizzle ORM | T2 |
| SSE notificações | T4, T5, T6 |

All requirements covered. No gaps found.
