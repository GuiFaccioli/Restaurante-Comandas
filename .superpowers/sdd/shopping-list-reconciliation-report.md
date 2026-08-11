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
