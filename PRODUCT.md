# Product

## Register

product

## Users

Restaurante Comandas é usado por equipes operacionais de restaurante/pizzaria: garçons em celular durante atendimento, cozinha acompanhando pedidos em tela operacional, caixa fechando comandas e administradores gerenciando cardápio, mesas, usuários e relatórios.

Os usuários trabalham sob pressão, muitas vezes em pé, com interrupções, ruído ambiente e pouco tempo para interpretar a interface. A UI precisa reduzir dúvida, preservar estado local e deixar a próxima ação óbvia.

## Product Purpose

O produto centraliza comandas e pedidos por mesa para que garçom, cozinha, caixa e administração compartilhem o mesmo fluxo operacional sem depender de F5, planilhas ou comunicação manual.

Sucesso significa: pedidos entram corretamente, cozinha visualiza a fila, garçom confirma entrega, caixa registra pagamento externo, e administradores mantêm operação e acessos sem quebrar o atendimento.

## Brand Personality

Focado, confiável e operacional.

A experiência deve parecer uma ferramenta de trabalho clara: direta como uma comanda bem organizada, segura como um caixa conferido, e rápida como uma tela que a equipe consegue usar no meio do salão.

## Anti-references

- Não parecer landing page SaaS genérica.
- Não usar decoração gratuita, glassmorphism, gradientes chamativos ou cards aninhados sem função.
- Não esconder ações críticas atrás de navegação solta ou ambígua.
- Não usar redesign que quebre componentes, rotas, permissões, tracking/dataLayer ou regras de negócio.
- Não depender de F5 para atualizar telas operacionais.

## Design Principles

1. **Operação antes de estética.** Cada pixel deve ajudar alguém a atender, preparar, entregar, cobrar ou administrar.
2. **Uma próxima ação clara.** Telas operacionais devem deixar evidente o que fazer agora, sem disputa visual entre ações.
3. **Estado preservado é confiança.** Refresh, SSE e polling nunca devem apagar carrinho, drawer, modal, formulário ou expansão em andamento.
4. **Troca de contexto fica no perfil.** A navegação entre áreas permitidas pertence ao usuário/perfil, não a botões soltos nas telas.
5. **Consistência vence surpresa.** Botões, cards, estados e tipografia devem ser previsíveis entre garçom, cozinha, caixa e admin.

## Accessibility & Inclusion

Mirar WCAG AA. Texto normal precisa manter contraste mínimo 4.5:1; texto grande e controles podem seguir 3:1 quando aplicável. Toda ação interativa precisa ter foco visível, alvo confortável para toque em celular, estado disabled/loading claro e rótulo textual compreensível em português.
