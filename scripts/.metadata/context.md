# DevSeedScript — Context

**Type**: Development script
**Specialist**: backend-dev
**Last updated**: 2026-07-03

## Purpose
Idempotent-ish seed upserts users/accesses and updates existing categories/products.

## Key dependencies
`better-sqlite3` — local DB; `drizzle-orm/better-sqlite3` — inserts; `@/lib/dev/test-users` and `@/lib/menu/default-menu` — fixtures.

## Patterns
The script prints the shared dev password; keep it development-only.

## Notes
Added by local development/seed setup.
