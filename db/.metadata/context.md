# SqlSchemaReference — Context

**Type**: Database schema reference
**Specialist**: backend-dev
**Last updated**: 2026-07-03

## Purpose
Contains the PostgreSQL SQL schema reference for the restaurant order system.

## Key dependencies
- PostgreSQL DDL — table/enum/index definitions.

## Patterns
Mirrors the current Drizzle PostgreSQL schema for core restaurant tables, access permissions, first-party auth sessions, and delivery timestamps.

## Notes
Keep this file synchronized with `lib/db/schema.ts` when Drizzle schema changes. It is documentation/reference DDL, not the runtime ORM definition.
