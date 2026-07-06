# Operational UX Refresh Design

## Goal

Make the restaurant operation usable on phones and cashier screens without manual refreshes, unclear navigation, or weak payment visibility.

## Approved Decisions

- Waiter table screens must have an obvious way back to the table list.
- Positive actions use green styling: add, confirm, advance, accept, register payment.
- Negative/destructive actions use red styling: cancel, leave, close without saving, reject.
- Login may remember the last email locally and use browser password autocomplete.
- The app must not store raw passwords in localStorage/sessionStorage or custom client memory.
- Operational screens must update automatically through SSE and/or safe 5-second refresh loops.
- Refresh loops must not reset a user's in-progress cart, open drawer, modal, or partially filled form.
- Caixa must show what the customer owes: table, order, items, status, total, and payment action.

## Problem Summary

The current implementation is technically progressing but still weak operationally:

- A waiter who opens a table does not have a clear path back to other tables.
- Button colors do not communicate action meaning consistently.
- Mobile users cannot rely on F5, so cross-screen state needs automatic updates.
- Delivered/pending order handling is split across screens and not visible enough inside the table context.
- The cashier order list does not yet behave like a real cashier view because it lacks clear order details, item totals, and payment affordances.

## UX Model

### Waiter table screen

The table screen should become a small operational cockpit:

- Header with:
  - "Mesa N"
  - "Voltar para mesas"
  - link/button to pending deliveries when relevant
- Product/menu area stays focused on adding items.
- Cart remains local and must not be reset by background refresh.
- Existing orders for the selected table appear in a compact section:
  - order status;
  - created time;
  - item summary;
  - "Confirmar entrega" when the order is still waiting for waiter confirmation;
  - "Ver itens" for detail expansion.

### Waiter pending deliveries

This remains the queue for all pending deliveries, but table pages should also show the subset for the current table. This avoids forcing the waiter to leave context to finish a table's order.

### Kitchen screen

Kitchen continues as a live operational board. Updates must arrive by SSE and should have a fallback refresh policy if SSE fails.

### Cashier screen

Cashier orders must be redesigned around money:

- List grouped or clearly labeled by table/order.
- Each order row/card shows:
  - table number;
  - order status;
  - created time;
  - delivered time when available;
  - total value;
  - payment status.
- Opening an order reveals:
  - every item;
  - quantity;
  - unit price;
  - line total;
  - observations;
  - overall total.
- Delivered unpaid orders show a green "Registrar pagamento" action.
- Payment registration records external payment only.

## Auto-Refresh Design

Use a layered strategy:

1. SSE for event-driven updates where already available.
2. A small reusable polling hook/component for screens that need freshness every 5 seconds.
3. Polling fetches fresh server-rendered data through Route Handlers or lightweight JSON endpoints.
4. Client state merges server updates into lists without replacing local editing state.

Rules:

- Never reset cart contents because of polling.
- Never close an open drawer/modal because of polling.
- Never overwrite a payment form while it is being edited.
- If a record disappears because it was paid/delivered elsewhere, show a small status message instead of a jarring full-page reset.

## Login Remembering

The login page should:

- render email/password inputs with correct autocomplete attributes;
- save only the last email when the user opts in or submits login;
- prefill email from localStorage/cookie-safe client storage;
- rely on the browser password manager for password remembering.

The app must not implement custom password persistence.

## Button Styling Rules

Add reusable variants or class conventions:

- Green: primary successful action.
- Red: destructive/cancel/exit action.
- Neutral: navigation, secondary links, view details.

Do not rely on color alone; labels must remain explicit.

## Documentation Requirement

Document that operational screens are mobile-first and must not depend on browser refresh. Any future screen that shows live orders, kitchen status, waiter deliveries, or cashier amounts must either subscribe to live events or poll safely.

## Testing Requirements

- Login remember-email test or source-level test.
- Button styling convention/source tests for key actions.
- Waiter table page exposes navigation back to tables.
- Table page includes current-table order monitoring.
- Cashier page exposes item details and totals.
- Payment action requires delivered order and caixa access.
- Refresh/polling utilities do not wipe local state in unit tests where practical.

## Out of Scope

- Saving raw passwords manually.
- Payment gateway processing.
- Full restaurant table-session model with multiple orders aggregated into one bill beyond showing order totals and payment records.
- Push notifications.
