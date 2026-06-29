# Real Auth, Registration, and Permission Gates Design

## Goal

Build the correct registration, login, session, area selection, and permission enforcement model for Restaurante-Comandas.

## Product Decisions

- One e-mail represents one person.
- One person belongs to one company only.
- There is no company-selection flow.
- A user can have multiple area permissions inside that company.
- If a user has more than one area permission, login sends them to `/selecionar-area`.
- The kitchen dashboard and SSE endpoint are protected and require `cozinha`.
- Server Actions are API surfaces and must enforce permissions.
- The app only records external payments; it does not process payments.

## Architecture

Replace the current Neon Auth/dev mock dependency with first-party email/password authentication backed by the database. Store an opaque session token in an `httpOnly` cookie, store only its hash in the database, and resolve the current user through `getCurrentSession()`.

Centralize authorization in `requireAccess(access)`. This function becomes the only authorization gate for pages, Route Handlers, and Server Actions. It reads the current session, loads the user's access rows, and either returns the authenticated context or redirects/throws according to the caller surface.

## Data Model

Add:

- `usuario.passwordHash`
- `usuario.createdAt`
- `usuario.updatedAt`
- `authSession`
- `usuarioAcesso` with `usuarioId` + `acesso`
- `acesso_usuario` enum: `admin`, `caixa`, `cozinha`, `garcom`

Do not add tenant/company membership tables yet. Company separation can be introduced later only if the product direction changes; current rule is one person, one company.

## Registration

`/auth/sign-up` creates:

1. user name;
2. unique normalized email;
3. password hash;
4. default access set.

Initial owner sign-up should grant `admin` by default. Operational accesses remain explicit and can be granted later.

## Login

`/auth/sign-in`:

1. normalizes email;
2. verifies password;
3. creates server-side session;
4. loads user accesses;
5. redirects to `/selecionar-area` when the user has multiple accesses;
6. redirects directly to the only area when the user has exactly one access.

## Area Permissions

- `admin` -> `/admin/menu`, `/admin/mesas`, admin setup pages.
- `caixa` -> `/admin/pedidos`, future `/admin/caixa`, comanda closing and external payment recording.
- `cozinha` -> `/cozinha/dashboard`, `/api/events`, kitchen status changes.
- `garcom` -> `/garcom/*`, order confirmation.

Admin does not automatically mean `caixa`, `cozinha`, or `garcom`.

## Route and API Guards

Pages:

- `app/admin/layout.tsx` requires `admin` for admin setup pages.
- `app/admin/pedidos/page.tsx` requires `caixa`.
- `app/cozinha/layout.tsx` requires `cozinha`.
- `app/garcom/layout.tsx` requires `garcom`.

Route Handlers:

- `app/api/events/route.ts` requires `cozinha`.

Server Actions:

- waiter order confirmation requires `garcom`.
- kitchen status update requires `cozinha`.
- product/menu management requires `admin`.
- table management requires `admin`.
- comanda/payment registration will require `caixa` when implemented.

## Testing Strategy

Use TDD. Tests must first fail, then production code is added.

Required test coverage:

- password hashing does not store plaintext and verifies correctly;
- schema exposes auth/session/access fields;
- sign-up rejects duplicate email and creates a hashed password;
- sign-in rejects invalid credentials and creates a session for valid credentials;
- access resolution rejects missing sessions;
- `requireAccess` allows matching permissions and rejects missing permissions;
- `/api/events` source requires `cozinha`;
- kitchen status action requires `cozinha`;
- waiter confirmation action requires `garcom`;
- product/table actions require `admin`;
- area selection route exists and routes by access.

## Out of Scope

- Multiple companies per user.
- Company selection.
- Payment-provider integration.
- In-app payment processing.
- Password reset by email.
- Email verification.
