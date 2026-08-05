# Agiliza Fluxo — Design System

> **Slogan:** A transparência que sua cozinha precisa, o controle que você merece.

Sistema visual oficial do Agiliza Fluxo, plataforma de gestão de comandas,
estoque e fichas técnicas para restaurantes, pizzarias e lanchonetes no Brasil.

Este documento é a fonte de verdade para a nova marca, identidade visual e
interface do produto. O documento `docs/AGILIZA_FLUXO_DESIGN.md` continua
registrando princípios de experiência e operação por perfil; quando houver
conflito visual, este documento prevalece.

## 1. Conceito da marca

O Agiliza Fluxo usa uma linguagem visual **quente e direta**, inspirada na
cozinha profissional: terracota do fogo, creme da farinha e carvão do ferro
fundido.

A interface deve parecer feita por quem conhece o restaurante por dentro:
prática, acolhedora, legível e sem frieza corporativa.

### Personalidade

- próxima, confiável e produtiva;
- clara em ambientes de pressão;
- quente sem ser infantil;
- direta sem ser agressiva;
- organizada sem parecer burocrática.

### Assinatura operacional

O produto deve tornar visível o fluxo conectado:

**Pedido recebido → cozinha preparando → pedido pronto → pagamento → estoque atualizado.**

## 2. Marca

- **Nome:** Agiliza Fluxo
- **Slogan:** A transparência que sua cozinha precisa, o controle que você merece.
- **Promessa:** Do pedido ao estoque, tudo conectado.
- **Tom:** simples, humano, orientado à ação e familiar ao vocabulário de restaurantes.

Evitar linguagem corporativa abstrata, como “ecossistema omnichannel”,
“orquestração operacional” ou “gestão inteligente 360”.

## 3. Tokens de cor

### Modo claro

| Token | Hex | Uso |
| --- | --- | --- |
| `background` | `#fbf9f4` | Fundo principal, creme quente |
| `foreground` | `#241d19` | Texto principal |
| `primary` | `#e24d28` | Terracota: CTA, links e destaques |
| `primary-foreground` | `#fcfbf7` | Texto sobre terracota |
| `secondary` | `#4b3d34` | Carvão quente, suporte |
| `secondary-foreground` | `#fcfbf7` | Texto sobre carvão |
| `accent` | `#f4d8cd` | Destaques suaves |
| `accent-foreground` | `#241d19` | Texto sobre destaque |
| `muted` | `#f0eae6` | Superfícies de apoio |
| `muted-foreground` | `#78695e` | Texto secundário |
| `card` | `#fcfbf7` | Superfícies elevadas |
| `border` | `#e7dfda` | Bordas e divisores |
| `input` | `#dacfc8` | Bordas de campos |
| `ring` | `#e24d28` | Foco acessível |
| `destructive` | `#dc2828` | Erros e ações destrutivas |

### Modo escuro

| Token | Hex |
| --- | --- |
| `background` | `#181411` |
| `foreground` | `#f8f5ed` |
| `primary` | `#e24d28` |
| `secondary` | `#3f3731` |
| `accent` | `#512e1f` |
| `muted` | `#2e2824` |
| `muted-foreground` | `#a69d96` |
| `card` | `#211b18` |
| `border` | `#332d28` |
| `input` | `#473e38` |
| `destructive` | `#dc2828` |

### Gráficos

| Token | Hex | Papel |
| --- | --- | --- |
| `chart-1` | `#e24d28` | Série principal |
| `chart-2` | `#f19d27` | Série secundária |
| `chart-3` | `#4b3d34` | Série terciária |
| `chart-4` | `#e2c378` | Série quaternária |
| `chart-5` | `#d38969` | Série quinária |

Terracota é energia, não decoração de fundo. Carvão é suporte, nunca o
protagonista. Vermelho fica reservado para erro, exclusão, cancelamento e
perda. Estados importantes sempre combinam cor com texto e, quando necessário,
ícone.

## 4. Tipografia

- **Display:** Satoshi, carregada exclusivamente via Fontshare.
- **Interface e corpo:** Inter, com fallback para `system-ui`.
- **Valores técnicos:** Fira Code.

Fonte Satoshi:

```html
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap">
```

| Token | Tamanho | Peso | Uso |
| --- | --- | --- | --- |
| `display` | 56–72px | 900 | Hero e marca |
| `h1` | 40–48px | 800 | Títulos de página |
| `h2` | 32–36px | 700 | Seções |
| `h3` | 24–28px | 600 | Sub-seções e cards |
| `body-lg` | 18–20px | 400 | Destaques |
| `body` | 16px | 400 | Corpo padrão |
| `label` | 14px | 500 | Labels e tags |
| `caption` | 12px | 400 | Metadados |

Headlines usam Satoshi. Corpo, labels e botões usam Inter. Não introduzir
outras famílias sem uma decisão registrada neste documento.

## 5. Espaçamento, raio e elevação

- Base de espaçamento: `4px` (`0.25rem`).
- Escala: `4, 8, 12, 16, 20, 24, 32, 48, 64px`.
- Raio padrão interno: `8px`.
- Botões e campos: `8px`.
- Cards: `8px`.
- Modais: `12px`.
- Landing page: botões podem usar `rounded-full`.

Sombras devem ser quentes e discretas:

```css
--shadow-sm: 0 2px 4px rgba(24, 18, 12, .06);
--shadow: 0 4px 6px -1px rgba(24, 18, 12, .08), 0 2px 4px -1px rgba(24, 18, 12, .04);
--shadow-lg: 0 12px 24px -4px rgba(24, 18, 12, .12), 0 4px 8px -2px rgba(24, 18, 12, .06);
```

## 6. Componentes

O produto usa shadcn/ui e componentes próprios com os tokens acima.

### Botões

- `default`: terracota, ação principal;
- `outline`: ação secundária;
- `ghost`: ação discreta;
- `destructive`: exclusão, cancelamento e erro.

Interfaces internas usam raio de `8px`; a landing page pode usar pílulas.
Alvos de toque devem ter pelo menos `44px` de altura.

### Campos

- label Inter Medium, `14px`;
- borda `input`;
- foco `ring` terracota;
- fundo `card`;
- placeholder curto e orientado à ação;
- erro próximo ao campo e sem apagar dados preenchidos.

### Cards

Cards agrupam uma decisão ou contexto. Usar fundo `card`, borda `border`, raio
de `8px` e sombra `shadow-sm`. Evitar transformar toda informação em card.

### Status

Status de pedido e estoque devem combinar cor, texto e, quando necessário,
ícone. O usuário nunca deve depender apenas da cor para entender o estado.

## 7. Experiência por área

- **Administração:** desktop-first, navegação lateral e conteúdo de gestão.
- **Garçom:** mobile-first, ação principal visível e poucos passos.
- **Cozinha:** tablet/desktop-first, cards grandes e leitura à distância.
- **Caixa:** desktop/tablet-first, pendências, valor e confirmação evidentes.

Cada tela deve responder rapidamente: onde estou, o que precisa de atenção,
qual é a ação principal e o que aconteceu depois do clique.

## 8. Ordem de implementação

1. Atualizar tokens globais, tema claro/escuro e fontes.
2. Atualizar marca, metadata, favicon e cabeçalhos compartilhados.
3. Atualizar componentes base: botões, inputs, cards, badges e navegação.
4. Atualizar shell administrativo e seleção de área/empresa.
5. Atualizar fluxos operacionais de garçom, cozinha e caixa.
6. Atualizar landing/login e revisar microcopy.
7. Validar acessibilidade, responsividade, testes e build.

Cada etapa deve ser pequena, revisável e enviada em commit próprio para gerar
um Preview verificável. Nenhuma etapa deve publicar diretamente em produção.

## 9. Critérios de aceite

- O verde antigo não aparece como cor de marca ou CTA.
- A paleta terracota é aplicada por tokens, não por cores isoladas espalhadas.
- Satoshi é usada em títulos e Inter no corpo/interface.
- Modo claro preserva contraste e legibilidade em telas de restaurante.
- Foco de teclado permanece visível em todos os controles.
- Botões críticos mantêm alvos de toque de pelo menos `44px`.
- O redesign não altera regras de negócio, permissões ou fluxo de dados.
- Cada etapa possui testes/build aprovados antes do commit e push.
