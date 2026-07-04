# Multi-Tenant, Caixa, Reports, and Dependency Cleanup Design

## Goal

Move the restaurant system toward the real product foundation: multi-tenant operation on Neon Postgres, first-party tenant-aware auth, external-payment caixa records, management reports, and documentation that reflects the actual stack.

## Approved Direction

- Keep **Neon Postgres** as the production database foundation.
- Remove only the legacy **Neon Auth** integration if confirmed unused.
- Use first-party email/password auth with tenant membership stored in the app database.
- Allow the same e-mail/user to belong to more than one restaurant/company.
- Store the selected tenant in the server-side session, not in trusted browser input.
- Scope every operational table and query by tenant.
- Implement caixa as external payment registration, not payment processing.
- Keep changes test-first and split into reviewable loops.

## Architecture

The app uses a shared-database multi-tenant model. A `tenant` represents a restaurant/company. A `tenantUser` links a `usuario` to a `tenant`, and `usuarioAcesso` stores permissions for that membership. Operational records such as mesas, categorias, produtos, pedidos, itens, caixa records, and reports are scoped by `tenantId`.

Authentication remains first-party. A user signs in once, then the app selects a tenant automatically when only one membership exists or redirects to `/selecionar-empresa` when the user belongs to multiple tenants. The selected tenant is persisted in `authSession.selectedTenantId`.

## Data Model

### Tenant identity

- `tenant`
  - `id`
  - `nome`
  - `slug`
  - `status`
  - `createdAt`
  - `updatedAt`

- `tenantUser`
  - `id`
  - `tenantId`
  - `usuarioId`
  - `status`
  - `createdAt`
  - `updatedAt`

### Auth/session

- `usuario.email` remains unique for identity.
- `authSession.selectedTenantId` stores the current tenant context.
- `usuarioAcesso` changes from direct user access to tenant membership access:
  - `tenantUserId`
  - `acesso`

### Tenant-scoped operational tables

These tables must include `tenantId`:

- `mesa`
- `categoria`
- `produto`
- `pedido`
- `itemPedido` indirectly scoped through `pedido`, but direct `tenantId` can be added if it simplifies reporting and guard tests.

### Caixa/payment records

Add a caixa/payment record for external payment registration:

- `pagamentoPedido`
  - `id`
  - `tenantId`
  - `pedidoId`
  - `registradoPorUsuarioId`
  - `formaPagamento`: `dinheiro | pix | credito | debito | outro`
  - `valor`
  - `status`: `registrado | estornado`
  - `observacao`
  - `registradoEm`

The app records that payment happened outside the system. It does not process card, PIX, gateway webhooks, subscriptions, or settlement.

## Auth and Tenant Flow

### Sign-up

Owner sign-up creates or reuses the identity by email, creates a tenant, links the owner through `tenantUser`, grants `admin`, creates a session, sets `selectedTenantId`, and redirects to `/selecionar-area`.

### Sign-in

Sign-in validates credentials, creates a session, loads active memberships, and:

- redirects to an access error when there is no active tenant;
- sets `selectedTenantId` and redirects to `/selecionar-area` when there is one tenant;
- redirects to `/selecionar-empresa` when there are multiple tenants.

### Tenant selection

`/selecionar-empresa` lists only active tenants for the logged-in user. Selecting a tenant validates membership server-side, updates `authSession.selectedTenantId`, and redirects to `/selecionar-area`.

## Authorization Rules

- `requireAccess(access)` must read the current session, selected tenant, tenant membership, and access rows.
- Server Actions, pages, and Route Handlers must never accept a client-provided tenant as authority.
- Every tenant-specific query must include the selected `tenantId`.
- Admin permissions apply only inside the selected tenant.
- The same email in another tenant must not gain or lose permissions because of changes in the current tenant.

## Reports

Admin reports must become tenant-scoped and include:

- vendas por período;
- tempo médio de entrega;
- pedidos mais lentos;
- mix de produtos/categorias;
- receita por forma de pagamento after caixa records exist.

Reports must ignore data from other tenants.

## Dependency Cleanup

The dependency cleanup must preserve the multi-tenant direction:

- Keep `@neondatabase/serverless` because Neon Postgres remains the production database.
- Remove `@neondatabase/auth` only after code search confirms no active runtime usage.
- Remove Prisma tooling only if Drizzle is confirmed as the source of truth for schema/runtime.
- Remove or replace `next-pwa` if the vulnerable Workbox chain remains unresolved and the app can keep a basic manifest without generated service worker behavior.
- Never apply `npm audit fix --force` blindly when it downgrades core packages.

## Documentation

Docs and wiki must be corrected to say:

- actual stack: Next.js, Neon Postgres, Drizzle, first-party auth, SSE;
- Neon Auth is legacy/superseded unless explicitly reintroduced later;
- Prisma is not the source of truth if removed;
- caixa records external payments only;
- all new operational behavior is tenant-aware.

Encoding/mojibake in wiki files must be fixed while editing touched docs.

## Testing Requirements

Add or update tests for:

- tenant schema and selected tenant session fields;
- sign-up creates tenant owner membership and selected tenant;
- login branches for zero, one, and multiple tenants;
- `requireAccess` isolates permissions by selected tenant;
- mesa/product/order actions are tenant-scoped;
- reports exclude other tenants;
- caixa records require `caixa` access and selected tenant;
- dependency cleanup removes unused vulnerable packages without breaking build scripts;
- documentation no longer declares Neon Auth/Prisma as the active runtime stack.

## Out of Scope

- Subdomain-based tenant routing.
- Billing/subscription enforcement.
- Payment gateway integration.
- Password reset and email verification.
- Cross-tenant admin console.
- Full table-session aggregation beyond closing individual delivered orders/pedidos in this iteration.
