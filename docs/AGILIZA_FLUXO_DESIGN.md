## Experiência por perfil e dispositivo

O Agiliza Fluxo não deve apenas adaptar a mesma interface para
diferentes tamanhos de tela. Cada perfil possui uma experiência
principal baseada em seu contexto de trabalho.

### OWNER e ADMIN — desktop-first

Priorizar:
- dashboard;
- cardápio;
- estoque;
- ficha técnica;
- movimentações;
- relatórios;
- equipe;
- configurações.

No desktop:
- usar navegação lateral;
- permitir tabelas e filtros persistentes;
- exibir mais contexto;
- permitir formulários completos;
- usar drawers para detalhes e edições rápidas.

No mobile:
- oferecer acompanhamento, alertas e ações urgentes;
- evitar reproduzir integralmente telas administrativas densas;
- não tornar relatórios e cadastros complexos o fluxo principal.

### WAITER — mobile-first

Priorizar:
- mesas;
- comandas;
- busca de produtos;
- inclusão e remoção de itens;
- observações;
- envio para cozinha;
- acompanhamento do pedido.

Regras:
- uma coluna;
- navegação inferior;
- botões com no mínimo 44px;
- ação principal fixa;
- poucos campos por etapa;
- nenhuma informação de gestão que não ajude no atendimento.

### COOK — tablet e desktop-first

Priorizar:
- pedidos aguardando;
- tempo de espera;
- itens e quantidades;
- observações;
- início e conclusão do preparo.

Regras:
- cards grandes;
- leitura à distância;
- Kanban horizontal;
- atualização de status com um toque;
- evitar formulários e menus administrativos.

### CASHIER — desktop e tablet-first

Priorizar:
- pedidos entregues;
- pagamentos pendentes;
- valor total;
- forma de pagamento;
- divisão da conta;
- confirmação e fechamento.

### Princípio

Responsividade não significa apenas diminuir componentes.

A interface deve mudar sua hierarquia, navegação, densidade e
ações conforme o perfil, o dispositivo e o contexto de uso.


Agiliza Fluxo — Design System

1. Visão geral

O Agiliza Fluxo é um sistema de operação para restaurantes, bares e pizzarias que conecta:

comandas;

mesas;

pedidos;

cozinha;

caixa;

estoque;

fichas técnicas;

movimentações e relatórios.

A experiência não deve parecer um software empresarial complexo. O produto precisa ser entendido rapidamente por pessoas que trabalham sob pressão, usam o sistema em celulares, tablets ou computadores e nem sempre têm familiaridade com tecnologia.

A interface deve comunicar:

“Eu sei onde estou.”

“Eu sei o que preciso fazer agora.”

“Eu consigo concluir sem medo de errar.”

“O sistema está me ajudando, não me atrasando.”

A principal assinatura visual do produto é o fluxo operacional conectado:

Pedido recebido → cozinha preparando → pedido pronto → pagamento → estoque atualizado.

Esse fluxo deve aparecer de forma visual em dashboards, estados, históricos e telas de acompanhamento.

2. Princípios de experiência

2.1 Clareza antes de densidade

Não mostrar tudo ao mesmo tempo.

Informações avançadas devem aparecer apenas quando forem necessárias, usando:

“Mais opções”;

painéis expansíveis;

menus de ações;

detalhes em drawer ou modal;

etapas progressivas.

2.2 A ação principal precisa ser óbvia

Cada tela deve ter uma ação principal dominante.

Exemplos:

Mesas: Abrir comanda

Pedidos: Enviar para cozinha

Cozinha: Iniciar preparo

Estoque: Registrar entrada

Produtos: Novo produto

Caixa: Receber pagamento

Evitar duas ou três ações com o mesmo peso visual.

2.3 Menos leitura, mais reconhecimento

A interface deve usar:

ícones conhecidos acompanhados de texto;

estados visuais;

cores semânticas;

números grandes;

rótulos curtos;

frases orientadas à ação.

Evitar textos longos explicando o funcionamento da tela.

2.4 Reduzir medo de errar

A interface deve deixar claro:

o que será alterado;

o que pode ser desfeito;

o que exige confirmação;

quando algo foi salvo;

o que aconteceu depois da ação.

Exemplo:

“Entrada registrada. Estoque de farinha atualizado para 18,5 kg.”

2.5 Projetado para ambientes de pressão

O sistema será usado com:

fila de clientes;

barulho;

interrupções;

pressa;

telas compartilhadas;

mãos ocupadas;

dispositivos diferentes.

Por isso:

botões importantes devem ser grandes;

ações frequentes devem exigir poucos passos;

textos devem ser curtos;

feedback deve ser imediato;

estados devem ser facilmente escaneáveis.

2.6 A interface deve ensinar pelo uso

O produto deve depender pouco de treinamento.

Sempre que possível:

usar termos conhecidos do restaurante;

manter padrões entre telas;

mostrar exemplos dentro dos campos;

usar estados vazios explicativos;

sugerir o próximo passo.

3. Personalidade da marca

A marca é

simples;

amigável;

prática;

confiável;

produtiva;

direta;

próxima;

organizada.

A marca não é

excessivamente tecnológica;

fria;

corporativa demais;

infantil;

cheia de termos técnicos;

visualmente agressiva;

sobrecarregada.

Tom emocional

A sensação deve ser de um ambiente:

leve;

organizado;

sob controle;

ativo;

acolhedor.

A produtividade deve ser percebida como fluidez, não como cobrança.

4. Mensagem do produto

Posicionamento principal

Agiliza Fluxo organiza pedidos, cozinha e estoque para o restaurante trabalhar com mais agilidade e menos tarefas manuais.

Mensagens curtas

Mais produtividade, menos papel.

Do pedido ao estoque, tudo conectado.

Sua operação mais simples.

Menos confusão, mais controle.

Pedidos rápidos, estoque organizado.

Tudo no fluxo certo.

Evitar

“Transformação digital.”

“Ecossistema omnichannel.”

“Orquestração operacional.”

“Solução disruptiva.”

“Gestão inteligente 360.”

“Alta performance operacional.”

Essas frases soam abstratas para o público inicial.

5. Cores

A paleta deve comunicar produtividade, confiança e proximidade.

O produto deve usar modo claro como padrão, pois facilita leitura em cozinhas, balcões e ambientes bem iluminados.

colors:
  primary: "#1F7A4D"
  primary-hover: "#17613D"
  primary-active: "#114C30"
  primary-soft: "#EAF6EF"

  accent: "#F2A93B"
  accent-soft: "#FFF4DE"

  canvas: "#F6F8F7"
  surface: "#FFFFFF"
  surface-muted: "#F0F3F1"
  surface-strong: "#E7ECE9"

  ink: "#18211C"
  body: "#45534A"
  muted: "#6D7A71"
  disabled: "#9DA8A1"
  on-primary: "#FFFFFF"

  border: "#D8E0DB"
  border-strong: "#BCC8C0"

  success: "#208A52"
  success-soft: "#E8F7EE"

  warning: "#C98216"
  warning-soft: "#FFF3D8"

  error: "#C64343"
  error-soft: "#FDECEC"

  info: "#2E6EB5"
  info-soft: "#EAF2FB"

  preparing: "#D97706"
  ready: "#208A52"
  pending: "#6D7A71"
  delivered: "#2E6EB5"
  cancelled: "#C64343"

Função das cores

Verde principal

Usado para:

ação principal;

confirmação;

conclusão;

marca;

itens em estado positivo;

produtividade e avanço.

Não usar o verde em todas as superfícies.

Amarelo/âmbar

Usado para:

atenção;

pedidos aguardando;

estoque baixo;

destaque leve;

ação que precisa de acompanhamento.

Vermelho

Reservado para:

cancelar;

excluir;

erro;

perda de estoque;

pagamento falhou;

item indisponível.

Não usar vermelho em ações neutras.

Azul

Usado para:

informações;

edição;

detalhes;

ações secundárias;

estados concluídos que não representam sucesso operacional.

6. Tipografia

A fonte deve ser familiar, legível e gratuita.

Fonte recomendada:

Inter

Alternativas:

Geist;

Source Sans 3;

system-ui.

typography:
  display-xl:
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -1.2px

  display-lg:
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.8px

  display-md:
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif"
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.4px

  title-lg:
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif"
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.3

  title-md:
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4

  title-sm:
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4

  body-lg:
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.5

  body-md:
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5

  body-sm:
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45

  caption:
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4

  button:
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1

Regras tipográficas

Usar no máximo três tamanhos principais por tela.

Não usar texto menor que 12px.

Ações principais devem ter verbos.

Evitar caixa alta em textos longos.

Não usar frases longas dentro de botões.

Valores importantes devem ser maiores que seus rótulos.

Exemplo:

18,5 kg
Farinha disponível

7. Espaçamento

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  base: 16px
  md: 20px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 64px

Regras

Base de 4px.

Formulários: 16px entre campos relacionados.

Cards: 20px ou 24px de padding.

Seções: 32px entre blocos.

Evitar elementos colados nas bordas.

Uma tela operacional pode ser densa, mas nunca apertada.

8. Formas e bordas

rounded:
  xs: 6px
  sm: 8px
  md: 10px
  lg: 14px
  xl: 18px
  full: 9999px

Uso

Botões: 10px.

Inputs: 10px.

Cards: 14px.

Modais: 18px.

Badges de status: full.

A interface deve parecer amigável, mas não infantil.

Evitar:

excesso de pílulas;

cards excessivamente arredondados;

bordas grossas;

sombras pesadas.

9. Elevação e profundidade

O sistema usa:

fundo levemente acinzentado;

superfícies brancas;

bordas discretas;

sombras suaves apenas quando ajudam a separar camadas.

shadows:
  card: "0 1px 2px rgba(24, 33, 28, 0.06)"
  dropdown: "0 8px 24px rgba(24, 33, 28, 0.12)"
  modal: "0 16px 48px rgba(24, 33, 28, 0.18)"

Não criar profundidade usando muitas sombras.

10. Layout geral da aplicação

Desktop

┌──────────────┬─────────────────────────────────────────────┐
│              │ Cabeçalho da página                        │
│ Navegação    ├─────────────────────────────────────────────┤
│ lateral      │                                             │
│              │ Conteúdo principal                          │
│              │                                             │
│              │                                             │
└──────────────┴─────────────────────────────────────────────┘

Navegação principal

Ordem sugerida:

Visão geral

Mesas

Pedidos

Cozinha

Cardápio

Estoque

Caixa

Relatórios

Equipe

Configurações

Agrupamentos possíveis:

OPERAÇÃO
- Mesas
- Pedidos
- Cozinha
- Caixa

GESTÃO
- Cardápio
- Estoque
- Relatórios

ADMINISTRAÇÃO
- Equipe
- Configurações

Mobile

No mobile, priorizar:

operação atual;

mesas;

pedidos;

cozinha;

busca;

ação principal.

A navegação pode usar barra inferior com até cinco itens.

11. Componentes

11.1 Botão principal

button-primary:
  backgroundColor: "{colors.primary}"
  textColor: "{colors.on-primary}"
  height: 44px
  padding: "0 18px"
  rounded: "{rounded.md}"
  typography: "{typography.button}"

Usar para a ação principal da tela.

Exemplos:

Abrir comanda

Enviar para cozinha

Iniciar preparo

Registrar entrada

Receber pagamento

Salvar produto

11.2 Botão secundário

button-secondary:
  backgroundColor: "{colors.surface}"
  textColor: "{colors.ink}"
  border: "1px solid {colors.border}"
  height: 44px
  padding: "0 18px"
  rounded: "{rounded.md}"

Exemplos:

Voltar

Ver detalhes

Imprimir

Duplicar

11.3 Botão destrutivo

button-danger:
  backgroundColor: "{colors.error}"
  textColor: "#FFFFFF"
  height: 44px
  padding: "0 18px"
  rounded: "{rounded.md}"

Exemplos:

Cancelar pedido

Remover item

Excluir produto

Ações destrutivas devem exigir confirmação quando não puderem ser desfeitas.

11.4 Botão de ícone

Deve sempre possuir:

tooltip;

rótulo acessível;

área mínima de toque;

ícone conhecido.

Evitar deixar ações importantes apenas como ícone.

11.5 Campo de texto

text-input:
  backgroundColor: "{colors.surface}"
  textColor: "{colors.ink}"
  border: "1px solid {colors.border}"
  height: 46px
  padding: "0 14px"
  rounded: "{rounded.md}"
  typography: "{typography.body-md}"

Cada campo deve ter:

rótulo acima;

exemplo ou placeholder;

mensagem de erro próxima;

unidade visível quando aplicável.

Exemplo:

Quantidade
[ 2,500 ] [ kg ]

11.6 Cards

Cards devem agrupar uma decisão ou contexto.

Não transformar toda informação em card.

Tipos principais:

card de mesa;

card de pedido;

card de item da cozinha;

card de item de estoque;

card de resumo operacional;

card de alerta.

11.7 Status

status:
  pending:
    label: "Aguardando"
    color: "{colors.pending}"
  preparing:
    label: "Em preparo"
    color: "{colors.preparing}"
  ready:
    label: "Pronto"
    color: "{colors.ready}"
  delivered:
    label: "Entregue"
    color: "{colors.delivered}"
  cancelled:
    label: "Cancelado"
    color: "{colors.cancelled}"

Status nunca deve depender apenas da cor.

Sempre combinar:

cor;

texto;

ícone quando necessário.

11.8 Tabelas

Tabelas devem ser usadas apenas quando comparação em colunas for útil.

Em telas menores, transformar linhas em cards.

Regras:

cabeçalho fixo em tabelas longas;

valores alinhados;

ações agrupadas;

linha inteira clicável quando fizer sentido;

evitar mais de sete colunas visíveis.

11.9 Menus de ação

Ações secundárias devem ficar em:

Ações

Exemplo:

Editar
Duplicar
Desativar
Excluir

Evitar quatro ou cinco botões expostos em cada linha.

11.10 Confirmações

Usar confirmação para:

cancelamento;

exclusão;

fechamento de caixa;

estorno;

perda de estoque;

saída sem salvar.

Não pedir confirmação para ações facilmente reversíveis.

11.11 Feedback

Toda ação deve gerar feedback imediato.

Exemplos:

“Pedido enviado para a cozinha.”

“Mesa 8 liberada.”

“Entrada de 5 kg registrada.”

“Produto salvo.”

“Pagamento concluído.”

Usar toast para confirmação simples.

Usar mensagem inline quando o feedback pertence a um campo ou etapa.

12. Componentes operacionais específicos

12.1 Card de mesa

Deve mostrar apenas:

número ou nome;

situação;

tempo de ocupação;

valor parcial;

responsável;

ação principal.

┌──────────────────────────┐
│ Mesa 08       Ocupada    │
│ 42 min                   │
│ R$ 186,40                │
│ Garçom: Carlos           │
│                          │
│ [ Abrir comanda ]        │
└──────────────────────────┘

12.2 Card de pedido na cozinha

┌──────────────────────────┐
│ #184 • Mesa 08           │
│ Recebido há 7 min        │
│                          │
│ 2× Pizza Calabresa       │
│ 1× Pizza Portuguesa      │
│   Sem cebola             │
│                          │
│ [ Iniciar preparo ]      │
└──────────────────────────┘

Informações essenciais devem ficar visíveis sem abrir detalhes.

12.3 Card de estoque

┌──────────────────────────┐
│ Farinha de trigo         │
│ 18,5 kg                  │
│ Mínimo: 10 kg            │
│                          │
│ Estoque normal           │
│ [ Ver movimentações ]    │
└──────────────────────────┘

Quando baixo:

Estoque baixo
Restam 3,2 kg

12.4 Linha de movimentação

Entrada
+5 kg
Hoje, 14:32
Registrado por Ana

ou:

Consumo
-850 g
Pedido #184
Hoje, 14:41

12.5 Fluxo visual do pedido

Aguardando → Em preparo → Pronto → Entregue

O estado atual deve ser o mais destacado.

Estados futuros devem parecer disponíveis.

Estados passados devem parecer concluídos.

13. Dashboard

O dashboard não deve ser cheio de métricas decorativas.

Mostrar apenas informações que ajudam a agir agora.

Blocos recomendados

pedidos aguardando;

pedidos em atraso;

mesas ocupadas;

itens prontos;

estoque baixo;

caixa atual;

atalhos frequentes.

Exemplo

Bom dia, Guilherme

Hoje
12 mesas ocupadas
4 pedidos aguardando
2 itens com estoque baixo

[ Abrir comanda ] [ Registrar entrada ]

Pedidos que precisam de atenção
- #184 • 18 min aguardando
- #179 • item pronto há 9 min

Evitar:

gráficos sem ação associada;

cards só para preencher espaço;

números acumulados sem contexto;

excesso de indicadores no primeiro acesso.

14. Formulários

Cadastro simples primeiro

Exibir inicialmente apenas os campos essenciais.

Exemplo de novo item de estoque:

Nome
Unidade de medida
Estoque mínimo
Categoria

Campos menos frequentes ficam em:

Mais opções

Ordem dos campos

A ordem deve seguir o raciocínio do usuário, não a estrutura do banco.

Salvamento

Botões no final:

[ Cancelar ] [ Salvar item de estoque ]

Em formulários longos, usar barra fixa de ações.

Erros

Mensagem ruim:

Campo inválido.

Mensagem boa:

Informe uma quantidade maior que zero.

15. Linguagem e microcopy

Usar

Abrir comanda

Adicionar item

Enviar para cozinha

Iniciar preparo

Marcar como pronto

Receber pagamento

Registrar entrada

Registrar perda

Contar estoque

Ver movimentações

Salvar alterações

Evitar

Criar registro

Processar entidade

Efetuar movimentação

Atualizar status operacional

Submeter formulário

Persistir dados

Mensagens vazias

Ruim:

Nenhum dado encontrado.

Melhor:

Nenhum pedido aguardando. A cozinha está em dia.

Ruim:

Nenhum registro.

Melhor:

Você ainda não cadastrou nenhum item de estoque.

Ação:

Cadastrar primeiro item de estoque

Erros

Ruim:

Erro 500.

Melhor:

Não foi possível salvar agora. Tente novamente.

Quando possível:

Seus dados continuam preenchidos.

16. Acessibilidade

Requisitos mínimos

Contraste adequado;

navegação por teclado;

foco visível;

rótulos em todos os campos;

mensagens de erro associadas aos campos;

não depender apenas de cor;

botões com pelo menos 44px de altura;

textos com tamanho legível;

ícones acompanhados por texto em ações importantes.

Ambientes reais

Considerar:

reflexo de luz;

telas antigas;

tablets pequenos;

usuários com visão reduzida;

operação com uma mão;

uso rápido e repetitivo.

17. Responsividade

Breakpoints

breakpoints:
  mobile: "< 640px"
  tablet: "640px - 1023px"
  desktop: "1024px - 1279px"
  wide: ">= 1280px"

Mobile

uma coluna;

ação principal fixa quando necessário;

cards no lugar de tabelas;

filtros em drawer;

navegação inferior;

botões em largura total em fluxos críticos.

Tablet

Muito importante para restaurante.

duas colunas;

cards maiores;

alvos de toque amplos;

cozinha em Kanban horizontal;

navegação lateral recolhível.

Desktop

navegação lateral;

conteúdo até aproximadamente 1440px;

tabelas quando apropriado;

detalhes em painel lateral;

filtros persistentes.

18. Estados da interface

Toda tela importante deve prever:

carregando;

vazio;

sucesso;

erro;

sem conexão;

sem permissão;

desabilitado;

conteúdo parcial.

Sem conexão

Você está sem conexão. Algumas ações podem ficar indisponíveis.

Sem permissão

Você não tem permissão para cancelar este pedido.

Não mostrar termos técnicos sobre RBAC ou autenticação.

19. Padrões por área

Mesas

Priorizar:

situação;

tempo;

valor;

garçom;

ação principal.

Pedidos

Priorizar:

origem;

horário;

itens;

observações;

status;

próximo passo.

Cozinha

Priorizar:

tempo;

sequência;

quantidade;

observações;

status.

Estoque

Separar claramente:

Itens de estoque;

Estoque;

Ficha técnica;

Movimentações.

Não misturar cadastro, saldo e ficha técnica na mesma tela.

Caixa

Priorizar:

valor;

forma de pagamento;

saldo pendente;

confirmação.

Relatórios

Começar com perguntas reais:

O que mais vendeu?

O que deu mais lucro?

O que está acabando?

Onde houve perda?

Quais horários foram mais movimentados?

20. Do's and Don'ts

Faça

Use uma ação principal por tela.

Mostre o próximo passo.

Use linguagem do restaurante.

Mantenha o fluxo operacional visível.

Dê feedback após cada ação.

Use ícone com texto.

Oculte opções avançadas.

Destaque apenas o que precisa de atenção.

Preserve dados preenchidos após erros.

Mantenha padrões iguais em toda a aplicação.

Não faça

Não encha o dashboard de métricas.

Não use termos técnicos.

Não coloque cinco botões por linha.

Não dependa apenas de cores.

Não misture cadastro com operação.

Não use modais para tudo.

Não esconda ações críticas em ícones sem rótulo.

Não peça confirmação para ações simples.

Não crie formulários enormes.

Não faça o usuário lembrar informações entre telas.

21. Assinaturas visuais do produto

21.1 Linha de fluxo

Usar uma linha conectando etapas:

Pedido → Cozinha → Entrega → Pagamento → Estoque

21.2 Indicador de ritmo

Itens com tempo devem mostrar:

tempo normal;

atenção;

atraso.

Exemplo:

Recebido há 6 min

Depois:

Aguardando há 18 min

21.3 Resumo de resultado

Após concluir uma ação, mostrar o efeito:

Pedido enviado
3 itens foram encaminhados para a cozinha

ou:

Entrada registrada
O estoque de farinha passou de 13,5 kg para 18,5 kg

Essa assinatura reforça que o produto conecta ações e resultados.

22. Tokens resumidos

brand:
  name: "Agiliza Fluxo"
  slogan: "Mais produtividade, menos papel."
  promise: "Do pedido ao estoque, tudo conectado."

colors:
  primary: "#1F7A4D"
  primary-hover: "#17613D"
  primary-active: "#114C30"
  primary-soft: "#EAF6EF"
  accent: "#F2A93B"
  canvas: "#F6F8F7"
  surface: "#FFFFFF"
  ink: "#18211C"
  body: "#45534A"
  muted: "#6D7A71"
  border: "#D8E0DB"
  success: "#208A52"
  warning: "#C98216"
  error: "#C64343"
  info: "#2E6EB5"

rounded:
  button: "10px"
  input: "10px"
  card: "14px"
  modal: "18px"

touch:
  minimumTarget: "44px"

layout:
  sidebarWidth: "240px"
  contentMaxWidth: "1440px"
  cardGap: "16px"
  pagePaddingDesktop: "32px"
  pagePaddingMobile: "16px"

23. Critério de validação

Uma tela está alinhada ao Agiliza Fluxo quando uma pessoa consegue responder rapidamente:

Onde estou?

O que está acontecendo?

O que precisa da minha atenção?

Qual é a ação principal?

O que aconteceu depois que eu cliquei?

Consigo usar sem treinamento extenso?

O sistema está economizando passos?

Se essas respostas não estiverem claras, a tela deve ser simplificada.

24. Direção final

O Agiliza Fluxo não deve parecer um painel administrativo genérico.

Ele deve parecer um assistente operacional confiável, que:

organiza a rotina;

reduz papel;

evita esquecimentos;

conecta setores;

mostra prioridades;

ajuda a equipe a trabalhar mais rápido;

exige pouco treinamento.

A produtividade deve surgir da simplicidade.

Quanto menos o usuário precisar pensar sobre o sistema, mais ele poderá cuidar do restaurante.