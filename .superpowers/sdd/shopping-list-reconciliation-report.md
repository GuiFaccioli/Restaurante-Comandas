# Shopping-list reconciliation report

## Root cause
Automatic shopping-list rows were only read after the eligibility guard. A direct stock movement that raised current stock above the minimum returned early, leaving a stale row persisted; the copied TXT correctly reflected that stale source.

## Fix
- Resolve the existing automatic row before applying the eligibility decision.
- Delete it transactionally when the ingredient no longer needs replenishment.
- Create and edit ingredients inside the same transaction as reconciliation.
- Preserve existing eligible automatic rows as frozen snapshots.

## Verification
- `npm test -- tests/unit/actions/estoque-shopping-list-reconciliation.test.ts tests/unit/actions/estoque.test.ts` — 40 passing.
- `npm run build` — passed.

## Concurrency follow-up
- Added `FOR UPDATE` when reading an existing automatic shopping-list row before eligibility/deletion.
- Regression test verifies the automatic row query requests the update lock.

### Commands
- `npm test -- tests/unit/actions/estoque.test.ts tests/unit/actions/estoque-shopping-list-reconciliation.test.ts`
  - Output: 2 test files passed, 41 tests passed.
- `npm run build`
  - Output: Next.js production build and TypeScript check passed.

## Deadlock lock-order follow-up
- Standardized lock order: automatic shopping-list row, then ingredient row.
- Applied the order to reconciliation, direct stock movements, ingredient edits, and order stock consumption.
- When no automatic row exists, reconciliation reads it again after acquiring the ingredient lock to avoid a stale absence during concurrent creation.

### Commands
- `npm test -- tests/unit/actions/estoque.test.ts tests/unit/actions/estoque-shopping-list-reconciliation.test.ts`
  - Output: 2 test files passed, 41 tests passed.
- `npm run build`
  - Output: Next.js production build and TypeScript check passed.

## Absent-row-safe lock follow-up
- Added a transaction-scoped PostgreSQL advisory lock derived from `tenantId:insumoId` before automatic-row and ingredient locks.
- Completion reads an automatic row without locking, acquires the advisory lock, then re-reads it with `FOR UPDATE`; this keeps its lock order consistent with stock mutations.
- Regression harnesses now cover direct movement, ingredient edit, order consumption, and the missing-row recheck sequence.

### Commands
- `npm test -- tests/unit/stock/service.test.ts tests/unit/stock/order-consumption.test.ts tests/unit/actions/estoque.test.ts tests/unit/actions/estoque-shopping-list-reconciliation.test.ts`
  - Output: 4 test files passed, 59 tests passed.
- `npm run build`
  - Output: Next.js production build and TypeScript check passed.

## Order preflight lock-order follow-up
- `createOrderInPostgresTransaction` now acquires the shared shopping-list coordination lock before every raw ingredient preflight `FOR UPDATE` lock.
- Ingredient IDs remain sorted; the enforced first-acquisition contract is advisory key, automatic row, then ingredient.
- Added an actual preflight regression with two ingredients in reversed recipe order, asserting deterministic sorted coordination/preflight pairs.

### Commands
- `npm test -- tests/unit/stock/service.test.ts tests/unit/stock/order-consumption.test.ts tests/unit/actions/estoque.test.ts tests/unit/actions/estoque-shopping-list-reconciliation.test.ts`
  - Output: 4 test files passed, 60 tests passed.
- `npm run build`
  - Output: Next.js production build and TypeScript check passed.

## Ingredient removal shopping-list lifecycle follow-up
- Removal now acquires the canonical coordination lock, locks the ingredient, rechecks recipe/movement usage, and removes the automatic shopping-list row in the same transaction before either soft or hard deletion.
- Hard-delete and soft-delete regressions assert that the automatic persisted row is deleted, preventing stale copied TXT content and avoiding the non-cascading FK violation.

### Commands
- `npm test -- tests/unit/actions/estoque.test.ts tests/unit/actions/estoque-shopping-list-reconciliation.test.ts tests/unit/stock/service.test.ts tests/unit/stock/order-consumption.test.ts`
  - Output: 4 test files passed, 61 tests passed.
- `npm run build`
  - Output: Next.js production build and TypeScript check passed.
