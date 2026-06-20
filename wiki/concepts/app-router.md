---
title: App Router (Next.js)
type: concept
updated: 2026-06-20
tags: [next.js, routing, server-components, app-router]
---

# App Router

## Definição

Sistema de roteamento do [[nextjs]] baseado em sistema de arquivos, localizado em `app/`. Suporta Server Components por padrão, layouts aninhados, streaming e Server Actions.

## Convenções de arquivo

| Arquivo | Função |
|---------|--------|
| `layout.js` | Layout compartilhado entre rotas filhas |
| `page.js` | UI da rota (torna o segmento acessível) |
| `loading.js` | UI de loading com React Suspense |
| `error.js` | Boundary de erro |
| `not-found.js` | UI de 404 |
| `route.js` | Route Handler (endpoint de API/SSE) |
| `template.js` | Como layout, mas re-renderiza em navegação |

## Segmentos dinâmicos

```
app/
  mesa/
    [id]/         # Dynamic segment: params.id
      page.tsx
  pedidos/
    [...slug]/    # Catch-all segment
```

## Componentes: Server vs Client

- **Por padrão**: todos os componentes no App Router são Server Components
- **`'use client'`**: marca o boundary — o componente e filhos rodam no browser
- Server Components podem importar Client Components, mas não o contrário

## Layouts aninhados

```
app/
  layout.tsx          # Root layout (html, body)
  page.tsx            # Homepage
  dashboard/
    layout.tsx        # Layout do dashboard
    page.tsx          # /dashboard
    pedidos/
      page.tsx        # /dashboard/pedidos
```

## Relevância no projeto

Estrutura provável do sistema de pizzaria:
```
app/
  (garcom)/           # Route group — app do garçom
    mesa/[id]/
    pedido/
  (cozinha)/          # Route group — display da cozinha
    dashboard/
  api/
    events/           # Route Handler para SSE (real-time)
```

## Trade-offs vs Pages Router

| App Router | Pages Router |
|-----------|-------------|
| Server Components | Somente Client |
| Server Actions (mutations) | API Routes obrigatórias |
| Layouts aninhados nativos | _app.tsx único |
| Streaming/Suspense | Sem suporte nativo |
| React canary | React estável |

## Relações

- Parte de: [[nextjs]]
- Habilita: [[server-components]], [[server-actions]]

## Fontes

- [[nextjs-docs-index]]
