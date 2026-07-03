# SharedComponents — Context

**Type**: React components
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Small shared components avoid duplicating status/timer logic across kitchen and waiter surfaces.

## Key dependencies
`@/components/ui/*` — base UI primitives; `@/lib/time/elapsed` — timer formatting; `@/lib/db/schema` — status types.

## Patterns
Status enum still contains legacy statuses for backward compatibility, even though operational flow now uses `novo` and `entregue`.

## Notes
Evolved through delivery flow and UI alignment work.
