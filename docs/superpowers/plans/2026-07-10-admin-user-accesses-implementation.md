# Admin User Accesses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the misleading Cargo control from admin user management and make Acessos the only editable permission source.

**Architecture:** Keep the database stable and preserve `usuario.role` for compatibility. Update the admin users page to submit only selected accesses, and update the server action to stop requiring or mutating `role`.

**Tech Stack:** Next.js App Router, React Server Components, Drizzle ORM, Vitest source-level regression tests.

## Global Constraints

- No database migration in this change.
- Preserve current access values: `admin`, `caixa`, `cozinha`, `garcom`.
- Do not change route authorization rules.
- Use TDD: write failing regression coverage before production edits.
- Keep tests with the behavior commit.

---

### Task 1: Protect access-only admin user management

**Files:**
- Modify: `tests/unit/business/admin-management.test.ts`
- Create: `tests/unit/actions/usuarios.test.ts`
- Modify: `app/admin/usuarios/page.tsx`
- Modify: `lib/actions/usuarios.ts`

**Interfaces:**
- Consumes: existing `atualizarUsuarioAdmin(data: FormData): Promise<void>`
- Produces: same action signature, but no longer requires `role` in submitted form data.

- [x] **Step 1: Write the failing UI/action source test**

Update the `users admin can update roles, accesses, and remove tenant membership` test to become an access-only regression:

```ts
it('users admin manages accesses without exposing legacy cargo editing', () => {
  const usersPage = source('app/admin/usuarios/page.tsx')
  const userActions = source('lib/actions/usuarios.ts')

  expect(userActions).toContain('atualizarUsuarioAdmin')
  expect(userActions).toContain('removerUsuarioDoRestaurante')
  expect(userActions).toContain("requireAccess('admin')")
  expect(userActions).toContain('tenantUser')
  expect(userActions).toContain('usuarioAcesso')
  expect(userActions).toContain('VALID_ACCESSES')
  expect(userActions).not.toContain('VALID_ROLES')
  expect(userActions).not.toContain("formString(data, 'role')")
  expect(userActions).not.toContain('Cargo inválido')
  expect(userActions).not.toContain('.set({ role')

  expect(usersPage).not.toContain('ROLE_OPTIONS')
  expect(usersPage).not.toContain('Cargo')
  expect(usersPage).not.toContain('name="role"')
  expect(usersPage).toContain('Acessos')
  expect(usersPage).toContain('Gerencie quais áreas cada usuário pode acessar neste restaurante.')
  expect(usersPage).toContain('Salvar usuário')
  expect(usersPage).toContain('Remover usuário')
  expect(usersPage).toContain('atualizarUsuarioAdmin')
  expect(usersPage).toContain('removerUsuarioDoRestaurante')
})
```

- [x] **Step 2: Run test to verify RED**

Run:

```bash
npm test -- tests/unit/business/admin-management.test.ts
```

Expected: FAIL because the page still renders `Cargo`/`ROLE_OPTIONS` and the action still uses `VALID_ROLES`.

- [x] **Step 3: Remove Cargo from the admin page**

In `app/admin/usuarios/page.tsx`:

- remove `RoleUsuario` import;
- remove `ROLE_OPTIONS`;
- stop selecting `role: usuario.role`;
- remove the entire Cargo `<label>`/`<select>`;
- simplify the form grid;
- update intro copy to `Gerencie quais áreas cada usuário pode acessar neste restaurante.`;
- keep access checkboxes and save/remove actions.

- [x] **Step 4: Remove role dependency from the server action**

In `lib/actions/usuarios.ts`:

- remove `RoleUsuario` import;
- remove `VALID_ROLES`;
- remove `const role = formString(data, 'role') as RoleUsuario`;
- remove `if (!VALID_ROLES.includes(role)) throw new Error('Cargo inválido')`;
- remove the `db.update(usuario).set({ role, updatedAt: new Date() })` call;
- remove `usuario` from the schema import if unused;
- keep membership validation and `usuarioAcesso` replacement intact.

- [x] **Step 5: Run targeted test to verify GREEN**

Run:

```bash
npm test -- tests/unit/business/admin-management.test.ts
```

Expected: PASS.

- [x] **Step 6: Run broader verification**

Run:

```bash
npm test -- --maxWorkers=1
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit and push**

Run:

```bash
git add docs/superpowers/plans/2026-07-10-admin-user-accesses-implementation.md tests/unit/business/admin-management.test.ts tests/unit/actions/usuarios.test.ts app/admin/usuarios/page.tsx lib/actions/usuarios.ts
git commit -m "fix(admin): manage users by accesses"
git push
```
