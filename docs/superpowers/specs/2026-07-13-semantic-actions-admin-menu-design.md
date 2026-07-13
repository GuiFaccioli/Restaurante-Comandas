# Ações semânticas e categorias progressivas no admin

## Decisão

A plataforma adotará uma linguagem única de ações: **a cor comunica intenção e risco, nunca decoração e nunca sozinha**. Criar, salvar e concluir usam verde; editar e configurar usam azul; uma interrupção operacional reversível usa âmbar; excluir ou cancelar um objeto existente usa vermelho; navegar, fechar, voltar, sair e inspecionar permanecem neutros.

O Cardápio seguirá a mesma hierarquia. `Novo produto` continua como ação positiva proeminente no topo. A criação de categoria vira uma ação compacta dentro do painel `Categorias`, e a renomeação só aparece após ativar um lápis discreto ao lado da categoria. Apenas um editor inline pode ficar aberto por vez.

Esta abordagem mantém a interface contida: a maioria das superfícies continua neutra e a cor aparece somente onde ajuda a prever o efeito de uma ação.

## Caminho de revisão

1. Validar a taxonomia e a API de botões.
2. Validar o fluxo progressivo de categorias.
3. Conferir limites, acessibilidade e critérios de aceite.

## Escopo

### Incluído

- Tokens semânticos de ação para toda a plataforma.
- Evolução do `Button` compartilhado para separar **intenção** de **aparência**.
- Migração de botões de admin, garçom, cozinha, caixa e autenticação para a semântica correta.
- Adoção do componente compartilhado por botões nativos de ação, com exceções explícitas para controles compostos.
- Correção de ações neutras hoje representadas em vermelho, incluindo `Voltar`, `Sair`, `Fechar` e o `Cancelar` que apenas descarta ou fecha uma interface.
- Simplificação do gerenciamento de categorias em `/admin/menu`.
- Retorno do identificador da categoria recém-criada para selecioná-la sem inferência.
- Validação de nome de categoria no limite do servidor: aplicar `trim` e rejeitar valor vazio.
- Atualização de `DESIGN.md` durante a implementação para registrar a nova linguagem.

### Fora de escopo

- Alterar rotas, permissões, autenticação, isolamento por empresa ou regras de negócio.
- Alterar fluxos de pedido, pagamento, preparo, entrega ou atualização em tempo real.
- Redesenhar a estrutura geral das páginas ou introduzir decoração, gradientes, sombras pesadas ou novos status.
- Mudar a regra que impede excluir categorias com produtos.
- Criar um novo tema ou modo escuro.
- Usar, modificar, adicionar ao stage ou commitar os arquivos não rastreados `DESIGNTESTE.MD` e `revisao_geral.md`.

## Linguagem semântica de ações

### Intenções

| Intenção | Significado | Exemplos | Não usar para |
| --- | --- | --- | --- |
| `neutral` | Navegar, fechar, sair, inspecionar ou abandonar uma edição sem afetar um objeto persistido | Voltar, Fechar, Sair, Ver detalhes, Cancelar formulário | Excluir ou cancelar um pedido existente |
| `positive` | Criar, adicionar, salvar, confirmar, registrar ou concluir | Novo produto, Adicionar categoria, Salvar, Registrar pagamento, Confirmar entrega | Estado decorativo ou navegação |
| `informational` | Editar ou configurar algo existente | Editar produto, lápis da categoria, Configurações | Salvar a edição ou excluir o objeto |
| `warning` | Provocar uma interrupção operacional reversível | Tornar produto indisponível | Erro, exclusão definitiva ou aviso passivo |
| `destructive` | Excluir, remover ou cancelar um objeto ou pedido existente | Excluir produto, Excluir categoria, Cancelar pedido | Voltar, logout, fechar modal ou descartar rascunho |

`Cancelar` é classificado pelo efeito, não pela palavra. Fechar um formulário sem persistir é neutro; cancelar um pedido existente é destrutivo.

Status e ações continuam sendo conceitos diferentes. Cores de estado de pedido podem indicar `novo`, `em preparo`, `pronto` ou `entregue`, mas não definem automaticamente a intenção dos botões próximos.

### Paleta aprovada

Os valores abaixo são referências visuais e de contraste para os tokens CSS semânticos. A implementação deve expor nomes por função, não nomes como `green-600` nos componentes.

| Intenção | Sólido | Hover sólido | Suave | Texto suave / contorno |
| --- | --- | --- | --- | --- |
| Neutra | `#0a0a0a` com branco | `#262626` | `#f7f7f7` | `#262626`; borda interativa `#767676` |
| Positiva | `#15803d` com branco | `#166534` | `#ecfdf3` | `#166534`; contorno `#15803d` |
| Informativa | `#175cd3` com branco | `#1849a9` | `#eff8ff` | `#175cd3` |
| Alerta | `#fde68a` com `#713f12` | `#fcd34d` com `#713f12` | `#fffbeb` | `#92400e`; contorno `#b45309` |
| Destrutiva | `#b42318` com branco | `#912018` | `#fff1f0` | `#b42318` |

O anel de foco usa `#007f62`, com afastamento visível da superfície. Em fundo branco, ele possui contraste aproximado de `4.99:1`. Os pares de texto da tabela superam `4.5:1`; bordas e ícones interativos devem atingir pelo menos `3:1` contra a superfície adjacente.

### Aparências e estados

| Aparência | Uso | Comportamento |
| --- | --- | --- |
| `solid` | Única ação mais importante de uma região | Fundo da intenção, texto contrastante e hover mais escuro; não repetir vários sólidos concorrentes no mesmo bloco |
| `soft` | Ação semântica secundária | Fundo explícito de baixa saturação e texto escuro da mesma intenção |
| `outline` | Ação secundária em superfície clara | Fundo neutro, texto e borda da intenção; no hover recebe a superfície suave da mesma intenção |
| `ghost` | Ação terciária ou icon-only | Sem fundo em repouso; texto/ícone da intenção e superfície suave no hover |
| `link` | Ação textual de baixa ênfase | Sem recipiente; sublinhado no hover e foco completo |

Regras comuns:

- Hover e active preservam a intenção; uma ação nunca troca de verde para vermelho ao interagir.
- Active pode manter o deslocamento atual de `1px`, sem animação decorativa.
- Foco usa anel de `2px`, offset de `2px` e separação da superfície; em fundos coloridos, uma camada de contraste entre controle e anel evita que ele desapareça.
- Disabled remove a cor de intenção, usa superfície e texto neutros legíveis, bloqueia hover/active e utiliza o atributo nativo `disabled` quando disponível. Opacidade não pode ser o único sinal.
- Loading mantém o nome acessível, expõe `aria-busy="true"`, impede duplo envio e não altera o significado cromático.
- Ícone, rótulo, texto de confirmação e estado acessível acompanham a cor. Vermelho e verde nunca são o único modo de distinguir duas ações.

## Arquitetura do `Button`

### API estável

O componente compartilhado separa dois eixos:

```tsx
type ButtonIntent =
  | 'neutral'
  | 'positive'
  | 'informational'
  | 'warning'
  | 'destructive'

type ButtonAppearance = 'solid' | 'soft' | 'outline' | 'ghost' | 'link'

<Button intent="positive" appearance="solid">Novo produto</Button>
<Button
  intent="informational"
  appearance="ghost"
  size="icon"
  className="size-11"
  aria-label="Editar categoria Bebidas"
>
  <Pencil aria-hidden="true" />
</Button>
```

`intent` responde **o que a ação faz**; `appearance` responde **quanta ênfase ela merece**. O default de compatibilidade é `neutral + solid`, mas toda ação que altera dados deve declarar a intenção explicitamente no ponto de uso.

O utilitário de estilos exportado para links ou primitivas compostas deve aceitar os mesmos eixos. Classes ad hoc como `bg-red-*`, `text-green-*` ou condicionais cromáticas por tela deixam de ser a fonte de verdade para ações.

### Compatibilidade temporária

Durante a migração, `variant` continua disponível apenas no limite do `Button`, com este mapeamento:

| Alias legado | Semântica temporária |
| --- | --- |
| `default` | `neutral + solid` |
| `outline` | `neutral + outline` |
| `secondary` | `neutral + soft` |
| `ghost` | `neutral + ghost` |
| `success` | `positive + solid` |
| `destructive` | `destructive + soft` |
| `link` | `neutral + link` |

Os tipos devem impedir misturar `variant` com `intent` ou `appearance` na mesma chamada. Código novo não usa aliases. Após a migração completa e a verificação do repositório, o alias e seu ramo de compatibilidade são removidos em uma fase separada e rastreável.

O alias `default` é deliberadamente neutro: inferir que todo botão preto é positivo perpetuaria o problema atual. Cada criação, salvamento ou confirmação existente deve ser classificada no call site.

Ações neutras de navegação ou dismissão, como `Voltar`, `Sair`, `Fechar` e cancelar um formulário, usam normalmente `ghost` ou `outline`, não o sólido preto. O sólido neutro permanece disponível para raras ações prioritárias sem direção positiva, mas não é o fallback visual de toda a plataforma.

### Botões nativos

- Elementos `<button>` que executam ações comuns passam a usar `Button`.
- Tabs, disclosures, seletores de linha e triggers exigidos por uma primitiva acessível podem continuar nativos, mas devem consumir o utilitário semântico compartilhado e manter os atributos ARIA do padrão.
- Links de navegação permanecem links reais; quando tiverem aparência de botão, usam o utilitário semântico sem perder a semântica de navegação.
- Uma auditoria final registra as exceções remanescentes. Não devem existir botões de ação com paleta semântica duplicada localmente.

## Cardápio: gerenciamento progressivo de categorias

### Hierarquia da página

1. `Novo produto` permanece no cabeçalho, com `positive + solid`.
2. Existe um único painel `Categorias`; o card separado `Nova categoria` é removido.
3. O cabeçalho do painel recebe uma ação compacta `Adicionar`, com ícone de mais, `positive + ghost` e alvo mínimo de `44 × 44px`.
4. Cada linha contém o nome selecionável e, ao lado, um lápis `informational + ghost` com alvo de `44 × 44px`.
5. Renomear e excluir ficam ocultos até o usuário abrir a edição daquela categoria.

Não haverá cards aninhados. Formulários inline são separados por espaçamento, uma borda hairline completa quando necessária e hierarquia tipográfica, não por um novo quadrado decorativo.

### Criação inline

- Ativar `Adicionar` abre um formulário compacto logo abaixo do cabeçalho do painel e antes da lista.
- O campo recebe foco imediatamente.
- `Enter` salva; `Escape` cancela e restaura foco em `Adicionar`.
- Salvar usa `positive`; cancelar o rascunho usa `neutral`.
- Após uma criação bem-sucedida, o formulário fecha e o foco retorna a `Adicionar`; a categoria criada fica selecionada no estado da página.
- Durante o envio, campo e ações relacionadas ficam desabilitados, o formulário expõe busy e um segundo envio é ignorado.
- Erro mantém o texto digitado e aparece junto ao campo com `role="alert"`. Toast pode complementar, nunca substituir o erro inline.

### Edição inline

- O lápis possui `aria-label="Editar categoria {nome}"`.
- Um tooltip `Editar categoria` é renderizado em portal, sem ser cortado pelo painel. O tooltip é apoio visual; o nome acessível não depende dele.
- Ativar o lápis abre o editor logo abaixo da respectiva linha, foca o campo e seleciona o nome atual.
- `Enter` salva; `Escape` cancela e devolve foco ao mesmo lápis.
- Após renomear com sucesso, o editor fecha e o foco retorna ao lápis da categoria renomeada.
- Salvar usa `positive`; cancelar usa `neutral`.
- `Excluir categoria` aparece somente dentro do editor, como `destructive + ghost`. A confirmação de exclusão existente é preservada.
- Se a exclusão falhar por conter produtos, o editor permanece aberto e apresenta o erro inline com `role="alert"`.

A abertura de criação fecha uma edição existente; a abertura de uma edição fecha a criação ou outra edição. Nunca existem dois rascunhos de categoria simultâneos.

### Modelo de estado

O estado progressivo é uma união exclusiva:

```ts
type CategoryEditorState =
  | { mode: 'idle' }
  | { mode: 'create' }
  | { mode: 'edit'; categoryId: string }
```

O rascunho, o erro inline e a mutação pendente pertencem ao editor ativo. Uma referência separada guarda o trigger para restauração de foco; elementos DOM não são armazenados no estado serializável.

`MenuAdminClient` continua responsável pela categoria selecionada e pelo formulário de produto. Um componente `CategoryManager` bem delimitado recebe categorias, seleção e callbacks, e encapsula o estado progressivo, foco, busy e erros. A página não duplica essas regras em cada linha.

### Fluxo de dados

1. A categoria selecionada é derivada de `selectedCategoryId` e das props atualizadas.
2. `criarCategoria(rawName)` aplica `trim`, rejeita vazio no servidor e retorna ao menos `{ id, nome }` da linha criada.
3. Após sucesso, o cliente define imediatamente `selectedCategoryId` com o `id` retornado, fecha o editor e solicita `router.refresh()`.
4. Assim, a primeira categoria recém-criada é selecionada sem depender da posição da lista, e `Novo produto` passa a funcionar para ela.
5. Renomear mantém a seleção atual. Excluir seleciona a próxima categoria na ordem; se não houver próxima, usa a anterior; se a lista ficar vazia, limpa a seleção.
6. Quando novas props chegam, uma seleção ainda válida é preservada. A exclusão controlada usa a próxima/anterior descrita acima; se uma atualização externa remover a seleção sem contexto de posição, usa a primeira categoria da ordem estável ou limpa a seleção quando não houver nenhuma.

As ações de servidor mantêm autorização, tenant e regras existentes. O único endurecimento adicional é normalizar o nome e rejeitar strings vazias ou compostas apenas por espaços.

### Estados vazios

- **Sem categorias:** o painel mantém `Adicionar` visível e mostra uma frase curta no próprio painel; a área de produtos explica que é necessário criar uma categoria. `Novo produto` fica desabilitado com descrição acessível do motivo.
- **Categoria sem produtos:** a área de produtos orienta a usar `Novo produto`, que permanece habilitado para a categoria selecionada.
- **Categoria removida:** o foco vai para o lápis da categoria selecionada como fallback; se nenhuma restar, volta para `Adicionar`.

## Responsividade e acessibilidade

- Desktop mantém categorias ao lado da lista de produtos; mobile empilha o painel antes dos produtos.
- Linhas aceitam nomes longos sem empurrar o lápis para fora da tela.
- Formulários inline ocupam a largura disponível no mobile; ações podem quebrar linha sem overflow horizontal.
- Todos os controles têm alvo mínimo de `44 × 44px`, foco visível e ordem de tabulação coerente.
- Botões icon-only possuem nome acessível específico ao objeto.
- O estado selecionado da categoria não depende apenas de cor: usa `aria-current` ou `aria-pressed` e diferença de peso/superfície.
- Mensagens de erro usam texto explícito e `role="alert"`; busy e disabled são anunciados e visualmente distintos.
- Tooltip funciona com hover e foco, mas nenhuma operação depende dele.
- Movimento de reveal fica entre `150–250ms` e respeita `prefers-reduced-motion`; pode ser omitido se não esclarecer a mudança de estado.

## Migração em fases

1. **Fundação:** adicionar tokens semânticos e a API `intent + appearance`, preservando aliases temporários.
2. **Correções prioritárias:** trocar `Voltar`, `Sair`, `Fechar` e cancelamentos de interface de vermelho para neutro; classificar exclusões e cancelamentos persistidos como destrutivos.
3. **Plataforma inteira:** migrar ações em admin, garçom, cozinha, caixa e autenticação; adotar o componente compartilhado ou o utilitário comum nas exceções.
4. **Cardápio:** substituir o card de criação pelo fluxo inline, adicionar o lápis progressivo e implementar seleção pela resposta da criação.
5. **Contrato visual:** atualizar `DESIGN.md` com intenções, aparências, tokens e exemplos. Não tocar nos dois arquivos não rastreados excluídos do escopo.
6. **Limpeza:** auditar classes locais e aliases; remover compatibilidade apenas quando nenhum consumidor legado permanecer.

Cada fase deve preservar a execução da aplicação. A migração não pode deixar metade dos botões com a nova taxonomia e metade reinterpretando vermelho como navegação.

## Critérios de aceite

- [ ] Cor de ação segue a taxonomia em todas as áreas da plataforma.
- [ ] `Voltar`, `Sair`, `Fechar` e cancelamento de formulário são neutros.
- [ ] Criar, adicionar, salvar, confirmar, registrar e concluir são positivos.
- [ ] Editar e configurar são informativos; excluir, remover e cancelar um objeto persistido são destrutivos.
- [ ] Interrupções operacionais reversíveis, como tornar um produto indisponível, usam alerta e texto que descreve a ação.
- [ ] Cor nunca é o único sinal de significado ou estado.
- [ ] `Button` separa `intent` de `appearance`, impede mistura com aliases e centraliza estados interativos.
- [ ] Botões nativos remanescentes são primitivas justificadas e consomem estilos semânticos compartilhados.
- [ ] `Novo produto` permanece no topo, positivo e habilita ao selecionar a primeira categoria criada.
- [ ] `Adicionar` fica dentro do único painel de categorias; não existe card `Nova categoria`.
- [ ] Cada categoria tem apenas um lápis visível em repouso; renomear e excluir aparecem somente no editor.
- [ ] Só um editor fica aberto; Enter salva, Escape cancela e o foco retorna ao trigger correto.
- [ ] Tooltip do lápis usa portal e o botão possui nome acessível independente.
- [ ] Busy impede envio duplicado; falhas mantêm rascunho e aparecem inline com `role="alert"`.
- [ ] O servidor aplica `trim`, rejeita nome vazio e retorna o identificador criado sem enfraquecer autorização ou tenant.
- [ ] Estados sem categoria e sem produto orientam a próxima ação no desktop e no mobile.
- [ ] `DESIGN.md` documenta o contrato final; `DESIGNTESTE.MD` e `revisao_geral.md` permanecem intactos e não rastreados.

## Testes e verificação

### Automatizados

- Renderização de cada combinação suportada de intenção e aparência, incluindo hover/focus por classes/tokens e disabled/loading por comportamento.
- Tipagem rejeita `variant` junto com `intent` ou `appearance`.
- Aliases produzem apenas o mapeamento temporário documentado.
- Auditoria de ações críticas impede regressão de vermelho em `Voltar`, `Sair`, `Fechar` e cancelamentos dismissivos.
- Ações de categoria aplicam `trim`, rejeitam valor vazio no servidor e retornam o `id` criado.
- Criação seleciona o identificador retornado e habilita `Novo produto`, inclusive quando a lista começou vazia.
- Criação e edição alternam de forma exclusiva; Enter salva, Escape cancela e erros preservam o rascunho.
- Exclusão só fica disponível dentro do editor e mantém a regra de categoria com produtos.
- Seleção é reconciliada após refresh, renomeação e exclusão.
- Nomes acessíveis, `aria-current`/`aria-pressed`, `aria-busy`, disabled e `role="alert"` são verificados.
- Testes existentes de regras de negócio, autenticação, tenant, rotas e tempo real continuam passando.

### Navegador

Verificar `/admin/menu` com teclado e ponteiro em desktop e viewport móvel próxima de `390 × 844`:

- hierarquia de `Novo produto`, `Adicionar` e lápis;
- portal do tooltip sem clipping;
- foco ao abrir, salvar, cancelar e excluir;
- um editor por vez, estados busy e erro inline;
- zero categorias, categoria sem produtos e nomes longos;
- ausência de overflow horizontal e alvos de `44 × 44px`.

Fazer também uma passagem curta pelas telas representativas de admin, garçom, cozinha, caixa e autenticação para confirmar consistência semântica, foco visível e ausência de ações neutras vermelhas. Validar contraste com ferramenta automatizada e emulação de deficiências de visão cromática; depois executar lint, checagem de tipos, testes e build de produção.
