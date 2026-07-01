# Waiter Delivery Confirmation Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change operations so kitchen only views open comandas and waiters confirm delivery, recording delivery time for reports.

**Architecture:** Keep the existing persisted `pedido` aggregate as the source of truth. Treat `status = 'novo'` as the single open operational state, update to `status = 'entregue'` only from the waiter confirmation action, and use SSE to remove delivered orders from live kitchen/waiter queues. Share item grouping and elapsed timer formatting between kitchen and waiter UI.

**Tech Stack:** Next.js App Router, React Client Components, Drizzle ORM schemas for PostgreSQL and SQLite, Vitest unit/source tests, existing SSE helper.

## Global Constraints

- Kitchen does not mutate order status.
- Kitchen shows only `pedido.status = 'novo'`.
- Waiter starts at `/garcom/pedidos`.
- Waiter sees all pending deliveries, not only their own.
- Waiter confirms delivery with `confirmarEntrega(pedidoId)`.
- Delivery confirmation sets `status = 'entregue'`, `entregueEm = new Date()`, and `atualizadoEm = new Date()`.
- Timer starts at `criadoEm`.
- Timer format is `< 1h` as `MM:SS` and `>= 1h` as `HH:MM:SS`.
- No time-based warning or alert styling.
- Existing status enum values may remain for backward compatibility.

---

## File Structure

- Modify `lib/db/schema.ts` and `lib/db/schema-sqlite.ts`: add nullable `pedido.entregueEm`.
- Modify `lib/actions/pedidos.ts`: insert `entregueEm: null` on new orders and add `confirmarEntrega`.
- Create `lib/time/elapsed.ts`: deterministic elapsed duration formatter.
- Create `components/live-elapsed-timer.tsx`: small client timer used by kitchen and waiter.
- Modify `components/cozinha/pedido-card.tsx`: remove kitchen mutation button and use shared timer.
- Modify `components/cozinha/kanban-board.tsx`: convert multi-column kanban into single open-order board while keeping export name for minimal route churn.
- Modify `app/cozinha/dashboard/page.tsx`: fetch only `status = 'novo'`.
- Modify `app/garcom/pedidos/page.tsx`: server-render pending delivery queue for waiters.
- Create `components/garcom/pending-deliveries-client.tsx`: waiter delivery queue with SSE removal and `Confirmar entrega`.
- Modify `lib/auth/access.ts`: redirect single-access waiter to `/garcom/pedidos`.
- Modify tests under `tests/unit`: add coverage before production changes.

---

### Task 1: Delivery Timestamp Schema

**Files:**
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/schema-sqlite.ts`
- Modify: `tests/unit/db/schema.test.ts`

**Interfaces:**
- Produces: `pedido.entregueEm` in both schema modules.
- Consumes: Drizzle timestamp columns already used by `criadoEm` and `atualizadoEm`.

- [ ] **Step 1: Write the failing test**

Add assertions in `tests/unit/db/schema.test.ts` that both schema files contain `entregueEm` mapped to `entregue_em`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/unit/db/schema.test.ts --maxWorkers=1`
Expected: FAIL because `entregueEm` is missing.

- [ ] **Step 3: Write minimal implementation**

Add `entregueEm: timestamp('entregue_em', { withTimezone: true })` to the PostgreSQL schema and `entregueEm: integer('entregue_em', { mode: 'timestamp' })` to the SQLite schema.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/unit/db/schema.test.ts --maxWorkers=1`
Expected: PASS.

---

### Task 2: Elapsed Timer Formatter

**Files:**
- Create: `lib/time/elapsed.ts`
- Create: `tests/unit/time/elapsed.test.ts`

**Interfaces:**
- Produces: `formatElapsedDuration(start: Date | string | number, now?: Date | string | number): string`.
- Consumes: valid dates from persisted `pedido.criadoEm`.

- [ ] **Step 1: Write the failing test**

Create tests for `00:00`, `01:05`, `59:59`, `01:00:00`, and future timestamps clamped to `00:00`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/unit/time/elapsed.test.ts --maxWorkers=1`
Expected: FAIL because module does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement a pure formatter that floors elapsed seconds and pads units to two digits.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/unit/time/elapsed.test.ts --maxWorkers=1`
Expected: PASS.

---

### Task 3: Waiter Delivery Backend Action

**Files:**
- Modify: `lib/actions/pedidos.ts`
- Modify: `tests/unit/actions/pedidos.test.ts`

**Interfaces:**
- Produces: `confirmarEntrega(pedidoId: string): Promise<void>`.
- Consumes: `pedido.entregueEm` from Task 1 and existing `notifyKitchen`.

- [ ] **Step 1: Write failing tests**

Add tests that `confirmarPedido` inserts `entregueEm: null`, `confirmarEntrega` requires waiter access, rejects a non-`novo` order, updates `status`, `entregueEm`, and `atualizadoEm`, and emits `status_atualizado` with `entregue`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- tests/unit/actions/pedidos.test.ts --maxWorkers=1`
Expected: FAIL because `entregueEm` and `confirmarEntrega` are missing.

- [ ] **Step 3: Write minimal implementation**

Update `pedidoValues` with `entregueEm: null`, export `confirmarEntrega`, require `garcom`, load current status, reject missing or non-`novo`, update to delivered, and notify SSE.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test -- tests/unit/actions/pedidos.test.ts --maxWorkers=1`
Expected: PASS.

---

### Task 4: Kitchen Visual-Only Board

**Files:**
- Modify: `components/cozinha/pedido-card.tsx`
- Modify: `components/cozinha/kanban-board.tsx`
- Modify: `app/cozinha/dashboard/page.tsx`
- Modify: `tests/unit/business/order-flow.test.ts`

**Interfaces:**
- Consumes: `formatElapsedDuration` through `LiveElapsedTimer`.
- Produces: kitchen UI with no status mutation action.

- [ ] **Step 1: Write failing source tests**

Assert the kitchen page filters `eq(pedido.status, 'novo')`, the kitchen card does not import or call `atualizarStatus`, and the board removes delivered orders on `status_atualizado`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- tests/unit/business/order-flow.test.ts --maxWorkers=1`
Expected: FAIL because current code still has kanban statuses and kitchen mutation.

- [ ] **Step 3: Write minimal implementation**

Remove `atualizarStatus`, status buttons, and kanban columns. Render a single responsive list of open comandas and remove an order when SSE reports `status = 'entregue'`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test -- tests/unit/business/order-flow.test.ts --maxWorkers=1`
Expected: PASS.

---

### Task 5: Waiter Pending Delivery Queue

**Files:**
- Modify: `app/garcom/pedidos/page.tsx`
- Create: `components/garcom/pending-deliveries-client.tsx`
- Modify: `lib/auth/access.ts`
- Modify: `tests/unit/auth/access.test.ts`
- Modify: `tests/unit/business/order-flow.test.ts`

**Interfaces:**
- Consumes: `confirmarEntrega(pedidoId)`, `SseListener`, `KitchenEvent`, grouped kitchen items, and `LiveElapsedTimer`.
- Produces: waiter first screen at `/garcom/pedidos` showing all `novo` orders.

- [ ] **Step 1: Write failing tests**

Assert waiter redirect destination is `/garcom/pedidos`, the waiter pedidos page calls `requireAccess('garcom')`, reads persisted `pedido`, filters `status = 'novo'`, and the client calls `confirmarEntrega`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- tests/unit/auth/access.test.ts tests/unit/business/order-flow.test.ts --maxWorkers=1`
Expected: FAIL because waiter still redirects to `/garcom/mesas` and page redirects immediately.

- [ ] **Step 3: Write minimal implementation**

Build the server page query, add the client queue component, wire `Confirmar entrega`, keep a visible link to `/garcom/mesas`, and handle SSE add/remove.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test -- tests/unit/auth/access.test.ts tests/unit/business/order-flow.test.ts --maxWorkers=1`
Expected: PASS.

---

### Task 6: Full Verification

**Files:**
- All files modified by prior tasks.

**Interfaces:**
- Consumes: completed Tasks 1-5.
- Produces: verified branch ready for commit.

- [ ] **Step 1: Run full unit suite**

Run: `npm.cmd test -- --maxWorkers=1`
Expected: all Vitest tests pass.

- [ ] **Step 2: Run production build**

Run: `npm.cmd run build`
Expected: build exits with code 0.

- [ ] **Step 3: Review diff**

Run: `git diff --stat` and `git diff --check`
Expected: no whitespace errors and diff matches the spec.

- [ ] **Step 4: Commit**

Run: `git add ...` and `git commit -m "feat: add waiter delivery confirmation flow"`
Expected: one conventional commit with no AI attribution.

