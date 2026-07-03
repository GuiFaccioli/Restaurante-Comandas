# AdminMenuRoute — Context

**Type**: App Router page + client component
**Specialist**: frontend-dev
**Last updated**: 2026-07-03

## Purpose
Loads categories/products and renders admin menu CRUD interactions.

## Key dependencies
- `@/lib/db/index` — server query.
- `drizzle-orm` — ordering.
- `@/lib/actions/produtos` — category/product mutations.
- `sonner` — feedback.

## Patterns
The server page is `force-dynamic` because `requireAccess('admin')` reads cookies. The client component handles category selection, availability toggles, and product dialog opening.

## Notes
Product prices are displayed from persisted decimal strings; mutations validate/normalize in server actions.
