# Wiki Index

> Última atualização: 2026-07-06
> Total de páginas: 16

## Estado atual do projeto

Sistema de gestão de comandas para restaurante/pizzaria. A stack operacional atual é **Next.js 16 + Neon Postgres + Drizzle + autenticação first-party tenant-aware + SSE + Tailwind/Shadcn-style UI**.

Neon continua sendo a fundação do banco de produção. Neon Auth, Prisma tooling e next-pwa foram removidos como dependências ativas. O projeto agora caminha para multi-tenant real: um usuário pode pertencer a múltiplos restaurantes, a sessão guarda `selectedTenantId`, e as ações operacionais usam esse tenant para escopo de dados.

Caixa v1 registra pagamentos externos por pedido entregue; o app não processa pagamento real.
## SumÃƒÂ¡rio Executivo

Sistema de gestÃƒÂ£o de pedidos para pizzaria: garÃƒÂ§om (PWA mobile) Ã¢â€ â€™ cozinha (display PC). **Stack definida: Next.js 16 + Neon (DB + Auth) + Prisma + SSE + Shadcn/UI + Tailwind + Zustand + PWA.** Supabase descartado em favor do Neon. Real-time via SSE (Route Handler) jÃƒÂ¡ que Neon nÃƒÂ£o tem Realtime nativo. PizzaQL ÃƒÂ© referÃƒÂªncia arquitetural com stack completamente atualizada.

## Entidades

| Entidade | DescriÃƒÂ§ÃƒÂ£o curta | PÃƒÂ¡gina |
|----------|-----------------|--------|
| Claude Code | CLI da Anthropic, motor do wiki | [claude-code](entities/claude-code.md) |
| PizzaQL | Sistema de order management em Next.js (referÃƒÂªncia/WIP) | [pizzaql](entities/pizzaql.md) |
| Next.js | Framework React full-stack Ã¢â‚¬â€ v16.2.9 atual | [nextjs](entities/nextjs.md) |
| Neon | PostgreSQL serverless + Auth integrado Ã¢â‚¬â€ DB escolhido | [neon](entities/neon.md) |

## Conceitos

| Conceito | DescriÃƒÂ§ÃƒÂ£o curta | PÃƒÂ¡gina |
|----------|-----------------|--------|
| /loop command | Scheduler de sessÃƒÂ£o do Claude Code | [loop-command](concepts/loop-command.md) |
| Cart State com Recoil | Atom ÃƒÂºnico para carrinho (ref. PizzaQL, serÃƒÂ¡ substituÃƒÂ­do) | [cart-state-recoil](concepts/cart-state-recoil.md) |
| GraphQL Code-First (Nexus+Prisma) | Schema GraphQL gerado de TypeScript (ref. PizzaQL, serÃƒÂ¡ substituÃƒÂ­do) | [nexus-prisma-graphql](concepts/nexus-prisma-graphql.md) |
| App Router | Roteamento file-system do Next.js Ã¢â‚¬â€ padrÃƒÂ£o recomendado | [app-router](concepts/app-router.md) |
| Server Actions | Mutations sem API layer Ã¢â‚¬â€ substitui GraphQL/REST | [server-actions](concepts/server-actions.md) |
| Neon Auth (legado) | Referência histórica; auth ativa é first-party tenant-aware | [neon-auth](concepts/neon-auth.md) |
| Geist Design System | Sistema de design da Vercel Ã¢â‚¬â€ tokens, cores, tipografia | [geist-design-system](concepts/geist-design-system.md) |

## Fontes Ingeridas

| Fonte | Tipo | Data | PÃƒÂ¡gina |
|-------|------|------|--------|
| What is Claude Code /loop Command | Artigo (MindStudio) | 2026-06-20 | [claude-code-loop-command](sources/claude-code-loop-command.md) |
| PizzaQL/next GitHub Repository | RepositÃƒÂ³rio GitHub | 2026-06-20 | [pizzaql-next-repo](sources/pizzaql-next-repo.md) |
| Next.js Documentation Index | Docs oficiais (v16.2.9) | 2026-06-20 | [nextjs-docs-index](sources/nextjs-docs-index.md) |
| Neon Auth with Next.js (API Methods) | Docs Neon Auth | 2026-06-20 | [neon-auth-nextjs](sources/neon-auth-nextjs.md) |
| Vercel Geist Design System | Design tokens oficiais da Vercel | 2026-06-20 | [vercel-geist-design](sources/vercel-geist-design.md) |

## Conhecimento Pendente

- Neon DB setup com Prisma Ã¢â‚¬â€ ingerir docs
- SSE no Next.js Route Handler Ã¢â‚¬â€ padrÃƒÂ£o para real-time da cozinha
- Shadcn/UI Ã¢â‚¬â€ componentes do sistema
- PWA no Next.js 16 Ã¢â‚¬â€ verificar guia nativo
- Confirmar ORM: Prisma vs Drizzle com Neon
- Verificar compatibilidade Shadcn/UI com tokens Geist (usa sistema prÃƒÂ³prio ou pode adotar Geist?)
- Ingerir Dark theme do Geist: https://vercel.com/design.dark.md
- `lib/info.ts` e `state-saver.tsx` do PizzaQL nÃƒÂ£o ingeridos

## ContradiÃƒÂ§ÃƒÂµes Abertas

- `_cart` atom no PizzaQL usa `key: 'theme'` Ã¢â‚¬â€ provavelmente typo
- Brainstorming mencionou "Next.js 15" Ã¢â‚¬â€ versÃƒÂ£o atual ÃƒÂ© **16.2.9**
- Brainstorming mencionou Supabase (Abordagem A) Ã¢â‚¬â€ **descartado**, usando Neon

## AtualizaÃ§Ã£o 2026-06-29 â€” Permission Gates

- Novo conceito: [permission-gates](concepts/permission-gates.md)
- AutorizaÃ§Ã£o centralizada com `requireAccess(access)`.
- Um e-mail representa uma pessoa em uma empresa.
- Server Actions sÃ£o tratadas como superfÃ­cies de API.
- `/cozinha/dashboard` e `/api/events` exigem acesso `cozinha`.
- O app registra pagamentos externos; nÃ£o processa pagamentos.
## AtualizaÃ§Ã£o 2026-07-03 â€” Schema e relatÃ³rios

- `db/schema.sql` foi sincronizado com o schema Drizzle atual para `pedido.entregue_em`, `usuario.password_hash`, `usuario_acesso` e `auth_session`.
- `prisma/schema.prisma` foi atualizado com `Pedido.entregueEm` para manter o tooling de Prisma Studio coerente com relatÃ³rios de entrega.
- RelatÃ³rios administrativos agora usam `entregueEm - criadoEm` para calcular tempo mÃ©dio de entrega.
- Pedidos entregues sem `entregueEm` continuam tolerados e sÃ£o ignorados nos cÃ¡lculos de duraÃ§Ã£o.
- Fonte de verdade operacional do app segue sendo Drizzle: `lib/db/schema.ts` e `lib/db/schema-sqlite.ts`.
## Atualização 2026-07-03 — Build de produção validado

- Histórico: build usou `next build --webpack` enquanto `next-pwa` estava ativo; em 2026-07-06 voltou para `next build` após remover `next-pwa`.
- Páginas que leem cookies foram marcadas como `force-dynamic` para evitar tentativa de geração estática.
- A rota legada `/api/auth/[...path]` foi desativada como proxy Neon Auth; autenticação atual é first-party via Server Actions.
- Bootstrap SQLite ignora pragmas mutáveis durante `phase-production-build` para evitar lock entre workers do Next.


