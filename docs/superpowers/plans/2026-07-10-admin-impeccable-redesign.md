# Admin Impeccable Redesign Plan

## Function of the Screen

The admin area is the restaurant operator's control room. Its primary job is not to impress visually; it must let an admin maintain menu items, tables, users, reports, and cashier/admin settings quickly without breaking live operations.

For this first Impeccable polish pass, the working surface is the admin shell plus the currently captured `/admin/menu` and related admin controls where the audit found P1 issues. The redesign preserves all routes, auth checks, server actions, database behavior, analytics assumptions, and business rules.

## What the Admin Must See First

1. **Current location**: the admin must know whether they are editing cardápio, mesas, pedidos, usuários, relatórios, or configurações.
2. **Primary task for the current route**: on cardápio, the primary action is adding a product to the selected category.
3. **Current working context**: selected category, product count, and category maintenance actions.
4. **Rows/items to act on**: product list or table list, with status and actions readable in one scan.

## Layout Logic

### Top

The top shell remains sticky and compact. It carries global admin identity, primary operational admin destinations, and profile access switching. It should not become a marketing header.

Changes:

- Add active route semantics via `aria-current="page"`.
- Give active links a slightly stronger visual treatment using muted/ink contrast, not decorative color.
- Keep profile switching where it belongs: profile menu.

### Left / Secondary Area

Desktop keeps a narrow management rail around `260px`. This is intentionally secondary: management links are useful but should not compete with the route's primary task.

On mobile, the rail appears before content as it does today, but active state and tighter grouping reduce orientation cost.

### Center / Main Work Area

The main admin card uses a wide content column. Cardápio becomes a two-zone workspace:

- **Left rail (`~220px`)**: category selection and category creation.
- **Main area (`minmax(0,1fr)`)**: selected category header, primary product action, category maintenance panel, and product rows.

This proportion makes sense because categories are navigation/context, while products are the main editable dataset.

## Proportions

- Admin shell max width remains `max-w-7xl` to preserve the current product frame.
- Management sidebar stays near `260px`, enough for labels/descriptions without stealing workspace.
- Cardápio internal category rail uses about `220px` on desktop; below desktop it collapses above the product list.
- Main content uses the remaining width and moves product rows into dense, scan-friendly list rows.
- Controls keep `min-h-11` touch targets.
- Spacing follows the existing 4px/8px rhythm: `gap-2`, `gap-3`, `gap-4`, `gap-6`, `p-3`, `p-4`, `p-5`.

## Element Positioning

- **Page/route location** belongs in the shell and page header.
- **Novo Produto** stays in the selected category header because it acts on that category.
- **Renomear/excluir categoria** stay in a secondary maintenance panel below the category header, not mixed with product row actions.
- **Product availability** becomes a semantic status button in each row near product data.
- **Edit/delete product** remain row-scoped actions. Delete stays visually secondary/destructive.
- **Table active/inactive** becomes a semantic button instead of clickable Badge.

## What Gets Removed, Grouped, or Highlighted

Removed:

- Badge-as-button anti-pattern.
- Placeholder-only table input label.
- Icon-only edit button without accessible name.
- Category/product controls visually competing at equal weight.

Grouped:

- Category navigation and category creation.
- Category maintenance actions.
- Product row status/actions.

Highlighted:

- Current active admin route.
- Selected category and product count.
- Primary route action: `Novo Produto`.

## Responsive Behavior

### Desktop

Admin shell uses sticky top nav, left management rail, and a wide main card. Cardápio uses category rail + product workspace side by side.

### Notebook / Medium Width

The shell keeps navigation horizontal with overflow protection. Cardápio spacing tightens but preserves the two-zone mental model until the breakpoint where stacking is clearer.

### Mobile

The management rail stacks above the main card. Category navigation stacks above products. Product rows become vertical cards with product identity first, then status/actions. No horizontal overflow; action targets remain at least `44px` high.

## Critique Summary

- Current admin UI is restrained and aligned with the product palette, but too generic and card-heavy.
- It lacks active location state, which weakens confidence.
- The menu page mixes category navigation, category creation, category editing, product creation, product editing, status toggles, and deletion with too little hierarchy.
- Clickable badges are a real accessibility bug.

## Audit Summary

- Detector found no automated Impeccable slop issues.
- P1 issues:
  - clickable `Badge` controls are not semantic buttons;
  - some form controls lack label associations;
  - semantic action contrast is risky;
  - active navigation state is missing.
- P2 issues:
  - icon-only edit button has no accessible name;
  - empty states are uneven;
  - async feedback is inconsistent.

## Implementation Scope

This pass will:

1. Add source regression tests for active admin navigation, semantic status controls, labels, empty states, and admin menu hierarchy.
2. Add a client admin navigation component using `usePathname()` for active state.
3. Polish `app/admin/layout.tsx`.
4. Polish `app/admin/menu/client.tsx`.
5. Polish `app/admin/mesas/client.tsx`.
6. Polish `components/admin/produto-form.tsx`.
7. Adjust semantic button colors for contrast using existing product palette intent.

Out of scope:

- Backend, database, auth, analytics, GTM/GA4.
- New filtering/search/business behavior.
- Full reports redesign and date range logic.
- Replacing destructive confirms with custom dialogs, unless it can be done without creating a larger interaction system.

## Validation Plan

- RED/GREEN targeted tests:
  - `npm test -- tests/unit/business/admin-management.test.ts`
  - `npm test -- tests/unit/business/order-flow.test.ts`
- Full validation:
  - `npm test -- --maxWorkers=1`
  - `npm run build`
  - `npx impeccable detect --json app components`
- Visual validation:
  - open `/admin/menu` desktop and mobile;
  - verify active nav, category/product hierarchy, product status controls, empty-state handling, and no horizontal overflow.
