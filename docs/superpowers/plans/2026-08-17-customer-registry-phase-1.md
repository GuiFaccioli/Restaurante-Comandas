# Customer Registry Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first visible vertical slice for tenant-scoped customer management: create, search, edit, inactivate, and manage a required default address plus optional additional addresses.

**Architecture:** Keep this slice independent from DELIVERY order creation. Add customer/address persistence and server-authorized actions first, then expose a cashier/admin page using existing application patterns. Delivery-order channel changes, snapshots, kitchen labeling, and order lifecycle remain a separate next slice.

**Tech Stack:** Next.js App Router, React Server/Client Components, Server Actions, Drizzle ORM, Neon PostgreSQL, Vitest.

## Global Constraints

- Tenant isolation is server-derived through the authenticated access context.
- Phone is unique per tenant after normalization.
- Street and number are required; neighborhood, city, CEP, complement and reference are optional.
- One active default address is required per customer; additional active addresses are allowed.
- Delivery fee default accepts zero.
- Admin and cashier can manage customers.
- Inactivation is logical; historical records are not physically deleted.
- Do not implement DELIVERY order creation in this phase.
- Follow TDD: write a failing test, verify RED, implement minimally, verify GREEN.
- Do not add payment integration or gateway behavior.

---

### Task 1: Define customer/address domain contract and failing tests

**Files:**
- Create: `lib/customer/validation.ts`
- Test: `tests/unit/customer/validation.test.ts`

**Interfaces:**
- Produces validation functions for customer input, address input, phone normalization, and delivery-fee normalization.

- [ ] Write failing tests for required name/phone, required street/number, optional address fields, zero fee, and normalized phone equality.
- [ ] Run `npm test -- --run tests/unit/customer/validation.test.ts` and verify the tests fail because the module is absent.
- [ ] Implement the smallest pure validation/normalization functions with no database dependency.
- [ ] Run the focused test again and verify it passes.

### Task 2: Add tenant-scoped customer and address persistence

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `db/migrations/<timestamp>_add_clientes.sql`
- Test: `tests/unit/db/customer-schema.test.ts` or the existing database integration test location, following repository conventions.

**Interfaces:**
- Produces Drizzle tables/types for customers and addresses, including tenant-scoped foreign keys and the default-address invariant.

- [ ] Write failing schema/integration assertions for tenant-scoped phone uniqueness and one active default address per customer.
- [ ] Run the focused test and verify RED.
- [ ] Add the tables, constraints, and indexes without changing existing order/attendance tables in this phase.
- [ ] Add a migration that is additive and safe for existing salon data.
- [ ] Run the focused test and verify GREEN.

### Task 3: Implement server-side customer queries and actions

**Files:**
- Create: `lib/customer/queries.ts`
- Create: `lib/actions/clientes.ts`
- Test: `tests/unit/actions/clientes.test.ts`

**Interfaces:**
- `buscarClientes(query, pagination)` searches phone, name, and address within the current tenant.
- `criarCliente(input)` creates the customer and required default address atomically.
- `editarCliente(input)` updates customer/address data with tenant validation.
- `inativarCliente(id)` and `reativarCliente(id)` change active state without deletion.
- Address operations enforce one active default address.

- [ ] Write failing tests for authorization, tenant isolation, duplicate normalized phone, required default address, edit, inactivation, reactivation, and address search.
- [ ] Run `npm test -- --run tests/unit/actions/clientes.test.ts` and verify RED.
- [ ] Implement actions using existing `requireAccess` and transaction conventions.
- [ ] Keep search paginated/server-side; do not load the entire customer table into the browser.
- [ ] Run focused tests and verify GREEN.

### Task 4: Build the first visible admin/cashier customer screen

**Files:**
- Create or modify: the existing admin/customer route selected from current navigation conventions, likely `app/admin/clientes/page.tsx`.
- Create: the route-specific Client Component only where interaction requires it.
- Test: route/component tests following existing frontend test conventions.

**Interfaces:**
- Consumes the customer query/action contracts from Task 3.
- Produces searchable customer list, create/edit form, address management, fee field, active/inactive state, and clear loading/error/empty states.

- [ ] Write failing UI tests for search, create form validation, duplicate-phone feedback, address fields, zero fee, edit, and inactivation.
- [ ] Run focused UI tests and verify RED.
- [ ] Implement the smallest visual slice using existing design-system components and copy conventions.
- [ ] Keep the first view intentionally focused; do not add delivery-order creation yet.
- [ ] Run focused UI tests and verify GREEN.

### Task 5: Verify the vertical slice and prepare the next slice

**Files:**
- Modify only tests or documentation if verification exposes a concrete issue.

- [ ] Run the customer unit/action/UI tests.
- [ ] Run the full test suite.
- [ ] Run `npx tsc --noEmit` and distinguish new errors from the repository baseline.
- [ ] Run the local app and visually inspect the admin/cashier customer screen.
- [ ] Verify no changes were made to existing salon order behavior.
- [ ] Record the next slice separately: DELIVERY order creation, snapshots, cashier integration, and kitchen tag/color.

## Scope boundary

This plan does not implement:

- DELIVERY order creation;
- nullable `mesa_id` on orders/attendance;
- delivery snapshots;
- kitchen DELIVERY tag/color;
- delivery cancellation/reopening;
- payment changes;
- reports changes.

Those belong to the next approved vertical slice after this customer screen is visually reviewed.
