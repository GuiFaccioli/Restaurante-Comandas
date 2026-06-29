# Real Auth and Permission Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build first-party registration/login/session handling and enforce explicit permissions on pages, Route Handlers, and Server Actions.

**Architecture:** Use database-backed auth sessions with an opaque httpOnly cookie and a central `requireAccess(access)` guard. Keep the product rule simple: one e-mail is one person in one company, with multiple area permissions allowed inside that company. Treat Server Actions as API surfaces and protect them with the same guard as pages and Route Handlers.

**Tech Stack:** Next.js 16 App Router, Server Actions, Drizzle ORM, PostgreSQL/SQLite local compatibility, Vitest, React 19.

## Global Constraints

- One e-mail = one person = one company.
- No company selection flow.
- Multiple area permissions go through `/selecionar-area`.
- Admin does not automatically grant caixa/cozinha/garcom.
- `/cozinha/dashboard` and `/api/events` require `cozinha`.
- Server Actions must enforce permissions.
- No in-app payment processing or payment-provider integration.
- UI copy remains Portuguese.

---

## File Map

- `lib/db/schema.ts` — PostgreSQL auth/access/session schema.
- `lib/db/schema-sqlite.ts` — SQLite auth/access/session schema for local tests/dev if still used.
- `lib/auth/password.ts` — password hashing and verification.
- `lib/auth/session.ts` — session cookie, token hashing, session lookup, logout.
- `lib/auth/access.ts` — `requireAccess`, `getCurrentAccesses`, area redirect helpers.
- `lib/actions/auth.ts` — sign-up, sign-in, sign-out actions.
- `app/auth/sign-in/page.tsx` — first-party login form.
- `app/auth/sign-up/page.tsx` — first-party registration form.
- `app/selecionar-area/page.tsx` — area chooser for users with multiple accesses.
- `app/admin/layout.tsx` — admin setup guard.
- `app/admin/pedidos/page.tsx` — caixa guard.
- `app/cozinha/layout.tsx` — cozinha guard.
- `app/garcom/layout.tsx` — garcom guard.
- `app/api/events/route.ts` — cozinha guard for SSE.
- `lib/actions/pedidos.ts` — garcom/cozinha action guards.
- `lib/actions/produtos.ts` — admin action guard.
- `lib/actions/mesas.ts` — admin action guard.
- `tests/unit/auth/password.test.ts` — password tests.
- `tests/unit/auth/access.test.ts` — access guard tests.
- `tests/unit/auth/actions.test.ts` — auth action tests.
- `tests/unit/business/permission-boundary.test.ts` — source-level permission boundary tests.

---

### Task 1: Schema and password primitives

**Files:**
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/schema-sqlite.ts`
- Create: `lib/auth/password.ts`
- Modify: `tests/unit/db/schema.test.ts`
- Create: `tests/unit/auth/password.test.ts`

**Interfaces:**
- Produces: `AcessoUsuario = 'admin' | 'caixa' | 'cozinha' | 'garcom'`
- Produces: `usuario.passwordHash`, timestamps, `usuarioAcesso`, `authSession`
- Produces: `hashPassword(password: string): Promise<string>`
- Produces: `verifyPassword(password: string, stored: string | null | undefined): Promise<boolean>`
- Produces: `assertValidEmail(email: string): string`

- [ ] Write failing schema tests for `usuario.passwordHash`, `usuarioAcesso`, and `authSession`.
- [ ] Write failing password tests proving stored hash is not plaintext and verification works.
- [ ] Run `npm test -- tests/unit/db/schema.test.ts tests/unit/auth/password.test.ts` and confirm RED.
- [ ] Add schema fields/tables/enums in both schema files.
- [ ] Implement `lib/auth/password.ts` using Node `crypto.scrypt` with random salt.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit `feat: add auth schema and password primitives`.

### Task 2: Session and access guard

**Files:**
- Create: `lib/auth/session.ts`
- Create: `lib/auth/access.ts`
- Create: `tests/unit/auth/access.test.ts`

**Interfaces:**
- Consumes: `authSession`, `usuario`, `usuarioAcesso`, `AcessoUsuario`
- Produces: `createAuthSession(usuarioId: string): Promise<void>`
- Produces: `getCurrentSession(): Promise<{ usuarioId: string; email: string; nome: string } | null>`
- Produces: `destroyCurrentSession(): Promise<void>`
- Produces: `getCurrentAccesses(): Promise<AcessoUsuario[]>`
- Produces: `requireAccess(access: AcessoUsuario): Promise<{ usuarioId: string; access: AcessoUsuario }>`
- Produces: `redirectForAccesses(accesses: AcessoUsuario[]): string`

- [ ] Write failing tests for no session, matching permission, missing permission, and redirect selection.
- [ ] Run `npm test -- tests/unit/auth/access.test.ts` and confirm RED.
- [ ] Implement session cookie helpers and DB-backed session lookup.
- [ ] Implement `requireAccess` and `redirectForAccesses`.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit `feat: add session and access guard`.

### Task 3: Sign-up, sign-in, sign-out, and area selection

**Files:**
- Create: `lib/actions/auth.ts`
- Modify: `app/auth/sign-in/page.tsx`
- Modify: `app/auth/sign-up/page.tsx`
- Create: `app/selecionar-area/page.tsx`
- Modify: `app/page.tsx`
- Create: `tests/unit/auth/actions.test.ts`

**Interfaces:**
- Consumes: password/session/access helpers
- Produces: `signUpOwner(data: FormData | { nome: string; email: string; password: string }): Promise<void>`
- Produces: `signIn(data: FormData | { email: string; password: string }): Promise<void>`
- Produces: `signOut(): Promise<void>`

- [ ] Write failing tests: duplicate email rejected, password hashed, invalid login rejected, valid login creates session.
- [ ] Run `npm test -- tests/unit/auth/actions.test.ts` and confirm RED.
- [ ] Implement auth Server Actions.
- [ ] Update sign-in/sign-up pages to call Server Actions instead of Neon Auth client.
- [ ] Add `/selecionar-area` page using current accesses.
- [ ] Update root redirect to use session/access helpers.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit `feat: add first-party auth flow`.

### Task 4: Protect pages, Route Handlers, and Server Actions

**Files:**
- Modify: `app/admin/layout.tsx`
- Modify: `app/admin/pedidos/page.tsx`
- Modify: `app/cozinha/layout.tsx`
- Modify: `app/garcom/layout.tsx`
- Modify: `app/api/events/route.ts`
- Modify: `lib/actions/pedidos.ts`
- Modify: `lib/actions/produtos.ts`
- Modify: `lib/actions/mesas.ts`
- Create: `tests/unit/business/permission-boundary.test.ts`

**Interfaces:**
- Consumes: `requireAccess(access)`
- Produces: route/action permission enforcement.

- [ ] Write failing source-level tests asserting required guards appear in each page/route/action surface.
- [ ] Run `npm test -- tests/unit/business/permission-boundary.test.ts` and confirm RED.
- [ ] Replace legacy `auth.getSession()` page/action checks with `requireAccess`.
- [ ] Add `requireAccess('cozinha')` to `/api/events` before opening SSE.
- [ ] Run permission boundary tests and confirm GREEN.
- [ ] Commit `feat: enforce permission gates across routes and actions`.

### Task 5: Full verification and wiki ingest

**Files:**
- Modify: `wiki/index.md`
- Create: `wiki/concepts/permission-gates.md`
- Modify: `wiki/meta/changelog.md`

**Interfaces:**
- Produces: updated project knowledge for `/ingest` request.

- [ ] Update wiki to document first-party auth, one user/one company, area permissions, and API/action guards.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Fix any failures with TDD.
- [ ] Commit `docs: ingest auth permission model`.
