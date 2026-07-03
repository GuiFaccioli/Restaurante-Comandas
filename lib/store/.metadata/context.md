# CartStore — Context

**Type**: Zustand store
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Client-only cart state updates totals synchronously as items are added/removed/decremented.

## Key dependencies
`zustand` — client state store.

## Patterns
Totals are client convenience only; persisted order pricing is snapshotted server-side from product records.

## Notes
Built for waiter mobile ordering flow.
