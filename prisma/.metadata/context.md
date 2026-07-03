# PrismaSchemaReference — Context

**Type**: Database schema reference
**Specialist**: backend-dev
**Last updated**: 2026-07-03

## Purpose
Contains a Prisma schema for SQLite tooling/studio.

## Key dependencies
- `prisma` — schema/studio tooling.
- SQLite datasource — local inspection target.

## Patterns
Prisma mirrors the local SQLite table shape used by tooling, including `Pedido.entregueEm` for delivery reporting visibility.

## Notes
Drizzle remains the app ORM and source of runtime truth; Prisma exists for tooling support.
