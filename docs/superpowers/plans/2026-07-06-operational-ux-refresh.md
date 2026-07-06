# Operational UX Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the phone/table/cashier operation with safe login remembering, clear button semantics, automatic refreshes, waiter table order monitoring, and a usable cashier order-detail/payment flow.

**Architecture:** Keep Server Components for initial data and add focused Client Components for local interaction. Use Server Actions for mutations, SSE where already available, and small JSON endpoints plus safe polling for screens that need 5-second freshness without destroying local UI state. Keep payment external-only and tenant-scoped.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM, Server Actions, SSE, Vitest, Tailwind/shadcn-style components.

## Global Constraints

- Positive actions use green styling: add, confirm, advance, accept, register payment.
- Negative/destructive actions use red styling: cancel, leave, close without saving, reject.
- Login may remember only the last email locally.
- Never store raw passwords in localStorage/sessionStorage or custom client memory.
- Operational screens must update automatically through SSE and/or safe 5-second refresh loops.
- Refresh loops must not reset a user's in-progress cart, open drawer, modal, or partially filled form.
- Caixa must show table, order, items, status, total, and payment action.
- Use TDD: focused failing test first, then implementation.
- Use conventional commits only, with no AI attribution.

---

## File Map

- `app/auth/sign-in/page.tsx` — server page shell for login.
- `app/auth/sign-in/client.tsx` — client login form with remembered email and password autocomplete.
- `components/ui/button.tsx` — button variants for success/destructive/neutral actions if needed.
- `app/garcom/mesa/[id]/page.tsx` — table page initial data for menu and current table orders.
- `app/garcom/mesa/[id]/client.tsx` — table cockpit UI, back navigation, current table orders, cart preservation.
- `app/api/garcom/mesa/[id]/pedidos/route.ts` — lightweight current-table order polling endpoint.
- `components/garcom/table-orders-panel.tsx` — reusable current-table order monitor.
- `app/admin/pedidos/page.tsx` — cashier initial data with totals/payment status.
- `app/admin/pedidos/client.tsx` — cashier cards/detail expansion/payment action.
- `app/api/caixa/pedidos/route.ts` — cashier polling endpoint.
- `lib/orders/totals.ts` — shared order total calculation.
- `lib/orders/queries.ts` — tenant-scoped order query helpers for pages and endpoints.
- `docs/OPERATIONS.md` — operational refresh and mobile-no-F5 rule.
- `wiki/meta/changelog.md` and `README.md` — short documentation updates.

---

### Task 1: Login remembered email without password storage

**Files:**
- Create: `app/auth/sign-in/client.tsx`
- Modify: `app/auth/sign-in/page.tsx`
- Create: `tests/unit/auth/remember-login.test.ts`

**Interfaces:**
- Consumes: `signIn(data: FormData | { email: string; password: string }): Promise<void>`
- Produces: `SignInClientForm`
- Storage key: `restaurante:last-login-email`

- [ ] Write a failing source-level test asserting the login client stores only `restaurante:last-login-email`, uses `autoComplete="email"` and `autoComplete="current-password"`, and does not store password.
- [ ] Run `npm test -- tests/unit/auth/remember-login.test.ts`; expect RED because the client file does not exist.
- [ ] Implement `app/auth/sign-in/client.tsx` with `useEffect` to prefill email from localStorage and submit handler that saves email only.
- [ ] Update `app/auth/sign-in/page.tsx` to render `SignInClientForm`.
- [ ] Run focused test; expect GREEN.
- [ ] Commit `feat: remember login email safely`.

### Task 2: Button action semantics

**Files:**
- Modify: `components/ui/button.tsx`
- Modify: `components/garcom/cart-drawer.tsx`
- Modify: `components/garcom/cart-fab.tsx`
- Modify: `components/garcom/pending-deliveries-client.tsx`
- Modify: `components/cozinha/pedido-card.tsx`
- Modify: `app/admin/pedidos/client.tsx`
- Create: `tests/unit/design/button-semantics.test.ts`

**Interfaces:**
- Produces button variants/classes:
  - `success` for green positive actions.
  - `destructive` for red negative actions.
  - existing neutral/default variants remain available.

- [ ] Write a failing source-level test checking key action labels use `variant="success"` or green class and cancel/exit labels use destructive/red style.
- [ ] Run `npm test -- tests/unit/design/button-semantics.test.ts`; expect RED.
- [ ] Add `success` button variant if missing.
- [ ] Update add/confirm/register buttons to success styling.
- [ ] Update cancel/exit/close-without-save buttons to destructive styling where those actions exist.
- [ ] Run focused test; expect GREEN.
- [ ] Commit `style: clarify operational button actions`.

### Task 3: Current-table order monitor for waiter table screen

**Files:**
- Create: `lib/orders/totals.ts`
- Create: `lib/orders/queries.ts`
- Modify: `app/garcom/mesa/[id]/page.tsx`
- Modify: `app/garcom/mesa/[id]/client.tsx`
- Create: `components/garcom/table-orders-panel.tsx`
- Create: `app/api/garcom/mesa/[id]/pedidos/route.ts`
- Create/Modify: `tests/unit/routing/waiter-entry.test.ts`
- Create: `tests/unit/business/table-orders-panel.test.ts`

**Interfaces:**
- Produces: `getTenantMesaOrders(input: { tenantId: string; mesaId: string }): Promise<TableOrder[]>`
- Produces: `calculateOrderTotal(items: Array<{ quantidade: number; precoUnitario: string }>): number`
- Produces: `TableOrdersPanel`
- Polling interval: 5000ms.

- [ ] Write failing tests proving the waiter table page has a "Voltar para mesas" link and renders a current-table order section.
- [ ] Write failing tests for `calculateOrderTotal`.
- [ ] Run focused tests; expect RED.
- [ ] Implement `lib/orders/totals.ts`.
- [ ] Implement tenant-scoped order query helper.
- [ ] Pass current table orders into `MesaPageClient`.
- [ ] Add `TableOrdersPanel` with "Ver itens" and "Confirmar entrega" for pending orders.
- [ ] Add the polling endpoint for table orders.
- [ ] Add client polling that merges order list updates without touching cart state.
- [ ] Run focused tests; expect GREEN.
- [ ] Commit `feat: monitor table orders for waiters`.

### Task 4: Cashier order detail and external payment UX

**Files:**
- Modify: `lib/orders/queries.ts`
- Modify: `app/admin/pedidos/page.tsx`
- Modify: `app/admin/pedidos/client.tsx`
- Create: `app/api/caixa/pedidos/route.ts`
- Modify/Create: `tests/unit/business/admin-management.test.ts`
- Create: `tests/unit/business/cashier-orders.test.ts`

**Interfaces:**
- Produces: `getCashierOrders(input: { tenantId: string }): Promise<CashierOrder[]>`
- `CashierOrder` includes `id`, `mesaNumero`, `status`, `criadoEm`, `entregueEm`, `itens`, `total`, `pagamentoStatus`.
- Consumes: `registrarPagamentoPedido`.

- [ ] Write failing tests proving cashier orders include item details, line totals, order total, table number, status, and payment status.
- [ ] Run focused cashier tests; expect RED.
- [ ] Implement cashier query helper with tenant scope and totals.
- [ ] Redesign `AdminPedidosLive` into cards with expandable details.
- [ ] Add green "Registrar pagamento" action for delivered unpaid orders.
- [ ] Add 5-second polling endpoint/client merge that does not close an expanded card or payment form.
- [ ] Run focused tests; expect GREEN.
- [ ] Commit `feat: improve cashier order payment view`.

### Task 5: Operational auto-refresh documentation and final verification

**Files:**
- Create: `docs/OPERATIONS.md`
- Modify: `README.md`
- Modify: `wiki/meta/changelog.md`
- Modify: `docs/superpowers/specs/2026-07-06-operational-ux-refresh-design.md` if implementation details differ.

**Interfaces:**
- Produces documentation stating operational mobile screens must not require F5.

- [ ] Document the refresh rule: live operational screens use SSE and/or safe 5-second polling.
- [ ] Document that polling must not wipe cart, open drawers, modals, or forms.
- [ ] Document login remembering: email only, browser password manager for senha.
- [ ] Run `npm test -- --maxWorkers=1`; expect all tests pass.
- [ ] Run `npm run build`; expect build pass.
- [ ] Run `npm audit --json`; record current remaining vulnerability count without unsafe downgrades.
- [ ] Commit `docs: document operational refresh rules`.
- [ ] Push to `origin/main`.

## Self-Review

- Spec coverage: login remembering, button colors, table navigation, table order monitor, safe refresh, cashier details/payment, and documentation all map to tasks.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: `TableOrder`, `CashierOrder`, `calculateOrderTotal`, `getTenantMesaOrders`, and `getCashierOrders` are introduced before use.
