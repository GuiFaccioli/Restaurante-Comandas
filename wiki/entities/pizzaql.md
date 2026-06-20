---
title: PizzaQL
type: entity
updated: 2026-06-20
tags: [projeto, referência, next.js, graphql, order-management]
---

# PizzaQL

## O que é

Sistema moderno de pedido e gerenciamento de pizzaria. Reescrita completa do PizzaQL original em TypeScript com Next.js. Status: **work in progress** — cart funcional, pagamentos e conexão com backend ainda não implementados.

- Repo: https://github.com/pizzaql/next
- Demo: https://pizzaql.vercel.app
- Stars: 65 | Branch principal: `master`

## Stack de tecnologia

| Camada | Tecnologia |
|--------|-----------|
| Frontend framework | Next.js 10 + React 17 |
| Componentes | Chakra UI (branch `next`) |
| State management | Recoil |
| GraphQL client | Apollo Client |
| Forms | react-hook-form |
| Animações | framer-motion |
| i18n | next-translate (en, pl) |
| PWA | next-offline (Workbox, NetworkFirst) |
| Imagens | next-optimized-images |
| API | Nexus (code-first GraphQL) + nexusPrisma |
| ORM | Prisma |
| Database | PostgreSQL |
| Hosting frontend | Vercel |
| Hosting DB | Digital Ocean |
| Pagamentos | Stripe (planejado, ❌ não implementado) |

## Roadmap (estado atual)

- [x] Cart funcional
- [ ] Stripe payments
- [ ] Delivery hours calculation (UI existe, lógica incompleta)
- [ ] Conexão com backend (mutations GraphQL criadas mas não conectadas)
- [ ] Performance optimizations

## Modelos de dados

**Order:**
```
id, createdAt, name, email, phone, company?, address, postal, city, floor?, time, notes?, payment, tip?, total
```

**Cart:**
```
id, name, type, price, quantity, orderId
```

## Padrões arquiteturais relevantes

- [[cart-state-recoil]] — estado do cart via atom Recoil, sem Redux
- [[nexus-prisma-graphql]] — schema GraphQL code-first, arquivo gerado automaticamente
- Dynamic imports para componentes pesados do Chakra (Drawer, AlertDialog, etc.)
- Delivery hours gating — botões de adicionar ao cart desabilitados fora do horário
- i18n com `Map` de ingredientes traduzidos em `lib/menu.ts`

## Contradições com versão atual do Next.js

⚠️ CONTRADIÇÃO: O brainstorming mencionou "Next.js 15" como stack recomendada, mas a versão atual documentada é **Next.js 16.2.9**. Usar 16.x no novo projeto.

## Relações

- Usa: [[claude-code]] (para desenvolvimento/análise)
- Padrões: [[cart-state-recoil]], [[nexus-prisma-graphql]]
- Substituído por: novo projeto com [[nextjs]] v16 + [[server-actions]]

## Fontes

- [[pizzaql-next-repo]]
