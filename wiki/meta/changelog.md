---
title: Changelog do Wiki
type: meta
updated: 2026-07-03
tags: [meta, histÃƒÂ³rico]
---

# Changelog

## 2026-07-03 — Build de produção estabilizado

- Atualizado: `package.json` para executar `next build --webpack`, evitando falhas internas do Turbopack com o stack atual de PWA.
- Atualizado: `app/page.tsx`, `app/selecionar-area/page.tsx`, `app/admin/menu/page.tsx` e `app/admin/mesas/page.tsx` com `force-dynamic` porque leem cookies via auth/access.
- Atualizado: `app/api/auth/[...path]/route.ts` para não instanciar o proxy legado Neon Auth durante build; o app usa autenticação first-party via Server Actions.
- Atualizado: `lib/db/index.ts` para evitar pragmas SQLite mutáveis durante `phase-production-build`.
- Verificado: `npm test -- --maxWorkers=1` e `npm run build`.

## 2026-07-03 â€” Schema e relatÃ³rios de entrega

- Atualizado: `db/schema.sql` com `entregue_em`, `acesso_usuario`, `usuario_acesso`, `auth_session`, `password_hash`, timestamps de usuÃ¡rio e Ã­ndices auxiliares.
- Atualizado: `prisma/schema.prisma` com `Pedido.entregueEm` mapeado para `entregue_em`.
- Atualizado: `app/admin/relatorios/page.tsx` para calcular tempo mÃ©dio de entrega usando apenas pedidos `entregue` com `entregueEm` preenchido.
- Atualizado: `.metadata/` e `CLAUDE.md` para refletir os mÃ³dulos alterados.
- Testes adicionados: schema reference drift e mÃ©tricas de tempo de entrega nos relatÃ³rios.

## 2026-06-20 Ã¢â‚¬â€ Task 6: Server Actions Ã¢â‚¬â€ CardÃƒÂ¡pio e Mesas

- Implementado: `lib/actions/produtos.ts`, `lib/actions/mesas.ts`, testes em `tests/unit/actions/produtos.test.ts`
- FunÃƒÂ§ÃƒÂµes criadas:
  - **Produtos**: `criarCategoria`, `reordenarCategorias`, `criarProduto`, `editarProduto`, `toggleDisponivel`
  - **Mesas**: `criarMesa`, `toggleAtiva`
  - `toggleDisponivel` emite SSE 'produto_indisponivel' quando desativar (disponivel: true Ã¢â€ â€™ false)
- PadrÃƒÂ£o: 4 testes validando insert/returning, SSE notification apenas em desativaÃƒÂ§ÃƒÂ£o
- Commit: 920ced1

## 2026-06-20 Ã¢â‚¬â€ IngestÃƒÂ£o: Vercel Geist Design System

- Criado: `raw_sources/vercel-geist-design.md` (502 linhas, verbatim), `concepts/geist-design-system.md`, `sources/vercel-geist-design.md`
- Atualizado: `wiki/index.md` (novo conceito, nova fonte, lacunas)
- ContradiÃƒÂ§ÃƒÂµes: nenhuma
- Lacunas: compatibilidade Shadcn/UI com tokens Geist, Dark theme pendente

## 2026-06-20 Ã¢â‚¬â€ IngestÃƒÂ£o: Neon Auth with Next.js

- Criado: `raw_sources/neon-auth-nextjs.md`, `entities/neon.md`, `concepts/neon-auth.md`, `sources/neon-auth-nextjs.md`
- Atualizado: `wiki/index.md` (stack atualizada: Supabase Ã¢â€ â€™ Neon, SSE para real-time)
- DecisÃƒÂ£o arquitetural: Neon escolhido, Supabase descartado
- Lacunas: Neon+Prisma setup, SSE pattern, ORM choice

## 2026-06-20 Ã¢â‚¬â€ IngestÃƒÂ£o: Next.js Documentation Index

- Criado: `raw_sources/nextjs-docs-index.md`, `entities/nextjs.md`, `concepts/app-router.md`, `concepts/server-actions.md`, `sources/nextjs-docs-index.md`
- Atualizado: `entities/pizzaql.md` (contradiÃƒÂ§ÃƒÂ£o com versÃƒÂ£o Next.js), `wiki/index.md`
- ContradiÃƒÂ§ÃƒÂµes: brainstorming menciona Next.js 15, versÃƒÂ£o atual ÃƒÂ© 16.2.9
- Lacunas: Supabase Realtime, Shadcn/UI, PWA nativo no Next.js 16

## 2026-06-20 Ã¢â‚¬â€ IngestÃƒÂ£o: PizzaQL/next GitHub Repository

- Criado: `raw_sources/pizzaql-next-repo.md`, `entities/pizzaql.md`, `concepts/cart-state-recoil.md`, `concepts/nexus-prisma-graphql.md`, `sources/pizzaql-next-repo.md`
- Atualizado: `wiki/index.md` (2 entidades, 2 conceitos, 1 fonte novas)
- ContradiÃƒÂ§ÃƒÂµes: `_cart` atom com `key: 'theme'` (possÃƒÂ­vel typo)
- Lacunas: `lib/info.ts`, `state-saver.tsx`, implementaÃƒÂ§ÃƒÂ£o Stripe pendente

## 2026-06-20 Ã¢â‚¬â€ IngestÃƒÂ£o: What is Claude Code /loop Command

- Criado: `sources/claude-code-loop-command.md`, `entities/claude-code.md`, `concepts/loop-command.md`
- Atualizado: `wiki/index.md` (sumÃƒÂ¡rio executivo + 3 novas entradas)
- ContradiÃƒÂ§ÃƒÂµes: nenhuma
- Lacunas: 4 perguntas abertas sobre /loop internals e session-loop planejado

## 2026-06-20 Ã¢â‚¬â€ InicializaÃƒÂ§ÃƒÂ£o

- Wiki criado com estrutura base
- Schema definido em `meta/schema.md`
- index.md inicializado

## 2026-06-29 â€” IngestÃ£o: Permission Gates

- Criado: `wiki/concepts/permission-gates.md`
- Atualizado: `wiki/index.md`
- DecisÃ£o: um e-mail representa uma pessoa em uma empresa.
- DecisÃ£o: `requireAccess(access)` protege pÃ¡ginas, Route Handlers e Server Actions.
- DecisÃ£o: `/cozinha/dashboard` e `/api/events` exigem acesso `cozinha`.
- DecisÃ£o: pagamentos sÃ£o apenas registros externos; o app nÃ£o processa pagamentos.
