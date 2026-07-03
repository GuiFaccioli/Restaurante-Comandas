# WaiterShell — Context

**Type**: App Router layout
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Layout-level guard protects all waiter screens.

## Key dependencies
`@/lib/auth/access` — requires garcom access.

## Patterns
Single-access waiters are redirected to `/garcom/pedidos`, not directly to table selection.

## Notes
Updated by waiter delivery confirmation flow.
