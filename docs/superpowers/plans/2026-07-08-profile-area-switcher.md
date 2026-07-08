# Profile Area Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move multi-access area switching into the profile menu and remove standalone "Trocar área" links from protected layouts.

**Architecture:** Centralize access labels and destinations in `lib/auth/access.ts`, then let the server `ProfileMenu` fetch the user's accesses and render a contextual switcher. Layouts declare their current access via `currentAccess`, avoiding pathname parsing.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Vitest source-level tests.

## Global Constraints

- Area switching appears only inside `ProfileMenu`.
- The current area is marked as active and is not clickable.
- Other allowed areas link to their destination screens.
- Users with one access do not see an access switcher.
- Standalone "Trocar área" links must be removed from protected layouts.
- Keep changes in small TDD loops with tests and commits.

---

### Task 1: Centralize access metadata

**Files:**
- Modify: `lib/auth/access.ts`
- Modify: `app/selecionar-area/page.tsx`
- Test: `tests/unit/auth/access.test.ts`

**Interfaces:**
- Produces: `ACCESS_LABEL: Record<AcessoUsuario, string>`
- Produces: `ACCESS_DESCRIPTION: Record<AcessoUsuario, string>`
- Produces: `ACCESS_DESTINATION: Record<AcessoUsuario, string>`
- Consumes: existing `redirectForAccesses(accesses: AcessoUsuario[]): string`

- [ ] **Step 1: Write the failing test**

Add assertions to `tests/unit/auth/access.test.ts`:

```ts
expect(ACCESS_LABEL.garcom).toBe('Garçom')
expect(ACCESS_LABEL.cozinha).toBe('Cozinha')
expect(ACCESS_DESTINATION.garcom).toBe('/garcom/pedidos')
expect(ACCESS_DESTINATION.cozinha).toBe('/cozinha/dashboard')
expect(ACCESS_DESCRIPTION.garcom).toContain('Selecionar mesas')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/auth/access.test.ts`

Expected: FAIL because the constants are not exported/imported yet.

- [ ] **Step 3: Write minimal implementation**

Export the constants from `lib/auth/access.ts`, import them in `/selecionar-area`, and remove duplicate local maps there.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/auth/access.test.ts`

Expected: PASS.

### Task 2: Render area switcher in ProfileMenu

**Files:**
- Modify: `components/auth/profile-menu.tsx`
- Test: `tests/unit/auth/logout-button.test.ts`

**Interfaces:**
- Consumes: `getCurrentAccesses(): Promise<AcessoUsuario[]>`
- Consumes: `ACCESS_LABEL`, `ACCESS_DESTINATION`
- Produces: `ProfileMenu({ className, currentAccess }: { className?: string; currentAccess?: AcessoUsuario })`

- [ ] **Step 1: Write the failing test**

Add assertions to `tests/unit/auth/logout-button.test.ts`:

```ts
expect(component).toContain("import { getCurrentAccesses")
expect(component).toContain('currentAccess?: AcessoUsuario')
expect(component).toContain('Acessos')
expect(component).toContain('Atual')
expect(component).toContain('ACCESS_LABEL[access]')
expect(component).toContain('ACCESS_DESTINATION[access]')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/auth/logout-button.test.ts`

Expected: FAIL because `ProfileMenu` does not fetch or render accesses yet.

- [ ] **Step 3: Write minimal implementation**

Fetch accesses in `ProfileMenu`, render the access section only when `accesses.length > 1`, render the current access as non-link text with `Atual`, and render other accesses as links.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/auth/logout-button.test.ts`

Expected: PASS.

### Task 3: Remove standalone area links from layouts

**Files:**
- Modify: `app/admin/layout.tsx`
- Modify: `app/cozinha/layout.tsx`
- Modify: `app/garcom/layout.tsx`
- Test: `tests/unit/routing/access-navigation.test.ts`
- Test: `tests/unit/auth/logout-button.test.ts`

**Interfaces:**
- Consumes: `ProfileMenu currentAccess`

- [ ] **Step 1: Write the failing test**

Update `tests/unit/routing/access-navigation.test.ts` so all protected layouts must not contain `href="/selecionar-area"` but must contain `ProfileMenu`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/routing/access-navigation.test.ts`

Expected: FAIL because admin and kitchen still have standalone links.

- [ ] **Step 3: Write minimal implementation**

Pass current area to each layout:

```tsx
<ProfileMenu currentAccess="admin" />
<ProfileMenu currentAccess="cozinha" />
<ProfileMenu currentAccess="garcom" />
```

Remove standalone `/selecionar-area` links from admin and kitchen.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/routing/access-navigation.test.ts`

Expected: PASS.

### Task 4: Verify and publish

**Files:**
- `lib/auth/access.ts`
- `app/selecionar-area/page.tsx`
- `components/auth/profile-menu.tsx`
- `app/admin/layout.tsx`
- `app/cozinha/layout.tsx`
- `app/garcom/layout.tsx`
- `tests/unit/auth/access.test.ts`
- `tests/unit/auth/logout-button.test.ts`
- `tests/unit/routing/access-navigation.test.ts`

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npm test -- tests/unit/auth/access.test.ts tests/unit/auth/logout-button.test.ts tests/unit/routing/access-navigation.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Commit and push**

Commit docs and implementation as reviewable work units, then push to `main`.
