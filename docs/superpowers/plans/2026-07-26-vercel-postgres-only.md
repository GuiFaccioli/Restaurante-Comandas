# Vercel PostgreSQL-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the application safe for a Vercel full-stack deployment by replacing in-memory SSE with polling and removing all SQLite runtime support.

**Architecture:** Kitchen, waiter and admin screens fetch tenant-scoped state on a five-second interval instead of receiving process-local SSE notifications. The database layer becomes PostgreSQL/Neon-only, with asynchronous transactions and PostgreSQL migrations as the only schema path.

**Tech Stack:** Next.js 16, React 19, TypeScript, Neon PostgreSQL, Drizzle, Vitest, Playwright.

## Global Constraints

- `DATABASE_URL` must be a PostgreSQL URL in every runtime environment.
- Every polling route derives tenant access from the session, never from client input.
- Preserve tenant-scoped writes and composite PostgreSQL foreign keys.
- Use test-first cycles and one conventional commit per completed work unit.

---

### Task 1: Replace kitchen SSE with authenticated polling

**Files:** `app/cozinha/dashboard/page.tsx`, `components/cozinha/kanban-board.tsx`, `app/api/cozinha/pedidos/route.ts`, `lib/kitchen/queries.ts`, kitchen tests.

- [ ] Write failing tests for the tenant-scoped kitchen query, unauthenticated route rejection, and five-second client refresh.
- [ ] Extract serializable kitchen order loading to `getKitchenOrders({ tenantId })`.
- [ ] Add a no-store route handler that resolves the tenant through `requireAccess('cozinha')`.
- [ ] Replace `SseListener` with visible-tab polling, immediate refresh on visibility return, and optimistic-state reconciliation.
- [ ] Run focused tests, full tests, TypeScript, and build.
- [ ] Commit `feat(kitchen): poll orders every five seconds`.

### Task 2: Replace remaining SSE consumers and delete SSE infrastructure

**Files:** waiter/admin clients, `lib/actions/pedidos.ts`, `lib/sse.ts`, `app/api/events/route.ts`, `components/cozinha/sse-listener.tsx`, SSE tests.

- [ ] Write failing client refresh tests for waiter and admin consumers.
- [ ] Add tenant-authenticated polling to every remaining SSE consumer.
- [ ] Remove notify calls, SSE endpoint/listener/module, and obsolete tests only after consumers no longer import them.
- [ ] Run focused tests, full tests, TypeScript, and build.
- [ ] Commit `refactor(realtime): replace in-memory sse with polling`.

### Task 3: Make database runtime and migrations PostgreSQL-only

**Files:** `lib/db/index.ts`, `lib/db/database-url.ts`, `lib/db/migration-runner.ts`, `drizzle.config.ts`, `lib/db/compat.ts`, database tests.

- [ ] Write failing tests that reject `file:` URLs and assert PostgreSQL-only transaction execution.
- [ ] Remove backend selection, SQLite client construction, build fallback, compatibility helpers, and SQLite migration target.
- [ ] Keep pooled Neon runtime connections and direct PostgreSQL migration support explicit.
- [ ] Run database/unit tests, TypeScript, and build.
- [ ] Commit `refactor(db): require postgresql runtime`.

### Task 4: Remove dual database action paths and SQLite artifacts

**Files:** auth, order, stock and inventory actions/services; SQLite schema/migrations; seed/import scripts; package dependencies; related tests.

- [ ] Write failing tests for PostgreSQL transaction paths and native boolean behavior.
- [ ] Replace dual callbacks and SQLite boolean conversions with PostgreSQL-only operations.
- [ ] Rewrite supported seed behavior for PostgreSQL or remove unsupported SQLite-only scripts.
- [ ] Delete SQLite schemas, migrations, import artifact, dependencies and tests only after PostgreSQL coverage exists.
- [ ] Run full tests, TypeScript, build, and `rg` verification for runtime SQLite references.
- [ ] Commit `refactor(db): remove sqlite compatibility`.

### Task 5: Finalize Vercel readiness

**Files:** `package.json`, lockfile, `.env.example`, README/wiki deployment docs, deployment tests.

- [ ] Upgrade vulnerable production dependencies and verify the audit is clean or documented.
- [ ] Add a secret-free environment template listing `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN`.
- [ ] Document pooled runtime URL, direct migration URL, Preview/Production variables, and Vercel Blob setup.
- [ ] Pin supported Node runtime, validate build with PostgreSQL configuration, and run full verification.
- [ ] Commit `chore(deploy): prepare vercel production runtime`.
