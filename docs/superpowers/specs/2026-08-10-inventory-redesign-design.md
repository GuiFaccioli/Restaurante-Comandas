# Inventory Redesign Design

## Goal

Make the staging inventory flow intuitive before launch by reducing it to three
sections: **Estoque**, **Ficha Técnica**, and **Lista de Compras**. The design
uses one inventory catalog as the source of truth for recipe consumption,
purchase suggestions, and waiter availability.

## Scope

- Consolidate the current separate `Insumos` and `Estoque` experiences into
  `Estoque`.
- Keep technical recipes connected directly to inventory items.
- Add a persistent active shopping list with automatic and manual entries.
- Enforce availability in the waiter menu and cart before a sale is confirmed.
- Refactor database structures and remove fictitious staging data when that
  makes the shipped model clearer.

## Information Architecture

The inventory area exposes exactly these tabs:

1. **Estoque** — register inventory items, see balances, and record movements.
2. **Ficha Técnica** — configure what each menu product consumes.
3. **Lista de Compras** — work through pending replenishments and ad hoc
   purchases.

`Insumos` is no longer a separate user-facing section. Existing internal names
may remain only where they do not leak into the UI or complicate the model.

## Estoque

Each inventory item has:

- name;
- measurement unit: kg, g, unidade, ml, or l;
- current balance;
- minimum balance;
- target (ideal) balance;
- purchase cost when costing needs it.

The inventory table displays current, minimum, and target amounts together and
visibly marks balances at or below minimum. Registration and stock operations
live in this same section, so staff do not need to decide whether an item is an
"ingredient" or a "stock item."

## Ficha Técnica and Consumption

Each menu product has a technical recipe made from one or more inventory items
and per-unit consumption quantities. Confirming a sale deducts those quantities
from inventory.

Ready-to-sell products use the same mechanism with a one-line recipe. For
example, a canned drink recipe contains `Refrigerante lata · 1 unidade`.

## Lista de Compras

### Automatic entries

When an inventory balance is at or below its minimum, the application creates
one active automatic entry for that item. Its suggested amount is calculated as:

`target balance - current balance`

This is a saved snapshot: it does not change while the entry is pending. There
cannot be more than one active automatic entry per inventory item.

When staff confirm a purchase, the suggested amount is prefilled but editable.
The confirmed received amount is added to inventory and the active list entry is
removed. The item is reassessed only as part of this explicit confirmation
flow; if it remains at or below minimum, a new pending replenishment can be
created.

### Manual entries

Staff can add a manual list entry with name, quantity, and selected measurement
unit. Confirming it removes it from the active list only; it does not create or
change an inventory record. Completed items do not need a user-facing purchase
history.

## Waiter Availability

The waiter menu calculates each product's maximum sellable quantity from its
recipe, the current balances, and quantities already in the current cart.

- Products that cannot be made remain visible but are clearly marked as
  unavailable.
- The `+` control permits exactly the available number of portions. If five
  portions are available, the fifth is allowed and the sixth is blocked.
- A blocked addition shows a one-second message naming the limiting inventory
  item, such as `Sem estoque: farinha`.
- The server revalidates availability atomically when the sale is committed.
  This is the integrity boundary that prevents concurrent waiters from creating
  negative balances.

## Data and Integrity

- Inventory items are tenant-scoped.
- Active shopping-list rows persist their automatic/manual kind, unit,
  suggested or requested quantity, and optional inventory-item reference.
- Purchase confirmation is atomic and idempotent: it records the stock entry
  and removes the matching active row once.
- Recipe changes and order consumption continue to use inventory item IDs,
  never UI labels.
- The implementation may replace obsolete staging schema and fictitious seed
  data; there are no production customers or real data to preserve.

## Validation and Tests

Cover at minimum:

- item registration and unit/amount validation;
- recipe consumption for composed and direct-sale products;
- automatic entry creation at `balance <= minimum` and single-active-row
  behavior;
- editable receipt quantities, atomic stock entry, and list removal;
- manual list completion without inventory mutation;
- waiter quantity caps across cart quantities;
- unavailable product messaging and server-side concurrent-sale protection.

## Out of Scope

- Purchase orders, suppliers, invoices, and user-facing completed-purchase
  history.
- Preserving obsolete fictitious staging records or UI labels.
