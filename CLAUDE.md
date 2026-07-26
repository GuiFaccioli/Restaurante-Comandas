# Project Wiki — Instruções para Claude

## Carregamento obrigatório

Ao iniciar qualquer sessão neste projeto, leia `wiki/index.md` primeiro. Ele é o ponto de entrada para todo o conhecimento acumulado. Se precisar de mais contexto sobre um tópico, siga os links para as páginas específicas antes de responder.

## Seu papel

Você é o mantenedor deste wiki. Quando aprender algo novo durante a sessão — uma decisão, um conceito, um detalhe sobre entidade — atualize o wiki. Não espere o usuário pedir.

## Estrutura do wiki

```
wiki/
  index.md          # entrada principal, sumário geral
  meta/
    schema.md       # regras de manutenção e convenções
    changelog.md    # log de mudanças
  entities/         # coisas específicas: sistemas, serviços, pessoas, produtos
  concepts/         # ideias abstratas: padrões, decisões de arquitetura, glossário
  sources/          # resumos de fontes ingeridas (docs, artigos, URLs)
```

## Regras de manutenção

1. **Nunca modifique fontes brutas** — apenas crie/atualize páginas do wiki
2. **Cross-references sempre** — use `[[nome-da-página]]` ao mencionar algo que tem ou deveria ter página própria
3. **Contradições são sinalizadas**, não silenciadas — marque com `⚠️ CONTRADIÇÃO:` e registre ambas as versões
4. **Cascade automático** — ao atualizar uma página, verifique se outras páginas que a referenciam precisam de ajuste
5. **index.md é sempre atualizado** quando uma página nova é criada

## Slash commands disponíveis

- `/ingest` — ingere uma fonte e atualiza o wiki
- `/query` — busca no wiki e sintetiza resposta
- `/lint` — health check: contradições, links quebrados, lacunas

## Convenção de arquivos

- Nomes em kebab-case: `nome-do-arquivo.md`
- Cabeçalho obrigatório em todo arquivo:
  ```
  ---
  title: Título
  type: entity|concept|source
  updated: YYYY-MM-DD
  tags: [tag1, tag2]
  ---
  ```

## Component Registry
<!-- context-sync: auto-generated — do not edit manually -->
| Module | Summary | Specialist | Updated |
|--------|---------|------------|---------|
| [app/](app/) | Defines global layout, metadata, toaster, and role-based home redirect. | frontend-dev | 2026-07-03 |
| [app/admin/](app/admin/) | Provides admin navigation and management sidebar around admin pages. | frontend-dev | 2026-07-03 |
| [app/admin/configuracoes/](app/admin/configuracoes/) | Provides configuration shortcuts for menu, tables, orders/cashier, and users. | frontend-dev | 2026-07-03 |
| [app/admin/menu/](app/admin/menu/) | Loads categories/products and renders admin menu CRUD interactions. | frontend-dev | 2026-07-03 |
| [app/admin/mesas/](app/admin/mesas/) | Loads tables and lets admins create/toggle active restaurant tables. | frontend-dev | 2026-07-03 |
| [app/admin/pedidos/](app/admin/pedidos/) | Shows persisted orders for cashier/admin review and updates rows from SSE events. | frontend-dev | 2026-07-03 |
| [app/admin/relatorios/](app/admin/relatorios/) | Builds a first management report from persisted orders, item snapshots, products, and categories. | backend-dev | 2026-07-03 |
| [app/admin/usuarios/](app/admin/usuarios/) | Lists users and their configured operational accesses for admin audit. | backend-dev | 2026-07-03 |
| [app/api/auth/[...path]/](app/api/auth/[...path]/) | Delegates auth route handling to the configured auth server object. | backend-dev | 2026-07-03 |
| [app/api/events/](app/api/events/) | Streams kitchen/order events over Server-Sent Events to live operational clients. | backend-dev | 2026-07-03 |
| [app/auth/sign-in/](app/auth/sign-in/) | Renders the email/password sign-in form bound to the auth server action. | frontend-dev | 2026-07-03 |
| [app/auth/sign-up/](app/auth/sign-up/) | Renders owner/admin account creation form. | frontend-dev | 2026-07-03 |
| [app/cozinha/](app/cozinha/) | Guards and wraps the kitchen display area. | frontend-dev | 2026-07-03 |
| [app/cozinha/dashboard/](app/cozinha/dashboard/) | Loads open comandas for the kitchen visual-only board. | backend-dev | 2026-07-03 |
| [app/garcom/](app/garcom/) | Guards and wraps waiter routes. | frontend-dev | 2026-07-03 |
| [app/garcom/mesa/[id]/](app/garcom/mesa/[id]/) | Loads menu data for one active table and renders the waiter ordering UI. | frontend-dev | 2026-07-03 |
| [app/garcom/mesas/](app/garcom/mesas/) | Shows active tables that waiters can open to build orders. | frontend-dev | 2026-07-03 |
| [app/garcom/pedidos/](app/garcom/pedidos/) | Shows all open orders that waiters need to deliver and confirm. | frontend-dev | 2026-07-03 |
| [app/mesa/[id]/](app/mesa/[id]/) | Redirects a numeric public table URL to the canonical waiter table route. | frontend-dev | 2026-07-03 |
| [app/selecionar-area/](app/selecionar-area/) | Lets multi-access users choose the operational area to enter. | frontend-dev | 2026-07-03 |
| [app/sem-acesso/](app/sem-acesso/) | Shows the unauthorized empty state for authenticated users without required access. | frontend-dev | 2026-07-03 |
| [components/](components/) | Contains cross-area shared UI like status badges and live elapsed timers. | frontend-dev | 2026-07-03 |
| [components/admin/](components/admin/) | Contains admin-specific editing components, currently the product form dialog. | frontend-dev | 2026-07-03 |
| [components/cozinha/](components/cozinha/) | Renders live kitchen comandas and listens for SSE updates. | frontend-dev | 2026-07-03 |
| [components/garcom/](components/garcom/) | Implements waiter menu/cart ordering and pending-delivery confirmation UI. | frontend-dev | 2026-07-03 |
| [components/ui/](components/ui/) | Provides shadcn/base UI primitives used across app surfaces. | frontend-dev | 2026-07-03 |
| [db/](db/) | Contains the original PostgreSQL SQL schema reference. | backend-dev | 2026-07-03 |
| [lib/](lib/) | Contains small shared utilities for class names, money, dates, and SSE. | backend-dev | 2026-07-03 |
| [lib/actions/](lib/actions/) | Owns mutations for auth, tables, products, and orders. | backend-dev | 2026-07-03 |
| [lib/auth/](lib/auth/) | Implements local password sessions, access routing, and provider/client placeholders. | backend-dev | 2026-07-03 |
| [lib/db/](lib/db/) | Defines Drizzle schemas for PostgreSQL and SQLite plus database connection compatibility. | backend-dev | 2026-07-03 |
| [lib/dev/](lib/dev/) | Defines deterministic local seed users and shared development password. | backend-dev | 2026-07-03 |
| [lib/kitchen/](lib/kitchen/) | Groups order items by kitchen display category with a preferred operational order. | backend-dev | 2026-07-03 |
| [lib/menu/](lib/menu/) | Defines default categories and products seeded into the local development database. | backend-dev | 2026-07-03 |
| [lib/store/](lib/store/) | Holds waiter cart items, quantities, observations, and total before order confirmation. | frontend-dev | 2026-07-03 |
| [lib/time/](lib/time/) | Formats elapsed durations for open orders. | backend-dev | 2026-07-03 |
| [scripts/](scripts/) | Seeds the local SQLite database with dev users, tables, categories, and products. | backend-dev | 2026-07-03 |
<!-- /context-sync -->

