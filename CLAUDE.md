# Project Wiki ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â InstruÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes para Claude

## Carregamento obrigatÃƒÆ’Ã‚Â³rio

Ao iniciar qualquer sessÃƒÆ’Ã‚Â£o neste projeto, leia `wiki/index.md` primeiro. Ele ÃƒÆ’Ã‚Â© o ponto de entrada para todo o conhecimento acumulado. Se precisar de mais contexto sobre um tÃƒÆ’Ã‚Â³pico, siga os links para as pÃƒÆ’Ã‚Â¡ginas especÃƒÆ’Ã‚Â­ficas antes de responder.

## Seu papel

VocÃƒÆ’Ã‚Âª ÃƒÆ’Ã‚Â© o mantenedor deste wiki. Quando aprender algo novo durante a sessÃƒÆ’Ã‚Â£o ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â uma decisÃƒÆ’Ã‚Â£o, um conceito, um detalhe sobre entidade ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â atualize o wiki. NÃƒÆ’Ã‚Â£o espere o usuÃƒÆ’Ã‚Â¡rio pedir.

## Estrutura do wiki

```
wiki/
  index.md          # entrada principal, sumÃƒÆ’Ã‚Â¡rio geral
  meta/
    schema.md       # regras de manutenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e convenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes
    changelog.md    # log de mudanÃƒÆ’Ã‚Â§as
  entities/         # coisas especÃƒÆ’Ã‚Â­ficas: sistemas, serviÃƒÆ’Ã‚Â§os, pessoas, produtos
  concepts/         # ideias abstratas: padrÃƒÆ’Ã‚Âµes, decisÃƒÆ’Ã‚Âµes de arquitetura, glossÃƒÆ’Ã‚Â¡rio
  sources/          # resumos de fontes ingeridas (docs, artigos, URLs)
```

## Regras de manutenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o

1. **Nunca modifique fontes brutas** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â apenas crie/atualize pÃƒÆ’Ã‚Â¡ginas do wiki
2. **Cross-references sempre** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â use `[[nome-da-pÃƒÆ’Ã‚Â¡gina]]` ao mencionar algo que tem ou deveria ter pÃƒÆ’Ã‚Â¡gina prÃƒÆ’Ã‚Â³pria
3. **ContradiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes sÃƒÆ’Ã‚Â£o sinalizadas**, nÃƒÆ’Ã‚Â£o silenciadas ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â marque com `ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â CONTRADIÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O:` e registre ambas as versÃƒÆ’Ã‚Âµes
4. **Cascade automÃƒÆ’Ã‚Â¡tico** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ao atualizar uma pÃƒÆ’Ã‚Â¡gina, verifique se outras pÃƒÆ’Ã‚Â¡ginas que a referenciam precisam de ajuste
5. **index.md ÃƒÆ’Ã‚Â© sempre atualizado** quando uma pÃƒÆ’Ã‚Â¡gina nova ÃƒÆ’Ã‚Â© criada

## Slash commands disponÃƒÆ’Ã‚Â­veis

- `/ingest` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ingere uma fonte e atualiza o wiki
- `/query` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â busca no wiki e sintetiza resposta
- `/lint` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â health check: contradiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes, links quebrados, lacunas

## ConvenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de arquivos

- Nomes em kebab-case: `nome-do-arquivo.md`
- CabeÃƒÆ’Ã‚Â§alho obrigatÃƒÆ’Ã‚Â³rio em todo arquivo:
  ```
  ---
  title: TÃƒÆ’Ã‚Â­tulo
  type: entity|concept|source
  updated: YYYY-MM-DD
  tags: [tag1, tag2]
  ---
  ```

## Component Registry
<!-- context-sync: auto-generated Ã¢â‚¬â€ do not edit manually -->
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

