# Delivery Order from Customer Wallet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admin/cashier to start a DELIVERY order from a customer record while reusing the existing product and cart flow.

**Architecture:** Keep the customer registry as the entry point, carry a delivery context into the existing order composer, and persist the order plus its one-to-one DELIVERY attendance atomically. SALAO behavior remains unchanged. The server derives tenant and user access and snapshots customer/address/fee data at confirmation time.

**Tech Stack:** Next.js App Router, React Server/Client Components, Server Actions, Drizzle ORM, Neon PostgreSQL, Vitest.

## Global Constraints

- DELIVERY has `mesa_id = NULL`; SALAO continues requiring a table.
- DELIVERY requires an active customer, address, and applied delivery fee snapshot.
- The default fee is loaded from the customer and may be edited until preparation starts.
- The order snapshot must preserve customer name, phone, address, and applied fee.
- Admin and cashier may create DELIVERY orders.
- Existing order statuses and kitchen card are reused; kitchen shows only the DELIVERY tag and color difference.
- Payments remain external and are only recorded manually by the existing cashier flow.
- Existing salon order creation and historical orders must continue working unchanged.
- Every production behavior change follows RED → GREEN → REFACTOR.
- No unrelated refactor, integration, or deployment configuration change.

---

### Task 1: Define the DELIVERY order contract and failing tests

**Files:**
- Modify: `lib/db/schema.ts`
- Test: `tests/unit/business/order-flow.test.ts`
- Test: `tests/unit/actions/pedidos.test.ts`

**Interfaces:**
- DELIVERY confirmation accepts customer, address, and fee context without a table.
- SALAO confirmation keeps its current table and attendance requirements.

- [ ] Write failing tests for DELIVERY confirmation without `mesaId`, missing customer/address/fee rejection, and unchanged SALAO validation.
- [ ] Run the focused tests and verify RED for the new behavior.
- [ ] Define the smallest typed input/result contract shared by action and UI.
- [ ] Run the focused tests again before continuing.

### Task 2: Add additive DELIVERY persistence

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `db/migrations/<timestamp>_add_delivery_order_snapshots.sql`
- Test: `tests/unit/db/delivery-schema.test.ts`

**Interfaces:**
- `pedido` stores channel, nullable table, customer reference, address snapshot, customer snapshot, and applied fee snapshot.
- DELIVERY attendance is one-to-one with its order and has no table.

- [ ] Add schema assertions for nullable `mesa_id`, DELIVERY channel, required snapshot fields, and tenant-scoped references.
- [ ] Run the schema test and verify RED.
- [ ] Add the minimum additive columns/constraints and indexes needed for DELIVERY.
- [ ] Keep legacy SALAO rows valid and do not rewrite historical data.
- [ ] Run the schema test and verify GREEN.

### Task 3: Implement the transactional DELIVERY creation path

**Files:**
- Modify: `lib/actions/pedidos.ts`
- Modify: `lib/stock/order-consumption.ts`
- Modify: `lib/actions/atendimentos.ts`
- Test: `tests/unit/actions/pedidos.test.ts`

**Interfaces:**
- A single authorized action creates the DELIVERY attendance and order atomically.
- The transaction validates tenant ownership and active customer/address, reads the current default fee when no override is supplied, and persists immutable snapshots.

- [ ] Add failing tests for successful DELIVERY creation, tenant isolation, inactive customer/address rejection, fee override, zero fee, and rollback.
- [ ] Run the focused tests and verify RED.
- [ ] Implement the transaction without changing operation order for SALAO.
- [ ] Preserve stock consumption and order confirmation measurement behavior.
- [ ] Run focused backend tests and verify GREEN.

### Task 4: Start the existing composer from the customer registry

**Files:**
- Modify: `components/admin/customer-registry.tsx`
- Create or modify: `app/garcom/mesa/[id]/client.tsx` only if the existing composer can accept a delivery context there
- Modify: `components/garcom/menu-grid.tsx`
- Modify: `components/garcom/cart-drawer.tsx`
- Test: `tests/unit/business/customer-registry.test.ts`
- Test: `tests/unit/business/order-flow.test.ts`

**Interfaces:**
- Customer card exposes `Novo pedido` for admin/cashier.
- Existing product selection and cart UI receives a DELIVERY context instead of a table context.
- The review step displays customer, selected address, default/editable fee, and total before confirmation.

- [ ] Add failing UI tests for the customer entry action, delivery context, fee display/editing, and no-table state.
- [ ] Run focused UI tests and verify RED.
- [ ] Add the smallest routing/state bridge that reuses the existing composer.
- [ ] Keep SALAO navigation and table entry unchanged.
- [ ] Run focused UI tests and verify GREEN.

### Task 5: Kitchen and operational regression coverage

**Files:**
- Modify: `components/cozinha/pedido-card.tsx`
- Modify: `app/api/cozinha/pedidos/route.ts`
- Test: `tests/unit/business/kitchen-order-card.test.ts`
- Test: `tests/unit/actions/pedidos.test.ts`

**Interfaces:**
- DELIVERY orders use existing kitchen status flow and render the existing card with a visual distinction and `DELIVERY` tag only.
- Address, price, and delivery fee are not rendered on the kitchen card.

- [ ] Add failing tests for DELIVERY tag/color and absence of address/price/fee.
- [ ] Run focused tests and verify RED.
- [ ] Implement the minimal card/API projection changes.
- [ ] Run focused tests and verify GREEN.

### Task 6: Verification and production rollout report

**Files:**
- No application files unless verification reveals a regression.

- [ ] Run all focused tests for customer, order, kitchen, and stock confirmation.
- [ ] Run `npm run build`.
- [ ] Run `npx tsc --noEmit` and distinguish baseline diagnostics from new diagnostics.
- [ ] Validate the production database migration against `App-Comandas-Prod / comandas_staging` before applying it.
- [ ] Report changed files, tests, migration status, and whether a deployment is required.
