# Restaurante Comandas

> Uma plataforma operacional para restaurantes e pizzarias que conecta salão, cozinha, caixa e estoque em um único fluxo.

## A dor que o produto resolve

Em uma operação de restaurante, o pedido não é apenas uma anotação: ele muda o trabalho de quem atende, de quem produz, de quem fecha a conta e de quem repõe insumos. Quando cada etapa vive em uma planilha, papel ou conversa paralela, surgem atrasos, retrabalho e pouca visibilidade sobre o que realmente está acontecendo.

O **Restaurante Comandas** foi construído para centralizar esse ciclo. A aplicação transforma o pedido em um estado compartilhado entre os papéis operacionais e mantém o estoque conectado ao que foi configurado no cardápio.

## Como o fluxo funciona

| Papel | O que faz no sistema | Resultado para a operação |
| --- | --- | --- |
| Garçom | Abre atendimentos por mesa, monta pedidos e acompanha entregas. | Menos perda de contexto entre salão e cozinha. |
| Cozinha | Move os pedidos por etapas de preparo. | Priorização clara do que precisa ser produzido. |
| Caixa | Visualiza contas por atendimento e registra pagamentos. | Cobrança baseada no estado real da operação. |
| Administração | Gerencia cardápio, mesas, usuários, relatórios e estoque. | Visão centralizada para decisões diárias. |

As telas operacionais recebem eventos em tempo real e usam atualização de apoio sem depender de recarregar a página. A intenção é simples: uma mudança de estado precisa chegar a quem trabalha com ela, sem apagar o carrinho, um formulário ou o contexto que a pessoa está usando.

## Estoque conectado ao cardápio

O estoque não foi tratado como uma tela isolada. Cada produto pode ter uma **ficha técnica** que associa insumos e quantidades ao item do cardápio. Quando o controle de estoque está configurado para o produto, o fluxo de pedido usa essa configuração para refletir o consumo de insumos.

Além disso, a operação conta com:

- cadastro de insumos com unidade de compra e unidade base;
- estoque atual, mínimo e ideal;
- entradas, perdas e contagens manuais;
- histórico de movimentações;
- bloqueio de consumo quando não há saldo suficiente;
- custo médio ponderado para entradas com custo informado.

### Lista de compras integrada

Quando um item chega ao estoque mínimo, o sistema cria uma sugestão para repor o saldo até o estoque ideal. A sugestão permanece estável enquanto está pendente, pode ser confirmada com a quantidade e unidade efetivamente recebidas e atualiza o estoque na mesma operação. Itens manuais aparecem na mesma lista, em ordem alfabética, e o texto completo pode ser copiado para outros canais.

## Pensado como produto, não só como CRUD

### UX/UI operacional

- Interface responsiva, com navegação inferior para dispositivos móveis e layout adaptável para desktop.
- Ações principais dimensionadas para toque, com estados de carregamento, erro e vazio.
- Foco em contexto: listas, filtros, formulários e detalhes permanecem estáveis nas atualizações.
- Componentes semânticos, rótulos acessíveis e estados de foco visível para navegação por teclado.

### Regras que protegem a operação

- Isolamento multi-tenant: cada operação acessa apenas seus próprios dados.
- Sessões HTTP-only e autenticação gerenciada pelo Neon Auth.
- Movimentações de estoque idempotentes e protegidas por transações.
- Baixa de estoque validada antes de confirmar a operação.

## Arquitetura e tecnologias

| Camada | Escolhas |
| --- | --- |
| Aplicação web | Next.js 16 com App Router, React 19 e TypeScript |
| Dados | Neon Postgres e Drizzle ORM |
| Autenticação | Neon Auth com cookies de sessão HTTP-only |
| Mutação de dados | Server Actions e transações PostgreSQL |
| Atualização operacional | Server-Sent Events (SSE) e polling de apoio |
| Interface | Tailwind CSS, componentes reutilizáveis e ícones Lucide |
| Qualidade | Vitest, testes de integração e Playwright para fluxos E2E |

## Qualidade e estratégia de testes

O projeto possui testes unitários, de integração e E2E. A preocupação não é apenas testar telas: regras de negócio também são cobertas, especialmente as que têm impacto financeiro ou de estoque.

Exemplos de cenários protegidos por testes:

- consumo e devolução de insumos no ciclo do pedido;
- idempotência de movimentações manuais de estoque;
- isolamento de dados por tenant;
- regras de pagamento e conta por atendimento;
- comportamento de telas de garçom, cozinha, caixa e administração;
- autenticação e sessão.

## Executar localmente

```bash
npm install
npm run dev
```

Em outro terminal, execute a suíte de testes e o build de produção:

```bash
npm test -- --maxWorkers=1
npm run test:integration
npm run test:e2e
npm run build
```

## Seed local

```bash
npm run db:seed
```

O seed cria um ambiente local inicial com restaurante, usuários, mesas e itens de cardápio para explorar os fluxos.

## Escopo atual

- O caixa registra pagamentos operacionais; não processa gateway, PIX ou cartão.
- A lista de compras reúne sugestões automáticas e itens manuais; ela não emite pedidos para fornecedores.
