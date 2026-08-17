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

## Mensagens configuradas nos fluxos atuais

| Camada | Situação | Mensagem |
|---|---|---|
| Cadastro | E-mail já usado | Este e-mail já está cadastrado. Entre na sua conta ou use outro e-mail. |
| Cadastro | Senha curta | A senha precisa ter pelo menos 8 caracteres. |
| Cadastro | Senhas diferentes | As senhas não coincidem. |
| Produto | Categoria de outra empresa | A categoria selecionada não pertence a este restaurante. |
| Produto | Nome ausente | Informe o nome do produto. |
| Produto | Preço ausente | Informe o preço do produto. |
| Mesa | Número inválido | Informe um número de mesa inteiro maior que zero. |
| Mesa | Número repetido | A mesa {número} já está cadastrada. |
| Atendimento | Mesa indisponível | A mesa não existe, está inativa ou não pertence a este restaurante. |
| Pedido | Sem mesa | Mesa inválida: selecione uma mesa antes de confirmar o pedido. |
| Pedido | Sem itens | Pedido vazio: adicione pelo menos um item ao pedido. |
| Pedido | Item incompleto | Item inválido: cada item precisa ter um produto e uma quantidade inteira maior que zero. |
| Cozinha | Mudança de status não permitida | Status de cozinha inválido: a cozinha só pode mover o pedido para “em preparo” ou “pronto”. |

As mensagens acima devem aparecer preservando o que já foi digitado. Quando a causa estiver associada a um campo, a próxima evolução é retornar também o campo para aplicar o destaque vermelho diretamente nele.
