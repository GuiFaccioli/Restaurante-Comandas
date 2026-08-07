# README para recrutadores — design

## Objetivo

Transformar o README em uma apresentação didática, em PT-BR, que mostre o
Restaurante Comandas como produto operacional e como projeto de engenharia.

## Público e tom

- Recrutadores e pessoas técnicas avaliando autoria, clareza de produto e
  maturidade de implementação.
- Linguagem direta, explicando decisões pelo problema que resolvem.
- Sem métricas inventadas, sem URL pública de staging e sem credenciais.

## Estrutura proposta

1. **Resumo do produto** — problema operacional: pedidos, produção, caixa e
   estoque precisam compartilhar o mesmo estado.
2. **Fluxo operacional** — papéis de garçom, cozinha, caixa e administração;
   atualizações sem depender de recarregar a página.
3. **Estoque conectado ao cardápio** — fichas técnicas associam insumos aos
   produtos e permitem baixa conforme a configuração de estoque; mínimos,
   ideais, entradas, perdas e contagens dão contexto de operação.
4. **Evolução planejada** — lista de compras informativa a partir da diferença
   entre estoque atual e ideal. Deve ser identificada como roadmap, pois ainda
   não está implementada.
5. **Produto e UX/UI** — interfaces responsivas, foco em ações operacionais,
   estados vazios/erros e semântica acessível.
6. **Arquitetura** — Next.js App Router, React, TypeScript, Neon Postgres,
   Drizzle, autenticação Neon, multi-tenancy e Server Actions.
7. **Qualidade** — Vitest, testes unitários e de integração, regras de
   estoque/idempotência e build como verificação.
8. **Execução local** — comandos de instalação, desenvolvimento, testes,
   build e seed.

## Critérios de aceitação

- O README diferencia claramente funcionalidades entregues de roadmap.
- Explica o valor do estoque por ficha técnica sem prometer lista de compras
  existente.
- Reflete apenas tecnologias e práticas verificadas no repositório.
- É legível tanto por recrutadores quanto por pessoas técnicas.
