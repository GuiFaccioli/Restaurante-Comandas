# Mensagens do sistema

Este catálogo complementa a skill de tom de voz e serve como referência para novas telas e fluxos. As mensagens devem explicar o que aconteceu sem culpar a pessoa e sem inventar uma causa.

## Estados que já foram padronizados

| Situação | Mensagem |
|---|---|
| Falha inesperada em formulário | Não foi possível concluir a ação por um erro inesperado. |
| Falha ao carregar uma área | Não conseguimos carregar esta área agora. |
| Falha ao confirmar pedido | Não foi possível confirmar o pedido por um erro inesperado. |
| Falha ao atualizar pedidos | Não conseguimos atualizar os pedidos agora. |
| Estoque insuficiente | Não há estoque suficiente para adicionar mais este item. |
| Falha ao confirmar entrega | Não foi possível confirmar a entrega por um erro inesperado. |
| Entrega salva, lista desatualizada | Entrega registrada. A lista ainda não foi atualizada. |

## Mensagens que devem existir quando os fluxos forem implementados

| Situação | Mensagem recomendada |
|---|---|
| Sessão expirada | Sua sessão expirou. Entre novamente para continuar. |
| Sem internet | Sem conexão com a internet. Reconecte-se para continuar. |
| Serviço indisponível | O AgilizaFluxo está temporariamente indisponível. |
| Acesso sem permissão | Você não tem permissão para acessar esta área. |
| Produto duplicado | Este produto já está cadastrado. |
| Categoria duplicada | Esta categoria já está cadastrada. |
| Campo obrigatório | O nome é obrigatório. Informe um nome para continuar. |
| Valor inválido | O preço deve ser maior que zero. |
| Mesa já ocupada | A mesa 4 já possui um atendimento em aberto. |
| Pedido não pode ser cancelado | Este pedido não pode ser cancelado porque já foi entregue. |
| Conta ainda em andamento | A conta ainda possui pedidos em andamento. |
| Pagamento acima do saldo | O valor não pode ser maior que o saldo pendente. |
| Ficha técnica incompleta | Este produto possui controle de estoque, mas ainda não tem uma ficha técnica completa. |
| Item já usado em ficha | Este insumo não pode ser excluído porque faz parte de uma ficha técnica. |
| Lista vazia | Ainda não há itens para mostrar aqui. |

## Regras

- A causa conhecida vem primeiro; o próximo passo aparece apenas quando ajuda.
- Erros de infraestrutura não exibem códigos, stack traces, nomes de tabelas ou endpoints.
- Mensagens de erro podem ser diretas. Acolhimento não significa esconder o problema.
- Números e limites conhecidos devem aparecer na mensagem.
