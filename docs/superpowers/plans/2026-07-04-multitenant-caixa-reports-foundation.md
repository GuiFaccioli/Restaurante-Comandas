# Multi-Tenant Caixa Reports Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the multi-tenant foundation, clean legacy dependencies, add caixa v1, improve tenant-scoped reports, and update documentation.

**Architecture:** Use shared-database multi-tenancy on Neon Postgres with Drizzle schemas mirrored for SQLite local/test compatibility. First-party auth owns identity and sessions; tenant membership and selected tenant drive every authorization and data query. Caixa records external payments and reports read only selected-tenant data.

**Tech Stack:** Next.js 16 App Router, Server Actions, Drizzle ORM, Neon Postgres, SQLite local compatibility, Vitest, React 19.

## Global Constraints

- Keep Neon Postgres and `@neondatabase/serverless`.
- Remove only legacy Neon Auth, not Neon DB.
- One `usuario` may belong to multiple tenants.
- Store selected tenant in `authSession.selectedTenantId`.
- Never trust tenant IDs from the browser.
- Every operational query must be scoped by selected tenant.
- Caixa records external payment only; no gateway processing.
- Use TDD: failing focused test first, then implementation.
- Use conventional commits only, with no AI attribution.
- UI copy remains Portuguese.

---

## File Map

- `lib/db/schema.ts` — PostgreSQL tenant, membership, session, operational, and caixa schema.
- `lib/db/schema-sqlite.ts` — SQLite mirror for local tests/dev.
- `db/schema.sql` — SQL reference schema.
- `prisma/schema.prisma` — remove or mark superseded if Prisma tooling is removed.
- `lib/auth/session.ts` — selected tenant session persistence.
- `lib/auth/access.ts` — tenant-aware access guard.
- `lib/actions/auth.ts` — tenant-aware sign-up, sign-in, sign-out, tenant selection.
- `app/selecionar-empresa/page.tsx` — tenant picker.
- `lib/actions/mesas.ts` — tenant-scoped table mutations.
- `lib/actions/produtos.ts` — tenant-scoped product/category mutations.
- `lib/actions/pedidos.ts` — tenant-scoped orders, delivery, and caixa registration.
- `app/admin/relatorios/page.tsx` — tenant-scoped reports.
- `app/admin/pedidos/page.tsx` and `app/admin/pedidos/client.tsx` — caixa/closing UI integration.
- `package.json` and `package-lock.json` — dependency cleanup.
- `next.config.ts` and `public/sw.js` — PWA cleanup if `next-pwa` is removed.
- `wiki/**`, `README.md`, `CLAUDE.md`, `.metadata/**` — documentation updates.

---

### Task 1: Tenant schema and session context

**Files:**
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/schema-sqlite.ts`
- Modify: `db/schema.sql`
- Modify: `tests/unit/db/schema.test.ts`
- Modify/Create: `tests/unit/auth/session.test.ts`

**Interfaces:**
- Produces: `tenant`
- Produces: `tenantUser`
- Produces: `usuarioAcesso.tenantUserId`
- Produces: `authSession.selectedTenantId`
- Produces: tenant-scoped columns for `mesa`, `categoria`, `produto`, and `pedido`

- [ ] Write failing tests proving schema exports `tenant`, `tenantUser`, `authSession.selectedTenantId`, and tenant columns on operational tables.
- [ ] Run `npm test -- tests/unit/db/schema.test.ts tests/unit/auth/session.test.ts` and confirm RED.
- [ ] Add the Drizzle PostgreSQL schema changes.
- [ ] Mirror the schema changes in SQLite.
- [ ] Update `db/schema.sql` with the same table/column intent.
- [ ] Run the focused tests and confirm GREEN.
- [ ] Commit `feat: add tenant schema foundation`.

### Task 2: Tenant-aware auth and access

**Files:**
- Modify: `lib/auth/session.ts`
- Modify: `lib/auth/access.ts`
- Modify: `lib/actions/auth.ts`
- Create: `app/selecionar-empresa/page.tsx`
- Modify: `app/selecionar-area/page.tsx`
- Modify: `tests/unit/auth/actions.test.ts`
- Modify: `tests/unit/auth/access.test.ts`

**Interfaces:**
- Produces: `setSelectedTenant(tenantId: string): Promise<void>`
- Produces: `getCurrentTenant(): Promise<{ id: string; nome: string } | null>`
- Produces: `listCurrentTenantMemberships(): Promise<Array<{ tenantId: string; nome: string }>>`
- Updates: `requireAccess(access)` to return `{ usuarioId: string; tenantId: string; access: AcessoUsuario }`

- [ ] Write failing tests for sign-up creating owner tenant, single-tenant login selecting automatically, multi-tenant login redirecting to `/selecionar-empresa`, and permission isolation by tenant.
- [ ] Run `npm test -- tests/unit/auth/actions.test.ts tests/unit/auth/access.test.ts` and confirm RED.
- [ ] Implement selected-tenant session helpers.
- [ ] Update sign-up/sign-in to create and select tenant correctly.
- [ ] Implement tenant selection action/page.
- [ ] Update `requireAccess` and area redirects to require selected tenant.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit `feat: make auth tenant aware`.

### Task 3: Tenant-scope operational actions and reads

**Files:**
- Modify: `lib/actions/mesas.ts`
- Modify: `lib/actions/produtos.ts`
- Modify: `lib/actions/pedidos.ts`
- Modify: `app/garcom/mesas/page.tsx`
- Modify: `app/garcom/mesa/[id]/page.tsx`
- Modify: `app/mesa/[id]/page.tsx`
- Modify: `app/cozinha/dashboard/page.tsx`
- Modify: `app/api/events/route.ts`
- Modify: `tests/unit/actions/mesas.test.ts` if present or create `tests/unit/actions/tenant-scope.test.ts`
- Modify: `tests/unit/actions/produtos.test.ts`
- Modify: `tests/unit/actions/pedidos.test.ts`

**Interfaces:**
- Consumes: `requireAccess(access)` returning `tenantId`
- Produces: all table/product/order reads and mutations scoped by selected tenant

- [ ] Write failing tests proving actions include selected tenant in inserts, filters, updates, and report-visible reads.
- [ ] Run focused action tests and confirm RED.
- [ ] Update action queries to use `tenantId` from `requireAccess`.
- [ ] Update page-level reads to use selected tenant context.
- [ ] Update SSE event stream to emit only selected-tenant data.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit `feat: scope operations by tenant`.

### Task 4: Caixa v1 external payment registration

**Files:**
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/schema-sqlite.ts`
- Modify: `db/schema.sql`
- Modify: `lib/actions/pedidos.ts`
- Modify: `app/admin/pedidos/page.tsx`
- Modify: `app/admin/pedidos/client.tsx`
- Create: `tests/unit/actions/caixa.test.ts`

**Interfaces:**
- Produces: `pagamentoPedido`
- Produces: `registrarPagamentoPedido(input: { pedidoId: string; formaPagamento: FormaPagamento; valor: string; observacao?: string }): Promise<void>`
- Requires: `caixa` access

- [ ] Write failing tests proving only `caixa` can register payment, paid order belongs to selected tenant, payment value must be positive, and cross-tenant pedido payment is rejected.
- [ ] Run `npm test -- tests/unit/actions/caixa.test.ts` and confirm RED.
- [ ] Add payment enums/tables to both schemas.
- [ ] Implement the external payment registration action.
- [ ] Add a simple admin pedidos UI path to record payment for delivered orders.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit `feat: add external payment caixa records`.

### Task 5: Tenant-scoped management reports

**Files:**
- Modify: `app/admin/relatorios/page.tsx`
- Create/Modify: `tests/unit/business/admin-management.test.ts`
- Create/Modify: `tests/unit/business/reports.test.ts`

**Interfaces:**
- Consumes: tenant-scoped orders, items, products, categories, and payment records
- Produces: sales by period, average delivery time, slowest orders, product/category mix, and revenue by payment method

- [ ] Write failing tests proving reports exclude other tenants and calculate delivery/payment metrics from selected tenant only.
- [ ] Run focused report tests and confirm RED.
- [ ] Update report queries to filter by selected tenant.
- [ ] Add visible metrics for delivery time, slowest orders, product/category mix, and payment method totals.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit `feat: add tenant scoped management reports`.

### Task 6: Dependency cleanup without losing Neon DB

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `next.config.ts`
- Modify/Delete: `lib/auth/client.ts`
- Modify/Delete: `lib/auth/server.ts`
- Modify/Delete: `app/api/auth/[...path]/route.ts`
- Modify/Delete: `prisma.config.ts`
- Modify/Delete: `prisma/schema.prisma`
- Modify/Delete: `public/sw.js` and `public/workbox-4754cb34.js` if `next-pwa` is removed
- Modify: `tests/unit/auth/api-route.test.ts`
- Modify: `tests/unit/build-script.test.ts`

**Interfaces:**
- Keeps: `@neondatabase/serverless`
- Removes when confirmed unused: `@neondatabase/auth`, `@prisma/client`, `prisma`, `next-pwa`

- [ ] Write failing source/dependency tests proving Neon DB remains, Neon Auth legacy imports are gone, Prisma scripts are gone when Prisma tooling is removed, and build config does not require `next-pwa`.
- [ ] Run focused tests and confirm RED.
- [ ] Remove unused packages and lockfile entries with `npm uninstall`/`npm install`.
- [ ] Remove or neutralize dead Neon Auth, Prisma, and PWA files.
- [ ] Run `npm audit --json` and confirm the removed chains are gone or materially reduced.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit `chore: remove legacy vulnerable tooling`.

### Task 7: Documentation and final verification

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `wiki/index.md`
- Modify: `wiki/entities/neon.md`
- Modify: `wiki/concepts/neon-auth.md`
- Modify: `wiki/meta/changelog.md`
- Modify: `.metadata/**` for touched directories

**Interfaces:**
- Produces: docs that identify the active stack as Next.js + Neon Postgres + Drizzle + first-party auth + SSE
- Produces: docs that mark Neon Auth and Prisma as legacy/superseded if removed

- [ ] Fix mojibake in touched wiki files.
- [ ] Update stack docs and changelog.
- [ ] Update `.metadata` for touched directories.
- [ ] Run `npm test -- --maxWorkers=1`.
- [ ] Run `npm run build`.
- [ ] Run `npm audit --json`.
- [ ] Fix failures with focused TDD loops.
- [ ] Commit `docs: document multi tenant foundation`.
- [ ] Push the finished branch/main after all checks pass.
