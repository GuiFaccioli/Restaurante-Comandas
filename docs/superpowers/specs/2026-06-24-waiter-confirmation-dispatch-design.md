# Waiter Confirmation Dispatch

**Date:** 2026-06-24  
**Status:** Approved design direction

## Context

The pizza app already has a waiter ordering flow, kitchen dashboard, and admin orders page. The waiter can add items to a cart from `app/garcom/mesa/[id]`, and the cart currently calls `confirmarPedido` from `lib/actions/pedidos.ts`.

The product decision is that order-taking must stay local until the waiter explicitly confirms the order.

## Goal

Only confirmed waiter orders become official orders. A draft cart must not appear in the kitchen dashboard or admin order list.

## User Flow

1. The waiter opens a table.
2. The waiter adds products and observations to the local cart.
3. Nothing is created for kitchen/admin while the waiter is still editing the cart.
4. The waiter taps the final confirmation button.
5. The system creates the official order and order items.
6. The system emits the `novo_pedido` SSE event.
7. The kitchen dashboard shows the order.
8. The admin orders page includes the order.

## Design Decision

Use the existing local cart as the draft boundary. The cart is the only pre-confirmation state. The database and SSE are only touched by the confirmation action.

Recommended implementation:

- Keep cart state in `lib/store/cart.ts`.
- Use `components/garcom/cart-drawer.tsx` as the final confirmation UI.
- Make `confirmarPedido` the single officialization boundary.
- Ensure `notifyKitchen({ type: 'novo_pedido', ... })` is only called after the order and items are persisted.
- Avoid using old step-based flows (`criarPedido`, `adicionarItem`, `enviarPedido`) for the waiter cart flow if they can create ambiguity.

## UI Copy

Use clear confirmation language in the cart drawer:

- Primary button: `Confirmar pedido`
- Loading state: `Confirmando...`
- Error: `Não foi possível confirmar o pedido. Tente novamente.`

This avoids confusing "send" with an intermediate draft action.

## Data Flow

```text
Waiter cart
  -> local Zustand state only
  -> confirm button
  -> confirmarPedido(mesaId, items)
  -> insert pedido + item_pedido rows
  -> notifyKitchen(novo_pedido)
  -> kitchen/admin can see the order
```

## Testing Requirements

Cover the boundary explicitly:

- Adding items to the waiter cart does not create an official order.
- Confirming the cart creates one order with the selected items.
- Confirmation emits `novo_pedido`.
- The kitchen and admin views only list persisted confirmed orders.

## Scope

Included:

- Clarify waiter confirmation UX.
- Preserve local-only draft behavior.
- Ensure only confirmation dispatches to kitchen/admin.
- Add or adjust tests around the officialization boundary.

Excluded:

- Persistent draft orders.
- Multi-waiter collaboration on the same table.
- Payments, receipt printing, or analytics.
