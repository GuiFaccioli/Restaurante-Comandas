# Currículo — Desenvolvedor Full Stack

## [Seu nome]

[Cidade/Estado] · [Telefone] · [E-mail] · [LinkedIn] · [GitHub]

## Perfil profissional

Desenvolvedor Full Stack com experiência prática na construção de sistemas operacionais para restaurantes e pizzarias. Neste projeto, desenvolvi uma aplicação web multiusuário e multi-tenant para gerenciamento de comandas, mesas, cardápio, cozinha, entregas, caixa, usuários e relatórios, com foco em segurança, responsividade mobile, acessibilidade e atualização em tempo real.

## Projeto em destaque

### Restaurante Comandas — Sistema de gestão operacional

Aplicação web para centralizar o fluxo entre garçons, cozinha, caixa e administração, reduzindo a dependência de atualização manual e comunicação fora do sistema.

**Principais entregas:**

- Fluxo de autenticação própria com sessões HTTP-only, seleção de restaurante e controle de permissões.
- Arquitetura multi-tenant com isolamento por `tenant`, memberships e validação de acesso por área.
- Módulo do garçom para seleção de mesas, montagem de pedidos, observações, carrinho e confirmação de entrega.
- Dashboard da cozinha em formato Kanban para acompanhamento dos pedidos.
- Caixa para consulta de pedidos entregues e registro de pagamentos externos.
- Administração de cardápio, categorias, produtos, mesas, usuários e permissões.
- Relatórios e métricas operacionais.
- Atualização em tempo real via Server-Sent Events (SSE) e polling seguro de 5 segundos.
- Interface responsiva para uso em celular, cozinha e desktop, com foco em estados de loading, foco visível, alvos de toque e WCAG AA.
- Preservação de estado local durante atualizações automáticas: carrinho, drawers, modais, formulários e seleções.
- Testes unitários, testes de integração de regras de negócio e testes end-to-end.

### TechZone Periféricos — E-commerce demonstrativo

SPA de e-commerce construída para praticar desenvolvimento de storefront, persistência de contexto e instrumentação de analytics.

**Principais entregas:**

- Catálogo com categorias, busca, filtros, ofertas, imagens locais e variações de cor.
- Modal de detalhes, favoritos e carrinho com controle de quantidade.
- Checkout simulado com geração de `transaction_id`.
- Persistência de carrinho, favoritos e produtos vistos usando cookies `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Instrumentação de eventos e-commerce no `window.dataLayer`, incluindo `view_item`, `select_item`, `add_to_cart`, `view_cart`, `begin_checkout` e `purchase`.
- Integração opcional do Google Tag Manager por variável de ambiente, sem ID hardcoded.
- Scripts de dry-run e preflight read-only usando Google APIs para preparar automação segura do GTM.

## Competências técnicas demonstradas

### Front-end

- Next.js 16 com App Router
- React 19
- Vite
- TypeScript 5 em modo estrito
- Tailwind CSS 4
- shadcn/ui e componentes Radix/Base UI
- React Hook Form
- Zod
- Zustand
- Lucide React
- Interfaces responsivas e mobile-first
- Acessibilidade: ARIA, teclado, foco, tooltips e estados de erro/loading

### Back-end e dados

- Server Actions do Next.js
- Rotas de API e endpoints JSON
- Server-Sent Events (SSE)
- Drizzle ORM
- Neon PostgreSQL serverless em produção
- SQLite com `better-sqlite3` para desenvolvimento e testes
- Modelagem relacional e migrações SQL
- Seed de dados para ambiente local
- Controle de acesso por função e por tenant
- Hash e validação de senhas
- APIs serverless na Vercel para contexto de cookies
- Cookies HttpOnly, SameSite e Secure

### Qualidade e ferramentas

- Vitest
- Testing Library
- Playwright
- Testes de fluxos operacionais e regras de negócio
- TypeScript compiler e Next.js production build
- Git e Conventional Commits
- Documentação técnica e decisões arquiteturais
- Google Tag Manager e fundamentos de GA4 e-commerce
- Google APIs com automação em modo dry-run e preflight read-only
- ESLint e validação de tipos com TypeScript

## Destaques de engenharia

- Separação entre apresentação, ações de domínio, autenticação, autorização e persistência.
- Uso de filtros por tenant nas consultas e mutações para evitar acesso cruzado entre restaurantes.
- Compatibilidade entre PostgreSQL/Neon e SQLite local por meio de uma camada de compatibilidade do banco.
- Atualização operacional sem destruir a interação que o usuário está realizando.
- Tratamento de exclusões protegidas e resultados discriminados em Server Actions.
- Validação de interações acessíveis com testes automatizados e verificação de comportamento no navegador.

## Formação e experiência

**Formação:** [Curso / instituição / período]

**Experiência profissional:** [Empresa / cargo / período]

## Objetivo

Atuar como Desenvolvedor Full Stack, contribuindo na construção de produtos web confiáveis, seguros, acessíveis e orientados a regras de negócio reais.

## Observação

Substitua os campos entre colchetes pelos seus dados pessoais, formação, experiências profissionais e links. As tecnologias e responsabilidades acima foram extraídas do projeto Restaurante Comandas.
