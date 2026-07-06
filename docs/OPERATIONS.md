# Operação mobile e atualização automática

Este sistema é usado em celular, cozinha e caixa. Por isso, telas operacionais
não podem depender de F5.

## Regra de atualização

Telas que mostram pedidos, cozinha, entregas do garçom, mesa ou caixa devem usar:

- SSE quando houver evento em tempo real disponível; e/ou
- polling seguro de 5 segundos por endpoint JSON leve.

O polling deve atualizar listas e status sem destruir estado local do usuário.

## O que nunca pode ser resetado por refresh automático

- carrinho em andamento;
- drawer aberto;
- modal aberto;
- pedido expandido no caixa;
- formulário de pagamento em preenchimento;
- qualquer campo parcialmente digitado.

## Login lembrado

O login pode lembrar apenas o último e-mail no aparelho.

Senha não deve ser salva manualmente em `localStorage`, `sessionStorage`,
cookie legível por JavaScript ou estado customizado. Para senha, o sistema usa
`autoComplete="current-password"` e delega ao gerenciador de senhas do navegador.

## Caixa

`/admin/pedidos` é a tela operacional do caixa. Ela deve permitir abrir o pedido,
ver mesa, status, itens, totais, status de pagamento e registrar pagamento externo
para pedidos entregues ainda pendentes.

O app apenas registra pagamentos externos; não processa PIX, cartão ou gateway.
