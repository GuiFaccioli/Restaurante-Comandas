---
title: Permission Gates
type: concept
updated: 2026-06-29
tags: [auth, permissions, security]
---

# Permission Gates

## Definição

Permission gates são os pontos centrais de autorização do Restaurante-Comandas. O projeto usa `requireAccess(access)` para proteger páginas, Route Handlers e Server Actions.

## Contexto de uso

O sistema não deve confiar apenas em navegação ou UI escondida. Server Actions também são superfícies de API e precisam validar permissão no servidor.

Regras atuais:

- Um e-mail representa uma pessoa.
- Uma pessoa pertence a uma empresa.
- Uma pessoa pode ter múltiplos acessos dentro dessa empresa.
- Usuários com múltiplos acessos passam por `/selecionar-area`.
- Admin não herda automaticamente `caixa`, `cozinha` ou `garcom`.

## Mapa de acessos

| Acesso | Superfícies |
|--------|-------------|
| `admin` | `/admin/menu`, `/admin/mesas`, ações de cardápio e mesas |
| `caixa` | `/admin/pedidos`, fechamento de comanda e registro de pagamento externo |
| `cozinha` | `/cozinha/dashboard`, `/api/events`, atualização de status |
| `garcom` | `/garcom/*`, confirmação de pedidos |

## Trade-offs

| Prós | Contras |
|------|---------|
| Uma regra central reduz buracos de segurança | Exige disciplina para chamar o guard em toda nova superfície |
| Testes de fronteira detectam rota/action sem permissão | Testes source-level precisam ser mantidos junto com a arquitetura |

## Relações

- Relacionado com: [[server-actions]]
- Relacionado com: [[app-router]]
