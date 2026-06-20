---
title: GraphQL Code-First com Nexus + Prisma
type: concept
updated: 2026-06-20
tags: [graphql, nexus, prisma, postgresql, api, code-first]
---

# GraphQL Code-First com Nexus + Prisma

## Definição

Abordagem onde o schema GraphQL é gerado automaticamente a partir de definições TypeScript (Nexus) integradas com o schema Prisma. O arquivo `schema.graphql` nunca é editado à mão — é output do Nexus.

## Como funciona no PizzaQL

```
server/src/schema.ts   ← você escreve aqui (TypeScript + Nexus)
        ↓ gera automaticamente
server/schema.graphql  ← não editar
server/src/generated/nexus.ts  ← tipos gerados
```

**Definição de tipo (Nexus):**
```typescript
const Order = objectType({
  name: 'Order',
  definition(t) {
    t.id('id');
    t.dateTime('createdAt');
    t.string('name');
    t.nullable.string('company');  // campo opcional
    t.float('total');
  }
});
```

**CRUD automático via nexusPrisma:**
```typescript
const Mutation = objectType({
  name: 'Mutation',
  definition(t) {
    t.crud.createOneOrder({alias: 'createOrder'});
    t.crud.deleteOneOrder({alias: 'deleteOrder'});
  }
});
```

## Schema Prisma correspondente

```prisma
model Order {
  id        Int      @default(autoincrement()) @id
  createdAt DateTime @default(now())
  name      String
  company   String?  // nullable
  total     Float
}
```

## Trade-offs

| Prós | Contras |
|------|---------|
| Schema sempre em sync com DB (Prisma) | nexus-plugin-prisma marcado como experimental |
| TypeScript end-to-end: DB → API → client | Curva de aprendizado do Nexus |
| CRUD ops automáticas com `t.crud.*` | Schema gerado pode ser verboso |
| Sem SDL manual para manter | Vendor lock-in no padrão Nexus |

## Deployment

- Servidor GraphQL (Nexus) → Vercel (serverless)
- PostgreSQL → Digital Ocean

## Relações

- Implementado em: [[pizzaql]]
- Alternativas: Hasura (usado no pizzaql original), Pothos, TypeGraphQL

## Fontes

- [[pizzaql-next-repo]]
