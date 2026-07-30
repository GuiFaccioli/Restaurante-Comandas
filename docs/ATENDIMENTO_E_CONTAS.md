# Atendimento e contas

## Modelo

- **Mesa**: local físico do restaurante.
- **Atendimento (comanda)**: ciclo de consumo de uma pessoa ou grupo na mesa.
- **Pedido**: uma rodada enviada à cozinha; permanece separado no histórico.
- **Pagamento**: valor recebido para liquidar um atendimento, total ou parcialmente.

Um atendimento possui vários pedidos e cada pedido pertence a exatamente um atendimento. O caixa agrupa por atendimento, nunca apenas por mesa.

## Estados e transições

- `OPEN`: cliente consumindo e novos pedidos permitidos.
- `AWAITING_PAYMENT`: consumo encerrado e conta disponível para o caixa.
- `PAID`: saldo quitado e atendimento encerrado.
- `CANCELLED`: atendimento cancelado por uma permissão administrativa.

`OPEN` vai para `AWAITING_PAYMENT` quando o garçom envia a conta. Uma conta pendente pode voltar a `OPEN` em **Continuar atendimento**. **Iniciar novo atendimento** preserva a conta anterior e cria outra `OPEN`. O pagamento move somente a conta selecionada para `PAID`.

O status do atendimento não substitui o status do pedido. Um pedido entregue continua compondo a conta.

## Fluxo do garçom

Ao abrir uma mesa sem atendimento ativo ou conta pendente, o sistema cria um atendimento `OPEN`. Se já houver um atendimento `OPEN`, ele é aberto diretamente. Se houver uma ou mais contas pendentes, o garçom escolhe explicitamente qual deseja continuar ou inicia um novo atendimento.

Quando há mais de uma conta pendente, nenhuma é escolhida automaticamente. A conta retomada sai temporariamente da fila principal do caixa até ser enviada novamente para pagamento.

## Caixa

O caixa lista atendimentos com seus pedidos, subtotais, pagamentos registrados e saldo pendente. Pagamentos parciais preservam o histórico. Pagar uma conta anterior não fecha nem libera uma mesa que ainda possua outro atendimento `OPEN`.

## Estado derivado da mesa

O estado visual é calculado por `deriveMesaOperationalState`:

- `LIVRE`: nenhum `OPEN` e nenhuma conta pendente.
- `EM ATENDIMENTO`: existe `OPEN`.
- `EM ATENDIMENTO + CONTA PENDENTE`: existe `OPEN` e existe conta pendente.
- `CONTA PENDENTE`: não existe `OPEN`, mas existe conta pendente.

Contas pagas ou canceladas não ocupam a mesa.

## Concorrência e segurança

O atendimento é sempre filtrado pelo tenant autenticado. A tabela possui chave composta tenant/entidade, o pedido e o pagamento carregam `atendimentoId`, e um índice único parcial permite somente um atendimento `OPEN` por mesa e restaurante. A criação e a reabertura usam transação e bloqueio da mesa. Em corrida, a segunda criação reutiliza o atendimento aberto vencedor.

## Migration e backfill

Pedidos legados não são agrupados por `tableId`. Como não existe uma chave histórica confiável para identificar o cliente, a migration cria um atendimento por pedido, preservando a separação e os preços históricos. Pedidos entregues tornam-se contas pendentes; pedidos já pagos tornam-se `PAID`; cancelados tornam-se `CANCELLED`; apenas o pedido mais recente ainda não finalizado por mesa pode representar o atendimento aberto.

## Casos-limite

- pedido enviado, em preparo ou pronto impede enviar o atendimento para pagamento;
- pedido entregue continua no total;
- conta parcialmente paga permanece pendente;
- pagamento de uma conta não altera outro atendimento da mesa;
- pedido, atendimento, mesa e pagamento de outro tenant são rejeitados;
- cozinha continua trabalhando por pedido, sem agrupar cartões por conta.
