# ServerActions — Context

**Type**: Server Actions
**Specialist**: backend-dev
**Last updated**: 2026-07-03

## Purpose
All app mutations are server actions; actions check required access before mutating.

## Key dependencies
`drizzle-orm` — database mutations; `@/lib/auth/access` — authorization; `@/lib/sse` — live event notifications; `@/lib/db/compat` — SQLite/Postgres compatibility.

## Patterns
Order creation snapshots product price. Delivery confirmation is garcom-owned; legacy kitchen status action remains for backward compatibility.

## Notes
Core requirement from project plan: mutations via Server Actions, no separate REST API.
