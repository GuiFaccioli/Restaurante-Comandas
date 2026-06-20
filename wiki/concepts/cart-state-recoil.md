---
title: Cart State com Recoil
type: concept
updated: 2026-06-20
tags: [recoil, state-management, cart, react]
---

# Cart State com Recoil

## Definição

Padrão de gerenciamento de carrinho usando um único atom Recoil. Evita Redux/Context para estado de UI que não precisa de persistência no servidor.

## Implementação no PizzaQL

```typescript
// lib/recoil-atoms.ts
export interface CartState {
  items: Array<{name: string; type: string; price: number; quantity: number}>;
  total: number;
}

export const _cart = atom<CartState>({
  key: 'theme',    // ⚠️ key errada no original — deveria ser 'cart'
  default: { items: [], total: 0 }
});
```

**Nota:** o `key: 'theme'` no código original parece ser um bug/typo — a convenção Recoil é que a key identifique o atom.

## Padrão de update (merge de items)

```typescript
// adicionar ao cart
setCart(previous => ({
  items: merge(previous.items, {name, type, price, quantity: 1}),
  total: previous.total + price
}));

// remover uma unidade
setCart(previous => ({
  items: previous.items.filter(e => e.name !== item.name || e.type !== item.type),
  total: previous.total - item.price
}));
```

A função `merge` (em `utils/merge.ts`) agrega quantidades de items iguais em vez de duplicar.

## Trade-offs

| Prós | Contras |
|------|---------|
| Simples, sem boilerplate Redux | State perdido ao recarregar (sem persistência) |
| TypeScript nativo com atom tipado | Key do atom errada no original (bug) |
| Fácil de testar e serializar | Sem middleware para side-effects |

## Relações

- Implementado em: [[pizzaql]]
- Alternativas: Redux Toolkit, Zustand, Context API

## Fontes

- [[pizzaql-next-repo]]
