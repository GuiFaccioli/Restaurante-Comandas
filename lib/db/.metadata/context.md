# DatabaseSchema — Context

**Type**: Database module
**Specialist**: backend-dev
**Last updated**: 2026-07-03

## Purpose
Defines Drizzle schemas for PostgreSQL and SQLite plus database connection compatibility.

## Key dependencies
- `drizzle-orm/pg-core` and `drizzle-orm/sqlite-core` — schema definitions.
- `better-sqlite3` — local SQLite runtime.
- `@neondatabase/serverless` — production PostgreSQL/Neon runtime.

## Patterns
TypeScript Drizzle schema mirrors operational tables; SQLite schema supports local tests/dev with timestamp and boolean compatibility. During `phase-production-build`, SQLite bootstrap skips mutable pragmas to avoid multi-worker build locks.

## Notes
PostgreSQL SQL and Prisma reference files were synchronized with `entregue_em` and first-party auth/session tables on 2026-07-03.
