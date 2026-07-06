# Restaurante Comandas

Sistema de comandas para restaurante/pizzaria com fluxo de garçom, cozinha, administração, caixa e relatórios.

## Stack atual

- Next.js 16 App Router
- React 19
- Neon Postgres em produção via `@neondatabase/serverless`
- Drizzle ORM como fonte de verdade do schema
- SQLite local/teste via `better-sqlite3`
- Autenticação first-party com sessão HTTP-only
- Multi-tenant por `tenant` + `tenantUser` + `authSession.selectedTenantId`
- Server Actions para mutações
- SSE para atualização da cozinha
- Vitest para testes unitários

## Decisões importantes

- Neon DB fica como fundação do projeto.
- Neon Auth legado foi removido; auth agora é própria e tenant-aware.
- Prisma tooling foi removido; Drizzle é a fonte de verdade.
- `next-pwa` foi removido para eliminar a cadeia vulnerável Workbox/serialize-javascript.
- Caixa v1 registra pagamento externo; o app não processa gateway, PIX ou cartão.

## Comandos

```bash
npm install
npm run dev
npm test -- --maxWorkers=1
npm run build
npm audit
```

## Seed local

```bash
npm run db:seed
```

O seed cria um tenant local `Restaurante Dev`, usuários de teste e dados iniciais de mesas/cardápio.
