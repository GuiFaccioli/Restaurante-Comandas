# Métricas interativas com responsáveis no caixa

## Objetivo

Transformar os indicadores `Pedidos na fila`, `Pagamentos pendentes` e `Pagos` da tela `/admin/pedidos` em controles interativos que revelem, logo abaixo dos indicadores, as pessoas responsáveis pelos pedidos exibidos.

O recurso deve preservar o fluxo atual do caixa, o isolamento por empresa, a atualização por SSE e polling e os estados locais da tela.

## Semântica de responsabilidade

- **Pedidos na fila:** exibe o garçom que lançou cada pedido.
- **Pagamentos pendentes:** exibe o garçom que lançou cada pedido ainda pendente de pagamento.
- **Pagos:** exibe o caixa que registrou cada pagamento.

O sistema não deve inferir um responsável quando essa informação não estiver registrada. Pedidos históricos sem autoria exibem `Responsável não registrado`.

## Interação

Os três indicadores passam a ser botões acessíveis, mantendo a aparência de indicadores estatísticos.

- Clique ou ativação por teclado seleciona o indicador.
- O indicador selecionado possui estado visual explícito e `aria-expanded`.
- Um painel aparece imediatamente abaixo da grade de indicadores.
- Selecionar outro indicador substitui o conteúdo do painel.
- Ativar novamente o indicador selecionado fecha o painel.
- A seleção permanece aberta durante atualizações por SSE ou polling.

## Conteúdo do painel

Cada linha apresenta somente informações necessárias para reconhecer a responsabilidade:

- mesa;
- identificador curto do pedido;
- valor, quando relacionado a pagamento;
- nome do responsável ou o fallback histórico;
- rótulo contextual: `Lançado por` ou `Recebido por`.

O painel possui estado vazio específico quando o indicador selecionado não contém pedidos.

## Persistência e consulta

### Autoria do pedido

Adicionar ao pedido uma referência opcional ao usuário que o criou. Novos pedidos devem preencher essa referência com o usuário autenticado no acesso de garçom.

O campo permanece anulável porque pedidos históricos não possuem informação confiável para backfill.

### Autoria do pagamento

Reutilizar `pagamento_pedido.registrado_por_usuario_id`, já preenchido no registro de pagamento. A consulta do caixa passa a retornar o nome desse usuário, além dos dados de pagamento necessários ao painel.

### Isolamento por empresa

Todas as relações com usuários devem respeitar o `tenantId` do pedido e do pagamento. Nenhum nome pode ser resolvido por uma consulta global apenas pelo identificador do usuário.

## Componentes e limites

- Evoluir `AdminStatCard` para aceitar comportamento interativo sem quebrar os usos estáticos existentes.
- Manter a composição do painel dentro de `AdminPedidosLive`.
- Evoluir `CashierOrder` com responsáveis opcionais e metadados mínimos do pagamento.
- Não alterar o fluxo de entrega, a máquina de estados do pedido ou atribuir automaticamente um caixa a pagamentos pendentes.
- Não modificar rotas, permissões, regras de pagamento ou frequência de atualização.

## Acessibilidade e responsividade

- Indicadores interativos devem ser elementos `button` reais.
- Foco visível, rótulo compreensível e estado expandido anunciado.
- Alvo mínimo confortável para toque.
- O painel deve funcionar em coluna no celular e manter leitura rápida no desktop.
- Cor não pode ser o único sinal de seleção.

## Atualização em tempo real

O painel deriva da coleção `pedidos` já mantida pelo cliente. Quando SSE ou polling atualizar essa coleção:

- a seleção atual permanece;
- responsáveis e valores visíveis são atualizados;
- o painel mostra o estado vazio caso a categoria deixe de possuir itens;
- formulários de pagamento e pedidos expandidos continuam preservados pelas regras atuais.

## Testes

- Migração e schema aceitam autoria anulável do pedido.
- A criação do pedido persiste o usuário autenticado.
- A consulta do caixa retorna autor do pedido e registrador do pagamento respeitando o tenant.
- Indicadores continuam renderizando no modo estático.
- Indicadores interativos abrem, alternam e fecham o painel.
- Pedidos históricos usam o fallback sem quebrar a tela.
- Polling/SSE não limpa a seleção ativa.

## Fora de escopo

- Atribuição manual de um caixa para cobrar pagamentos pendentes.
- Mudanças no fluxo de preparação ou entrega.
- Backfill especulativo de responsáveis históricos.
- Redesign das demais telas da plataforma neste incremento.
