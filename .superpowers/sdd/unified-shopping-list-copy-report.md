# Unified shopping-list and copy UX report

## Scope
- Kept the operational shopping-list UI and unified automatic and manual rows into one alphabetical list.
- Added compatible-unit selection to automatic stock-entry confirmation.
- Added a final read-only TXT representation and `Copiar lista` control.

## TDD evidence
### RED
1. `npm test -- tests/unit/business/stock-manual-idempotency.test.ts`
   - 3 expected failures: missing unified-list accessibility label, TXT field, and receipt-unit selector.
2. `npm test -- tests/unit/actions/estoque.test.ts`
   - 1 expected failure: selected `g` receipt unit was ignored and recorded as `7000` base grams rather than `7`.

### GREEN
- `npm.cmd test -- tests/unit/business/stock-manual-idempotency.test.ts tests/unit/actions/estoque.test.ts tests/unit/business/inventory-ui.test.ts`
  - 3 files / 54 tests passed.
- `npm.cmd test`
  - 66 files / 463 tests passed.
- `npm.cmd run build`
  - Next.js production build and TypeScript passed.
- `git diff --check -- <scoped files>`
  - Passed with no whitespace errors.

## Implementation
- `ShoppingListView` orders all current rows by Portuguese name and renders manual plus automatic rows in one operational list.
- Automatic confirmations initialize with the stored purchase unit and offer only the compatible family (`g/kg`, `ml/L`, or `unidade`). The selected unit is part of the UI idempotency fingerprint and reaches `completeShoppingListItem`.
- The service normalizes automatic receipts using the selected compatible unit against the inventory base unit.
- Manual completion still only deletes its shopping-list row; it does not create a stock movement.
- The TXT field follows the same ordered data as the operational list and copies through `navigator.clipboard.writeText`, with Portuguese success/error feedback.

## Scoped files
- `app/admin/estoque/client.tsx`
- `lib/shopping-list/service.ts`
- `tests/unit/business/stock-manual-idempotency.test.ts`
- `tests/unit/actions/estoque.test.ts`
- `.superpowers/sdd/unified-shopping-list-copy-report.md`

## Review
- Fresh-context review: APPROVED; no blockers.

## Commit
- `feat: unify shopping list operations`
