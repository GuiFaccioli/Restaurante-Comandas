---
title: Changelog do Wiki
type: meta
updated: 2026-07-03
tags: [meta, histórico]
---

# Changelog

## 2026-07-06 — UX operacional mobile, garçom e caixa

- Adicionado: login lembrando apenas o último e-mail no aparelho, sem persistir senha manualmente.
- Atualizado: botões operacionais positivos com variante verde `success` e ações de cancelamento em vermelho.
- Adicionado: monitor de pedidos dentro da tela da mesa do garçom, com link para voltar às mesas e polling seguro de 5 segundos.
- Atualizado: `/admin/pedidos` para abrir pedidos, mostrar mesa, itens, totais, status de pagamento e registrar pagamento externo.
- Adicionado: endpoints JSON leves para atualização automática de pedidos por mesa e caixa.
- Documentado: regra mobile/no-F5 em `docs/OPERATIONS.md`.

## 2026-07-06 — Fundação multi-tenant, caixa e limpeza de dependências

- Adicionado: `tenant`, `tenant_user`, `auth_session.selected_tenant_id` e `tenant_id` nas tabelas operacionais.
- Atualizado: autenticação first-party para selecionar empresa quando o usuário pertence a múltiplos tenants.
- Adicionado: `/selecionar-empresa`.
- Atualizado: ações de mesas, produtos/categorias e pedidos para usarem `tenantId` do `requireAccess`.
- Adicionado: `pagamento_pedido` e `registrarPagamentoPedido` para caixa v1 com pagamento externo.
- Removido: Neon Auth legado, Prisma tooling e `next-pwa`; Neon Postgres foi mantido.
- Atualizado: build para `next build`.
- Verificado: `npm test -- --maxWorkers=1`, `npm run build` e `npm audit --json`.
- Resultado do audit: 0 high/critical; 6 moderadas restantes em Next/PostCSS e DrizzleKit/esbuild, sem aplicar downgrades inseguros.

## 2026-07-03 — Build de produção estabilizado

- Atualizado: `package.json` para executar `next build --webpack`, evitando falhas internas do Turbopack com o stack atual de PWA.
- Atualizado: `app/page.tsx`, `app/selecionar-area/page.tsx`, `app/admin/menu/page.tsx` e `app/admin/mesas/page.tsx` com `force-dynamic` porque leem cookies via auth/access.
- Atualizado: `app/api/auth/[...path]/route.ts` para não instanciar o proxy legado Neon Auth durante build; o app usa autenticação first-party via Server Actions.
- Atualizado: `lib/db/index.ts` para evitar pragmas SQLite mutáveis durante `phase-production-build`.
- Verificado: `npm test -- --maxWorkers=1` e `npm run build`.

## 2026-07-03 — Schema e relatórios de entrega

- Atualizado: `db/schema.sql` com `entregue_em`, `acesso_usuario`, `usuario_acesso`, `auth_session`, `password_hash`, timestamps de usuário e índices auxiliares.
- Atualizado: `prisma/schema.prisma` com `Pedido.entregueEm` mapeado para `entregue_em`.
- Atualizado: `app/admin/relatorios/page.tsx` para calcular tempo médio de entrega usando apenas pedidos `entregue` com `entregueEm` preenchido.
- Atualizado: `.metadata/` e `CLAUDE.md` para refletir os módulos alterados.
- Testes adicionados: schema reference drift e métricas de tempo de entrega nos relatórios.

## 2026-06-20 — Task 6: Server Actions — Cardápio e Mesas

- Implementado: `lib/actions/produtos.ts`, `lib/actions/mesas.ts`, testes em `tests/unit/actions/produtos.test.ts`
- Funções criadas:
  - **Produtos**: `criarCategoria`, `reordenarCategorias`, `criarProduto`, `editarProduto`, `toggleDisponivel`
  - **Mesas**: `criarMesa`, `toggleAtiva`
  - `toggleDisponivel` emite SSE 'produto_indisponivel' quando desativar (disponivel: true → false)
- Padrão: 4 testes validando insert/returning, SSE notification apenas em desativação
- Commit: 920ced1

## 2026-06-20 — Ingestão: Vercel Geist Design System

- Criado: `raw_sources/vercel-geist-design.md` (502 linhas, verbatim), `concepts/geist-design-system.md`, `sources/vercel-geist-design.md`
- Atualizado: `wiki/index.md` (novo conceito, nova fonte, lacunas)
- Contradições: nenhuma
- Lacunas: compatibilidade Shadcn/UI com tokens Geist, Dark theme pendente

## 2026-06-20 — Ingestão: Neon Auth with Next.js

- Criado: `raw_sources/neon-auth-nextjs.md`, `entities/neon.md`, `concepts/neon-auth.md`, `sources/neon-auth-nextjs.md`
- Atualizado: `wiki/index.md` (stack atualizada: Supabase → Neon, SSE para real-time)
- Decisão arquitetural: Neon escolhido, Supabase descartado
- Lacunas: Neon+Prisma setup, SSE pattern, ORM choice

## 2026-06-20 — Ingestão: Next.js Documentation Index

- Criado: `raw_sources/nextjs-docs-index.md`, `entities/nextjs.md`, `concepts/app-router.md`, `concepts/server-actions.md`, `sources/nextjs-docs-index.md`
- Atualizado: `entities/pizzaql.md` (contradição com versão Next.js), `wiki/index.md`
- Contradições: brainstorming menciona Next.js 15, versão atual é 16.2.9
- Lacunas: Supabase Realtime, Shadcn/UI, PWA nativo no Next.js 16

## 2026-06-20 — Ingestão: PizzaQL/next GitHub Repository

- Criado: `raw_sources/pizzaql-next-repo.md`, `entities/pizzaql.md`, `concepts/cart-state-recoil.md`, `concepts/nexus-prisma-graphql.md`, `sources/pizzaql-next-repo.md`
- Atualizado: `wiki/index.md` (2 entidades, 2 conceitos, 1 fonte novas)
- Contradições: `_cart` atom com `key: 'theme'` (possível typo)
- Lacunas: `lib/info.ts`, `state-saver.tsx`, implementação Stripe pendente

## 2026-06-20 — Ingestão: What is Claude Code /loop Command

- Criado: `sources/claude-code-loop-command.md`, `entities/claude-code.md`, `concepts/loop-command.md`
- Atualizado: `wiki/index.md` (sumário executivo + 3 novas entradas)
- Contradições: nenhuma
- Lacunas: 4 perguntas abertas sobre /loop internals e session-loop planejado

## 2026-06-20 — Inicialização

- Wiki criado com estrutura base
- Schema definido em `meta/schema.md`
- index.md inicializado

## 2026-06-29 — Ingestão: Permission Gates

- Criado: `wiki/concepts/permission-gates.md`
- Atualizado: `wiki/index.md`
- Decisão: um e-mail representa uma pessoa em uma empresa.
- Decisão: `requireAccess(access)` protege páginas, Route Handlers e Server Actions.
- Decisão: `/cozinha/dashboard` e `/api/events` exigem acesso `cozinha`.
- Decisão: pagamentos são apenas registros externos; o app não processa pagamentos.

