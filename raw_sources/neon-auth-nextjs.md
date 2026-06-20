<!-- RAW SOURCE — NÃO EDITAR. Capturado em 2026-06-20 -->
<!-- URL: https://neon.com/docs/auth/quick-start/nextjs-api-only -->

# Neon Auth with Next.js (API Methods)

## Overview

Integration guide for Neon Auth into a Next.js App Router project using direct SDK methods ("build your own auth UI using SDK methods") rather than pre-built UI components.

## Step-by-Step Setup

### 1. Enable Auth in Neon Project

Access Neon console: Project → Branch → Auth → Configuration → retrieve Auth URL.

### 2. Install the Neon SDK

```bash
npm install @neondatabase/auth@latest
```

### 3. Configure Environment Variables

Create `.env.local`:
```
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=your-secret-at-least-32-characters-long
```

Generate secret: `openssl rand -base64 32`

### 4. Create Server Auth Instance (`lib/auth/server.ts`)

```typescript
import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
```

### 5. Set Up API Route Handler (`app/api/auth/[...path]/route.ts`)

```typescript
import { auth } from '@/lib/auth/server';
export const { GET, POST } = auth.handler();
```

### 6. Configure Middleware (`proxy.ts` or `middleware.ts`)

```typescript
import { auth } from '@/lib/auth/server';

export default auth.middleware({
  loginUrl: '/auth/sign-in',
});

export const config = {
  matcher: ['/account/:path*'],
};
```

### 7. Create Client Auth Instance (`lib/auth/client.ts`)

```typescript
'use client';
import { createAuthClient } from '@neondatabase/auth/next';
export const authClient = createAuthClient();
```

### 8. Sign-Up Page

Uses `auth.signUp.email()` — via Server Action.

### 9. Sign-In Page

Uses `auth.signIn.email()` — via Server Action.

### 10. Home Page (`app/page.tsx`)

```typescript
const session = await auth.getSession();
// session.user disponível se autenticado
```

### 11. Run Development Server

```bash
npm run dev
```

## Key API Methods

- `auth.signUp.email({ name, email, password })` — servidor
- `auth.signIn.email({ email, password })` — servidor
- `auth.getSession()` — servidor (retorna user session)
- `auth.signOut()` — servidor
- `authClient.*` — equivalentes para client components
- `auth.handler()` — cria GET/POST handlers para `/api/auth/[...path]`
- `auth.middleware({ loginUrl })` — protege rotas

## Regra de uso

> "Use `authClient` for client components and `auth` for server components, server actions, and API routes."

## Additional Resources

- Next.js Server SDK reference
- Troubleshooting guides
- Email verification setup
- Example applications: neon-js repository
