---
title: Next.js
type: entity
updated: 2026-06-20
tags: [framework, react, full-stack, vercel]
---

# Next.js

## O que é

Framework React full-stack da Vercel para construção de aplicações web. Gerencia bundling, compilação, roteamento, renderização e otimizações automaticamente.

**Versão atual: 16.2.9**

## Dois roteadores

| | App Router | Pages Router |
|---|---|---|
| Status | Recomendado (novo) | Suportado (legado) |
| React | Canary (React 19 + features) | Versão do package.json |
| Server Components | Sim | Não |
| Server Actions | Sim | Não |

## Conceitos-chave para o projeto

- [[app-router]] — roteamento baseado em sistema de arquivos
- [[server-components]] — componentes que rodam no servidor
- [[server-actions]] — mutations sem camada de API separada
- Route Handlers (`route.js`) — endpoints de API quando necessário (ex: SSE)
- `use client` / `use server` — diretivas para delimitar boundary cliente/servidor
- `use cache` — caching granular (novo na v15+)

## Diretivas disponíveis

```typescript
'use cache'          // caching automático
'use cache: private' // cache específico do usuário
'use cache: remote'  // cache compartilhado
'use client'         // componente roda no browser
'use server'         // server action / função server-side
```

## Relevância no projeto

Stack escolhida para o sistema de gestão de pizzaria (ver brainstorming). App Router + Server Actions substitui completamente o stack antigo do [[pizzaql]] (Nexus + Apollo Client).

## Guias nativos relevantes para o projeto

- PWAs — guia nativo disponível (sem need de next-pwa separado ❓ verificar)
- Internationalization
- Forms
- Authentication
- Streaming

## Links úteis

- Docs: https://nextjs.org/docs
- Docs para LLMs: https://nextjs.org/docs/llms.txt

## Relações

- Mantido por: Vercel
- Usado em: [[pizzaql]] (versão 10, antiga), novo projeto (v16)
- Relacionado com: [[app-router]], [[server-components]], [[server-actions]]

## Fontes

- [[nextjs-docs-index]]
