---
title: Neon Auth
type: concept
updated: 2026-06-20
tags: [auth, neon, next.js, session]
---

# Neon Auth

## Definição

Sistema de autenticação integrado ao [[neon]], acessado via `@neondatabase/auth`. Usa modelo de dois clientes: `auth` (servidor) e `authClient` (browser). Suporta email/senha e proteção de rotas via middleware.

## Arquivos necessários

```
lib/
  auth/
    server.ts     ← instância servidor (createNeonAuth)
    client.ts     ← instância browser (createAuthClient)
app/
  api/
    auth/
      [...path]/
        route.ts  ← proxy handler (auth.handler())
proxy.ts          ← middleware de proteção de rotas
```

## Padrão de uso

**Servidor (Server Components, Server Actions, Route Handlers):**
```typescript
import { auth } from '@/lib/auth/server'

// Obter sessão
const session = await auth.getSession()

// Sign-in (Server Action)
await auth.signIn.email({ email, password })

// Sign-up (Server Action)
await auth.signUp.email({ name, email, password })

// Sign-out
await auth.signOut()
```

**Client Components:**
```typescript
import { authClient } from '@/lib/auth/client'
// métodos equivalentes via authClient.*
```

## Variáveis de ambiente

```bash
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=<openssl rand -base64 32>
```

## Proteção de rotas

```typescript
// proxy.ts
import { auth } from '@/lib/auth/server'

export default auth.middleware({ loginUrl: '/auth/sign-in' })

export const config = {
  matcher: ['/dashboard/:path*', '/garcom/:path*']
}
```

## Relevância no projeto de pizzaria

- Garçom precisa de login para acessar app de pedidos
- Cozinha pode ter acesso sem login (display público interno) ou com login separado
- Não há clientes finais autenticados (pedidos sem conta)

## Trade-offs

| Prós | Contras |
|------|---------|
| Integrado ao Neon DB (menos serviços) | Menos maduro que Auth.js ou Clerk |
| Sem vendor lock-in extra | Docs ainda enxutas |
| API simples e direta | Powered by Stack Auth (dependência indireta) |

## Relações

- Parte de: [[neon]]
- Usado com: [[nextjs]], [[server-actions]], [[app-router]]

## Fontes

- [[neon-auth-nextjs]]
