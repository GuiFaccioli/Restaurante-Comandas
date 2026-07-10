# Admin User Accesses Design

## Goal

Simplify the admin user management screen so **Acessos** are the clear source of truth for what each restaurant user can do.

## Approved Decisions

- Remove **Cargo** from the admin user editing experience.
- Keep **Acessos** as the only control the admin uses to grant operational areas.
- Preserve the existing `usuario.role` database column for now to avoid unnecessary migration risk.
- Do not change the current access model: `admin`, `caixa`, `cozinha`, and `garcom`.
- Do not change route authorization rules in this work.

## Problem Summary

The current `/admin/usuarios` screen exposes two concepts:

- **Cargo**, backed by `role_usuario`, with only `admin` and `garcom`.
- **Acessos**, backed by `acesso_usuario`, with `admin`, `caixa`, `cozinha`, and `garcom`.

That is confusing because access checks already use `usuario_acesso` through `requireAccess()` and `requireAnyAccess()`. In practice, **Acessos** determine which areas a user can enter. **Cargo** is currently a coarse legacy field and does not represent all operational responsibilities.

The admin should not have to understand that internal distinction. If the system asks them to manage permissions, the UI should expose permissions directly.

## UX Model

### User card

Each user card on `/admin/usuarios` should show:

1. User name.
2. User email.
3. A clear **Acessos** section.
4. Save action.
5. Remove user action.

The **Cargo** select should not appear.

### Access controls

The access controls should keep the existing four operational areas:

| Access | User-facing label | Meaning |
|--------|-------------------|---------|
| `admin` | Administração | Manage menu, tables, settings, users, and reports. |
| `caixa` | Caixa | Close orders and register payments. |
| `cozinha` | Cozinha | View and update kitchen order preparation. |
| `garcom` | Garçom | Open tables, create orders, and confirm deliveries. |

The page copy should say something close to:

> Gerencie quais áreas cada usuário pode acessar neste restaurante.

This teaches the right mental model: users receive area access, not vague titles.

## Architecture

### Keep the database stable

No migration is required for this change. `usuario.role` remains in the schema and existing rows remain valid.

This avoids turning a UX cleanup into a database refactor. Removing the field can be a later dedicated change if the project no longer needs it anywhere.

### Update the admin page

`app/admin/usuarios/page.tsx` should:

- stop rendering `ROLE_OPTIONS`;
- stop rendering the `name="role"` select;
- keep reading users and their `usuarioAcesso` rows;
- keep submitting selected `acessos`.

The form layout can simplify because it no longer needs a role column.

### Update the server action

`lib/actions/usuarios.ts` should:

- stop requiring `role` from `FormData`;
- stop validating `VALID_ROLES`;
- stop updating `usuario.role` during access edits;
- continue validating selected accesses with `VALID_ACCESSES`;
- continue replacing `usuario_acesso` rows for the selected tenant membership.

This preserves the actual permission behavior while removing the misleading UI dependency.

## Error Handling

The existing guardrails should remain:

- only admins can edit user access;
- invalid or missing user ID throws an error;
- users outside the selected tenant cannot be edited;
- invalid access values are ignored by the existing whitelist filter.

The implementation should consider whether saving zero accesses is allowed. Existing behavior allows it because the action deletes all rows and inserts none. This design does not change that rule.

## Testing Requirements

Update or add tests proving:

- `/admin/usuarios` no longer renders **Cargo** or a `name="role"` control.
- `/admin/usuarios` still renders **Acessos**.
- the users admin action no longer depends on a submitted `role`.
- the users admin action still validates and persists `admin`, `caixa`, `cozinha`, and `garcom` accesses.
- permission boundary tests continue to prove route access uses `requireAccess()` and `requireAnyAccess()`.

Run targeted tests first, then the full suite.

## Out of Scope

- Removing `role_usuario` from the database.
- Adding new access types.
- Changing login, tenant selection, or area switching.
- Changing the meaning of `admin`, `caixa`, `cozinha`, or `garcom`.
- Redesigning the entire admin user management page beyond the permission confusion.

## Implementation Notes

This should be a small TDD change:

1. Add/update tests that fail while **Cargo** is still rendered and `role` is still required.
2. Remove the role UI and action dependency.
3. Run targeted tests.
4. Run the full test suite and build.
