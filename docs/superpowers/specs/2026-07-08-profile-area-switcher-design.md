# Profile Area Switcher Design

## Goal

Move access switching into the profile menu so users with multiple permissions can move between their allowed operational areas without standalone "Trocar área" links in page layouts.

## Approved Decisions

- Area switching appears only inside `ProfileMenu`.
- Standalone "Trocar área" links must be removed from protected layouts.
- Users with one access do not need an access-switch section.
- Users with multiple accesses see their available areas inside the profile menu.
- The current area appears as the active area and is not a navigation link.
- Other allowed areas link to their destination screens.
- Sign-out remains at the bottom of the profile menu.

## Problem Summary

The app currently has two different navigation models:

- `/selecionar-area` lets multi-access users choose an operational area.
- Protected layouts also expose standalone "Trocar área" links.

That creates visual noise in operational screens. A waiter screen should stay focused on waiter work. If the user has both waiter and kitchen access, the correct interaction is:

1. Open **Perfil**.
2. Click **Cozinha** to go to the kitchen dashboard.
3. Open **Perfil** again.
4. Click **Garçom** to return to waiter deliveries.

## UX Model

### Profile menu layout

The profile menu should render:

1. User name and email.
2. Access switcher, only when the user has two or more accesses.
3. Sign-out action.

### Access switcher

Each access row uses the existing access labels:

| Access | Label | Destination |
|--------|-------|-------------|
| `admin` | Administração | `/admin/menu` |
| `caixa` | Caixa | `/admin/pedidos` |
| `cozinha` | Cozinha | `/cozinha/dashboard` |
| `garcom` | Garçom | `/garcom/pedidos` |

The current area should be visually marked with **Atual** and should not be clickable. Other areas should be links.

### Layout cleanup

Protected layouts should not render a standalone "Trocar área" link:

- `app/admin/layout.tsx`
- `app/cozinha/layout.tsx`
- `app/garcom/layout.tsx`

The profile menu remains available in those layouts.

## Architecture

### Server-side access data

`components/auth/profile-menu.tsx` is already a server component wrapper. It should fetch:

- current session via `getCurrentSession()`;
- current accesses via `getCurrentAccesses()`.

The menu can then pass rendered links/labels as children to the existing client dropdown.

### Current area detection

The cleanest approach is to pass the current area from each layout into `ProfileMenu`, for example:

```tsx
<ProfileMenu currentAccess="garcom" />
```

This keeps route-specific knowledge in the layout that owns the route. It avoids brittle pathname parsing and keeps the profile menu testable.

### Shared labels and destinations

Access labels and destinations should be centralized so `ProfileMenu`, `/selecionar-area`, and access tests do not drift apart.

Add shared exports:

```ts
export const ACCESS_LABEL: Record<AcessoUsuario, string>
export const ACCESS_DESTINATION: Record<AcessoUsuario, string>
```

`redirectForAccesses()` can keep using the shared destination map.

## Testing Requirements

- Profile menu source test proves it fetches `getCurrentAccesses()`.
- Profile menu source test proves it renders access labels and uses destinations.
- Layout tests prove admin, kitchen, and waiter layouts render `ProfileMenu` but do not render standalone `href="/selecionar-area"` links.
- Access routing tests keep proving single-access destinations work.
- Full test suite passes after each implementation loop.

## Implementation Loops

Use small reviewable loops:

1. **Access metadata loop**
   - Centralize labels and destinations.
   - Keep existing access routing behavior green.

2. **Profile switcher loop**
   - Add `currentAccess` support to `ProfileMenu`.
   - Render permitted access links in the menu.
   - Mark the current access as active.

3. **Layout cleanup loop**
   - Pass current access from protected layouts.
   - Remove standalone "Trocar área" links from admin and kitchen layouts.
   - Keep garçom clean.

4. **Verification loop**
   - Run targeted tests.
   - Run the full suite.
   - Commit and push the implementation work unit.

## Out of Scope

- Changing database permissions.
- Changing tenant selection.
- Removing `/selecionar-area`; it can remain as the post-login chooser for users with multiple accesses.
- Building a new visual profile menu library.
