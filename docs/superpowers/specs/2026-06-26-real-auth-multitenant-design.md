# Real Auth and Multi-Tenant Access Design

## Goal

Build the real registration, login, session, tenant selection, and permission flow for the SaaS version of the restaurant system.

## Decisions Already Approved

- The initial sign-up creates both the restaurant company and the owner user.
- The owner receives `admin` access for that company.
- The same email can belong to more than one company.
- After login, users with multiple companies must choose which company they want to enter.
- Accesses are configured per company, not globally.
- Admin-created employees receive an initial password at creation time.
- Employees log in through the same `/auth/sign-in` page.

## Recommended Architecture

Use first-party email/password authentication stored in PostgreSQL instead of relying on Neon Auth for the MVP.

Reasons:

- The product's core authorization model is tenant-based: one identity can belong to many companies with different permissions.
- Local development needs real login persistence, not `DEV_SKIP_AUTH`.
- Billing and blocked-tenant rules must be enforced from the app database.
- External auth providers can be added later without changing the tenant/permission model.

## Data Model

### Existing Tables to Keep

- `usuario`
- `tenant`
- `tenantUser`
- `usuarioAcesso`

### Schema Changes

Add password authentication fields:

- `usuario.passwordHash`
- `usuario.createdAt`
- `usuario.updatedAt`

Add session storage:

- `authSession.id`
- `authSession.usuarioId`
- `authSession.tokenHash`
- `authSession.expiresAt`
- `authSession.createdAt`

Add selected tenant persistence:

- `authSession.selectedTenantId`

This keeps session state server-side and avoids trusting tenant IDs sent directly by the browser.

## Registration Flow

### `/auth/sign-up`

Fields:

- Owner name
- Email
- Password
- Company/restaurant name

On submit:

1. Normalize email.
2. Hash password.
3. Create or reuse `usuario` by email.
4. Create `tenant` with status `active` for local/MVP development.
5. Create `tenantUser` linking the owner to the tenant.
6. Create `usuarioAcesso` for `admin`.
7. Create authenticated session cookie.
8. Set selected tenant to the newly created tenant.
9. Redirect to `/selecionar-area`.

Production billing can later switch new tenants to `pending_payment` before full access.

## Login Flow

### `/auth/sign-in`

Fields:

- Email
- Password

On submit:

1. Normalize email.
2. Find user.
3. Verify password hash.
4. Create authenticated session cookie.
5. Load active tenant memberships.
6. If user has no companies, show a clear access error.
7. If user has one company, set it as selected tenant.
8. If user has multiple companies, redirect to `/selecionar-empresa`.
9. Otherwise redirect to `/selecionar-area`.

## Tenant Selection Flow

### `/selecionar-empresa`

Shows active companies linked to the logged-in user.

On selecting a company:

1. Validate that the current user belongs to that tenant.
2. Store the selected tenant in the server-side session.
3. Redirect to `/selecionar-area`.

Users can later switch company from the header/account area, but the first implementation only needs the selection page.

## Permission Flow

Permissions remain in `usuarioAcesso`, scoped through `tenantUser`.

Rules:

- `admin` can manage users for the selected tenant.
- `caixa` can access checkout/order payment control.
- `cozinha` can access kitchen dashboard.
- `garcom` can access waiter mesa/order flow.
- Admin does not automatically receive other accesses unless explicitly marked.

Existing `requireAccess()` should read:

1. Current session.
2. Selected tenant from the session.
3. Current `tenantUser`.
4. Access rows for that tenant membership.

If selected tenant is missing and the user has multiple tenants, redirect to `/selecionar-empresa`.

## Admin User Creation Flow

### `/admin/usuarios`

Admin creates employees with:

- Name
- Email
- Initial password
- Access checkboxes: admin, caixa, cozinha, garcom

On submit:

1. Require `admin` access in the selected tenant.
2. Create or reuse `usuario` by email.
3. Set or update password hash only when an initial password is provided.
4. Create or reactivate `tenantUser` for the selected tenant.
5. Replace `usuarioAcesso` rows for that tenant membership.

If the same email already belongs to another company, this must not affect that other company's permissions.

## Logout

Add a logout action that:

1. Deletes the current session from the database.
2. Clears the auth cookie.
3. Redirects to `/auth/sign-in`.

## Security Requirements

- Passwords must never be stored in plain text.
- Use a modern password hashing library available in the project dependency set or add one deliberately.
- Session cookie must be `httpOnly`, `sameSite=lax`, and path `/`.
- In production, session cookie must be `secure`.
- Store only a hash of the session token in the database.
- Auth actions must avoid leaking whether an email exists.
- All tenant-specific operational queries must remain scoped by selected tenant.

## Local Development Requirements

- The system must work without `DEV_SKIP_AUTH=true`.
- Seed can still create development users/companies for convenience.
- It must be possible to create multiple companies locally through `/auth/sign-up`.
- It must be possible to log out, log back in, and preserve the correct company-selection behavior.

## UI Routes

- `/auth/sign-up`: create owner + company.
- `/auth/sign-in`: login.
- `/selecionar-empresa`: choose company when more than one tenant is available.
- `/selecionar-area`: choose area when more than one access is available.
- `/admin/usuarios`: manage users and permissions for the selected tenant.

## Testing Requirements

Add or update tests for:

- Schema includes password/session fields.
- Sign-up creates user, tenant, membership, admin access, and session.
- Login verifies password and creates session.
- Multi-company login redirects to company selection.
- Selected tenant changes the data visible to the user.
- Admin-created employee can log in with initial password.
- Permissions remain isolated between companies.
- Logout clears the session.

## Out of Scope for This First Implementation

- Password reset by email.
- Email verification.
- Social login.
- Mercado Pago billing enforcement.
- Subdomain-based tenant routing.
- Employee invitation email.

These can be added after the local real-auth and multi-tenant flow is stable.
