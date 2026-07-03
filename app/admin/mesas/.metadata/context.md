# AdminTablesRoute — Context

**Type**: App Router page + client component
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Loads tables and lets admins create/toggle active restaurant tables.

## Key dependencies
- `@/lib/db/index` — server query.
- `@/lib/actions/mesas` — mutations.
- `sonner` — feedback.

## Patterns
The server page is `force-dynamic` because `requireAccess('admin')` reads cookies. The client component handles form state and refreshes after actions.

## Notes
Table activation controls waiter visibility because waiter table selection only shows active tables.
