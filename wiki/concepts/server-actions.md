---
title: Server Actions
type: concept
updated: 2026-06-20
tags: [next.js, mutations, server-actions, api]
---

# Server Actions

## Definição

Funções assíncronas que rodam no servidor, chamadas diretamente de Client ou Server Components sem precisar criar um endpoint de API separado. Marcadas com `'use server'`.

## Sintaxe

```typescript
// app/actions.ts
'use server'

export async function criarPedido(data: FormData) {
  const mesa = data.get('mesa')
  // lógica de banco de dados aqui
  revalidatePath('/dashboard')
}

// Em um Client Component
'use client'
import { criarPedido } from './actions'

export function FormPedido() {
  return (
    <form action={criarPedido}>
      <input name="mesa" />
      <button type="submit">Criar pedido</button>
    </form>
  )
}
```

## Por que substitui GraphQL/REST para mutações

No [[pizzaql]] original, mutations eram:
1. Definir tipo no Nexus (`server/src/schema.ts`)
2. Definir resolver
3. Escrever mutation GraphQL no cliente (`lib/graphql/mutations.ts`)
4. Chamar com Apollo Client

Com Server Actions:
1. Escrever função com `'use server'`
2. Chamar diretamente do componente

**Redução de ~80% do boilerplate para mutações.**

## Casos de uso no projeto de pizzaria

```typescript
'use server'

// Garçom adiciona item ao pedido
export async function adicionarItem(pedidoId: string, itemId: string, quantidade: number) { ... }

// Garçom envia pedido para cozinha
export async function enviarPedido(pedidoId: string) { ... }

// Cozinha atualiza status
export async function atualizarStatus(pedidoId: string, status: 'em_preparo' | 'pronto' | 'entregue') { ... }
```

## Trade-offs

| Prós | Contras |
|------|---------|
| Zero boilerplate de API | Só funciona com Next.js |
| Type-safety end-to-end | Não reutilizável por outros clientes |
| Progressively enhanced (funciona sem JS) | Debugging menos visual que REST/GraphQL |
| Integra com `revalidatePath`/`revalidateTag` | |

## Relações

- Parte de: [[nextjs]], [[app-router]]
- Substitui: [[nexus-prisma-graphql]] (para mutações)

## Fontes

- [[nextjs-docs-index]]
