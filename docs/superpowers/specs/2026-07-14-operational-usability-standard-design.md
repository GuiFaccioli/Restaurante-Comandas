# Operational usability standard

## Goal

Extend the established waiter/admin interaction language to the remaining operational screens without changing routes, permissions, data flow, or business rules.

## Decisions

- Keep operational controls at a minimum 44px touch target.
- Hide scrollbar chrome where horizontal touch scrolling remains available.
- Keep persistent navigation or category rails visible when it reduces re-scanning.
- Use explicit semantic states and concise copy instead of decorative helper text.
- Provide a delayed, accessible scroll-to-top control on long operational pages.

## Scope

- Waiter table/menu: active category styling, hidden category scrollbar, scroll-to-top control.
- Waiter pending deliveries and kitchen dashboard: reuse the same scroll-to-top control and preserve SSE state.
- Existing action colors, authentication, tenant scoping, and server actions remain unchanged.

## Verification

- Add source/behavior regressions for touch targets, active state, scrollbar treatment, and scroll control timing.
- Run focused tests, TypeScript, and production build before publishing.
