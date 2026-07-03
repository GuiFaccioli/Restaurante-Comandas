# AdminUsersRoute — Context

**Type**: App Router page
**Specialist**: backend-dev
**Last updated**: 2026-07-03

## Purpose
Server component builds an access list per user from `usuario` and `usuario_acesso`.

## Key dependencies
`@/lib/db/index` — users/accesses; `@/lib/auth/access` — admin guard; `drizzle-orm` — joins/order.

## Patterns
Read-only audit surface; mutations for users/accesses are not implemented here.

## Notes
Created during admin management and permission-gate work.
