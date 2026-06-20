---
title: Neon
type: entity
updated: 2026-06-20
tags: [database, postgresql, auth, serverless]
---

# Neon

## O que é

Plataforma de PostgreSQL serverless com branching, autoscale e Auth integrado. Escolhido como banco de dados do projeto de pizzaria no lugar do Supabase.

## Produtos relevantes

| Produto | Descrição |
|---------|-----------|
| Neon DB | PostgreSQL serverless com branching e autoscale |
| Neon Auth | Auth built-in via `@neondatabase/auth`, powered by Stack Auth |

## Por que Neon e não Supabase

- Preferência explícita do usuário
- Auth nativo integrado ao DB (não precisa de serviço separado)
- PostgreSQL puro — sem vendor lock-in em realtime/storage proprietário
- Free tier generoso

## Neon Auth — setup resumido

```typescript
// lib/auth/server.ts
import { createNeonAuth } from '@neondatabase/auth/next/server'
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
})

// lib/auth/client.ts
'use client'
import { createAuthClient } from '@neondatabase/auth/next'
export const authClient = createAuthClient()
```

Ver [[neon-auth]] para detalhe completo.

## Implicação arquitetural

Neon **não tem Realtime nativo** (diferente de Supabase). Para o display da cozinha em tempo real, usar **SSE via Route Handler** do [[nextjs]].

## Relações

- Substitui: Supabase (descartado em brainstorming)
- Usado com: [[nextjs]], [[app-router]], [[server-actions]]
- Conceito: [[neon-auth]]

## Fontes

- [[neon-auth-nextjs]]
