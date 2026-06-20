---
title: Changelog do Wiki
type: meta
updated: 2026-06-20
tags: [meta, histórico]
---

# Changelog

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
