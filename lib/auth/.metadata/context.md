# AuthCore — Context

**Type**: Authentication/authorization module
**Specialist**: backend-dev
**Last updated**: 2026-07-03

## Purpose
Session cookies store random tokens while DB stores SHA-256 token hashes; access checks query `usuario_acesso`.

## Key dependencies
`next/headers` — cookies; `node:crypto` — token hashing; `drizzle-orm` — session/user lookups; `next/navigation` — redirects.

## Patterns
There is coexistence between original Neon Auth intent and current first-party auth/session implementation.

## Notes
Permission-gate and first-party auth commits introduced the current behavior.
