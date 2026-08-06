# Multi-Tenant Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the confirmed cross-tenant, transactional, ordering, payment, migration, and dead-code failures without rewriting the application.

**Architecture:** Keep tenant identity derived from the authenticated session and enforce it at every database boundary. Consolidate stock mutations behind transactional services, make business retries idempotent, and use reproducible PostgreSQL/SQLite migrations plus real two-tenant integration tests. Execute each work unit with a RED-GREEN-review loop before advancing.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, Neon PostgreSQL, better-sqlite3, Vitest, Playwright, Zustand.

## Global Constraints

- Preserve all unrelated local changes already present in the working tree.
- Never trust a tenant identifier received from the frontend.
- Do not change public contracts without updating every consumer in the same work unit.
- Every production behavior change starts with a failing regression test.
- Do not create commits or push unless the user explicitly requests it.
- Do not add suppliers, warehouses, lots, expiration dates, modifiers, or unrelated UI work.

---

### Task 1: Secure account and active membership boundaries

**Files:**
- Modify: `lib/actions/auth.ts`
- Modify: `lib/auth/access.ts`
- Test: `tests/unit/auth/actions.test.ts`
- Test: `tests/unit/auth/access.test.ts`

**Interfaces:**
- Produces: public signup rejects an existing identity; access guards only accept active memberships in active tenants.

- [ ] Write tests proving an existing email creates no tenant/session and inactive tenant or membership grants no access.
- [ ] Run `npm.cmd test -- tests/unit/auth/actions.test.ts tests/unit/auth/access.test.ts --maxWorkers=1` and confirm the expected RED failures.
- [ ] Add tenant and membership status predicates to signup, login, tenant selection, membership listing, and access guards.
- [ ] Re-run the targeted tests and `npx.cmd tsc --noEmit`.
- [ ] Review only the four-file diff for authorization regressions.

### Task 2: Isolate realtime events and foreign relations by tenant

**Files:**
- Modify: `lib/sse.ts`
- Modify: `app/api/events/route.ts`
- Modify: `lib/actions/pedidos.ts`
- Modify: `lib/actions/produtos.ts`
- Modify: `lib/actions/mesas.ts`
- Test: `tests/unit/sse.test.ts`
- Test: `tests/unit/actions/pedidos.test.ts`
- Test: `tests/unit/actions/produtos.test.ts`

**Interfaces:**
- Produces: `addClient(tenantId, controller)`, `removeClient(tenantId, controller)`, and `notifyKitchen(tenantId, event)`; tenant-scoped relation assertions.

- [ ] Write tests proving events from tenant A never reach tenant B and cross-tenant mesa/category IDs are rejected.
- [ ] Run the targeted tests and confirm RED.
- [ ] Replace the global SSE set with tenant-keyed channels and pass the authenticated tenant through every publisher.
- [ ] Validate mesa, category, product, item de estoque, and order relations against the authenticated tenant before writes.
- [ ] Run targeted tests and `npx.cmd tsc --noEmit`, then review all publisher call sites with `rg -n "notifyKitchen|addClient|removeClient"`.

### Task 3: Use a transaction-capable PostgreSQL driver

**Files:**
- Modify: `lib/db/index.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tests/unit/db/schema.test.ts`
- Create: `tests/unit/db/driver.test.ts`

**Interfaces:**
- Produces: the existing `db` export backed by SQLite locally and `drizzle-orm/neon-serverless` with a Neon `Pool` for PostgreSQL.

- [ ] Write a driver-selection test that fails while PostgreSQL resolves to `neon-http`.
- [ ] Run the test and confirm RED.
- [ ] Configure Neon WebSocket support for Node and use the transaction-capable Drizzle adapter.
- [ ] Verify URL detection accepts both `postgresql://` and `postgres://`.
- [ ] Run driver tests, `npx.cmd tsc --noEmit`, and `npm.cmd run build`.

### Task 4: Make order consumption transactional and idempotent

**Files:**
- Modify: `lib/stock/service.ts`
- Modify: `lib/stock/availability.ts`
- Create: `lib/stock/order-consumption.ts`
- Modify: `lib/actions/pedidos.ts`
- Modify: `lib/actions/estoque.ts`
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/schema-sqlite.ts`
- Test: `tests/unit/actions/pedidos.test.ts`
- Test: `tests/unit/actions/estoque.test.ts`
- Create: `tests/unit/stock/order-consumption.test.ts`

**Interfaces:**
- Produces: one transaction that validates an allowed status transition, aggregates demand by item de estoque, creates uniquely keyed movements, updates balances, and advances the order.

- [ ] Write tests for create-without-consumption, kitchen consumption, shared-ingredient aggregation, insufficient-stock rollback, retry idempotency, delivery without second deduction, and eligible cancellation reversal.
- [ ] Run the targeted tests and confirm RED.
- [ ] Move non-action stock internals out of `'use server'` modules and make the stock service accept the active transaction.
- [ ] Add database-backed idempotency keys scoped by tenant and references from reversals to original consumption.
- [ ] Integrate the official order transition with the service; never update stock or order status outside the same transaction.
- [ ] Run targeted tests and typecheck, then review transaction boundaries and every direct `currentStock` update.

### Task 5: Scope carts to tables and make payments exact and idempotent

**Files:**
- Modify: `lib/store/cart.ts`
- Modify: `app/garcom/mesa/[id]/client.tsx`
- Modify: `lib/actions/pedidos.ts`
- Modify: `app/admin/pedidos/client.tsx`
- Test: `tests/unit/store/cart.test.ts`
- Test: `tests/unit/business/waiter-cart-actions.test.ts`
- Test: `tests/unit/actions/pedidos.test.ts`

**Interfaces:**
- Produces: carts keyed/reset by `mesaId`; payment registration rejects underpayment, overpayment, duplicates, and stale order amounts.

- [ ] Write tests proving a cart cannot migrate between tables and a payment only closes the exact outstanding total once.
- [ ] Run targeted tests and confirm RED.
- [ ] Anchor cart state to the current table and clear stale state on table changes.
- [ ] Validate payment total and idempotency inside a transaction derived from the tenant-scoped order.
- [ ] Reset modal amount whenever the selected order changes.
- [ ] Run targeted tests, typecheck, and review mobile/UI error feedback.

### Task 6: Add reproducible PostgreSQL and SQLite baselines

**Files:**
- Create: `db/migrations/000000000000_baseline.sql`
- Create: `scripts/migrate.ts`
- Modify: `lib/db/sqlite-migrations.ts`
- Modify: `db/schema.sql`
- Modify: `drizzle.config.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tests/unit/db/sqlite-migrations.test.ts`
- Create: `tests/integration/db-baseline.test.ts`

**Interfaces:**
- Produces: `npm.cmd run db:migrate`; blank and existing databases converge without deleting history.

- [ ] Write tests that bootstrap a blank SQLite database and re-run migrations idempotently.
- [ ] Add a PostgreSQL baseline verification that parses/applies every migration in order when a test URL is available.
- [ ] Run tests and confirm RED for the current blank-database path.
- [ ] Create an idempotent baseline before incremental migrations; add tenant-scoped uniqueness for table numbers and movement keys.
- [ ] Make SQLite create base tables before checking/altering columns and preserve existing rows.
- [ ] Verify `postgres://` and `postgresql://` configuration, run migration tests twice, and inspect schema parity.

### Task 7: Add real two-tenant integration coverage

**Files:**
- Create: `tests/integration/helpers/database.ts`
- Create: `tests/integration/multitenant.test.ts`
- Create: `tests/integration/order-stock.test.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- Produces: isolated temporary SQLite databases with two real tenants, users, memberships, and records; no mocked ORM for critical boundaries.

- [ ] Create a temporary-database harness that runs the real baseline and disposes its file after each suite.
- [ ] Write tests for cross-tenant IDs, inactive memberships, SSE fan-out, movement history, payment, and order/stock rollback.
- [ ] Confirm each test fails against a deliberately missing guard or the pre-fix baseline before accepting GREEN.
- [ ] Run integration suites serially and assert both tenants' rows after every rejected operation.
- [ ] Run the full unit suite after integration tests.

### Task 8: Remove dead code and dependencies

**Files:**
- Delete only after import-graph proof: `components/ui/card.tsx`
- Delete only after import-graph proof: `components/ui/form.tsx`
- Delete only after import-graph proof: `components/ui/select.tsx`
- Modify: `lib/actions/estoque.ts`
- Modify: `lib/actions/produtos.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: affected source-contract tests under `tests/unit/business/`

**Interfaces:**
- Produces: no unused runtime exports, event names, components, or dependencies.

- [ ] Use `rg` and the App Router entry graph to prove each candidate has no consumer.
- [ ] Remove one dead work unit at a time and run its nearest tests.
- [ ] Remove dependencies only when no runtime, test, script, or config imports them.
- [ ] Run `npm.cmd install --package-lock-only`, typecheck, and build after dependency cleanup.

### Task 9: Final adversarial review and verification

**Files:**
- Review: all changed files

**Interfaces:**
- Produces: evidence-backed final status without committing or pushing.

- [ ] Run a fresh security review focused on tenant derivation, authorization, SSE, transactionality, idempotency, and concurrent balance updates.
- [ ] Fix every critical or important finding with another RED-GREEN loop.
- [ ] Run `npx.cmd tsc --noEmit`.
- [ ] Run `npm.cmd test -- --maxWorkers=1`.
- [ ] Run `npm.cmd run build`.
- [ ] Run `git diff --check`, `git diff --stat`, and inspect `git diff`.
- [ ] Confirm no credentials, debug logs, disabled tests, temporary databases, or unrelated reversions were introduced.

## Self-Review

- Every confirmed audit item maps to at least one task.
- Transaction-capable PostgreSQL is completed before order/stock atomicity.
- Tenant protections are enforced in session, application, events, and constraints.
- Tests stay with each behavior work unit and real two-tenant coverage is not replaced by source-string assertions.
- No automatic commit or push is included.
