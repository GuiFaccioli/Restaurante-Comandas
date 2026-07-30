# Plano de reimplementação de UI — Agiliza Fluxo

**Status:** auditoria somente leitura concluída em 2026-07-29.\
**Escopo:** frontend real do projeto, sem alteração de código de produto, domínio ou arquivos existentes. O único artefato criado por esta auditoria é este documento.

## 1. Base de referência

A auditoria foi feita após a leitura completa de `docs/AGILIZA_FLUXO_DESIGN.md`. A direção obrigatória é uma experiência por contexto, não apenas um layout responsivo:

- **OWNER/ADMIN:** desktop-first; gestão, operação, estoque, relatórios e configurações.
- **WAITER:** mobile-first; mesas, comanda, produtos, observações, envio e entrega.
- **COOK:** tablet/desktop-first; kanban, tempo, itens, observações e transição de preparo.
- **CASHIER:** desktop/tablet-first; pedidos entregues, pagamento, divisão e fechamento.
- Claro por padrão, ações principais explícitas, feedback imediato, alvos de toque de pelo menos 44px e estados carregando/vazio/sucesso/erro/sem conexão/sem permissão.

## 2. Stack real do frontend

- **Next.js 16.2.9**, App Router, React 19.2.4, TypeScript 5.
- **Tailwind CSS 4** via `@import "tailwindcss"`, `tw-animate-css` e `shadcn/tailwind.css`.
- **Base UI** para o botão e primitives; Radix Label/Slot; componentes locais no estilo shadcn em `components/ui`.
- **Lucide React** como biblioteca de ícones (`components.json` confirma `iconLibrary: "lucide"`).
- **class-variance-authority**, `tailwind-merge` e `clsx` para composição de classes.
- **Sonner** para toasts; `next-themes` é consumido pelo Toaster, mas o root layout não expõe ThemeProvider.
- **Zustand** para carrinho em `lib/store/cart.ts`.
- **Drizzle/PostgreSQL/Neon** no servidor; telas usam Server Components para consulta inicial e Client Components para interação, polling, drawers e ações.
- **Vitest + Testing Library + jsdom** para unitários; **Playwright** para E2E em Chromium desktop e Mobile Chrome.
- Não há biblioteca de gráficos, sistema de formulários dedicado, design-token package ou camada visual de rotas compartilhada além dos componentes locais.

## 3. Inventário de rotas e papel autorizado

| Rota | Papel efetivo | Experiência primária | Observação |
|---|---|---|---|
| `/` | sessão autenticada | redirecionamento | Busca sessão + acessos do tenant selecionado. |
| `/auth/sign-in` | público | todos | Formulário client acionando Server Action. |
| `/auth/sign-up` | público | desktop/mobile | Cadastro do owner; usa `ActionForm`. |
| `/selecionar-empresa` | sessão | todos | Seleção do tenant; seleção automática se há um único. |
| `/selecionar-area` | sessão | todos | Escolha entre acessos múltiplos. |
| `/sem-acesso` | sessão | todos | Mensagem e logout. |
| `/admin/menu` | ADMIN | desktop-first | Categorias, produtos, disponibilidade, custo e margem. |
| `/admin/mesas` | ADMIN | desktop-first | Cadastro/ativação de mesas; é gestão, não operação do garçom. |
| `/admin/pedidos` | CASHIER | desktop/tablet-first | Pedidos e pagamentos, embora esteja dentro do shell visual admin. |
| `/admin/relatorios` | ADMIN | desktop-first | Consultas e tabelas. |
| `/admin/usuarios` | ADMIN | desktop-first | Cadastro, edição de acessos e remoção de usuário do tenant. |
| `/admin/configuracoes` | ADMIN | desktop-first | Atalhos para parâmetros/gestão. |
| `/admin/estoque` | — | — | Redirect para insumos ou ficha técnica; o arquivo não chama `requireAccess`. |
| `/admin/estoque/insumos` | ADMIN | desktop-first | Cadastro/edição/exclusão de insumo. |
| `/admin/estoque/saldos` | ADMIN | desktop-first | Saldo e movimentação manual. |
| `/admin/estoque/ficha-tecnica` | ADMIN | desktop-first | Ingredientes por produto. |
| `/admin/estoque/[id]` | ADMIN | desktop-first | Histórico de movimentações de um insumo. |
| `/cozinha/dashboard` | COOK | tablet/desktop-first | Kanban/pedidos com polling. |
| `/garcom/mesas` | WAITER | mobile-first | Escolha de mesa. |
| `/garcom/mesa/[id]` | WAITER | mobile-first | Menu, carrinho, observação e pedidos da mesa. |
| `/garcom/pedidos` | WAITER | mobile-first | Entregas pendentes e confirmação. |
| `/mesa/[id]` | WAITER | mobile-first | Alias/entrada alternativa para o fluxo de mesa. |

### Mapa dos acessos

A união de acessos é obtida por `lib/auth/access.ts` no tenant selecionado. Os quatro valores reais são `admin`, `caixa`, `cozinha` e `garcom`.

- ADMIN inicia em `/admin/menu`.
- CASHIER inicia em `/admin/pedidos`.
- COOK inicia em `/cozinha/dashboard`.
- WAITER inicia em `/garcom/pedidos`.
- Mais de um acesso leva a `/selecionar-area`; nenhum leva a `/sem-acesso`.

## 4. Layouts, composição e componentes

### Shells atuais

- `app/layout.tsx`: HTML global, `globals.css`, metadata, manifest e Toaster.
- `app/admin/layout.tsx`: shell desktop com sidebar fixa em telas grandes, cabeçalho sticky e conteúdo em card; no mobile a navegação vira bloco superior, não barra inferior.
- `app/cozinha/layout.tsx`: layout mínimo, ProfileMenu no topo e conteúdo sem shell operacional específico.
- `app/garcom/layout.tsx`: layout mínimo, ProfileMenu no topo; a experiência mobile depende das páginas e componentes filhos.
- `app/admin/estoque/layout.tsx`: layout intermediário; navegação do estoque fica em `InventoryNavigation`.

### Componentes a reaproveitar

- Fundação: `components/ui/button.tsx`, `input.tsx`, `label.tsx`, `dialog.tsx`, `drawer.tsx`, `sheet.tsx`, `tabs.tsx`, `tooltip.tsx`, `separator.tsx`, `sonner.tsx`.
- Administração: `AdminPage`, `AdminPageHeader`, `AdminPanel`, `AdminStatsGrid`, `AdminStatCard`, `AdminEmptyState`, `AdminBar`.
- Navegação: `AdminShellNav`, `InventoryNavigation`, `ProfileMenu`/client.
- Operação: `StatusBadge`, `LiveElapsedTimer`, `KanbanBoard`, `PedidoCard`, `TableOrdersPanel`, `PendingDeliveriesClient`, `MenuGrid`, `CartDrawer`, `CartFab`, `ObservacaoSheet`.
- Feedback: `ActionForm`, feedback inline existente e Sonner global.

### Componentes a substituir ou remodelar

1. **Shell e navegação:** substituir a navegação admin fixa por uma navegação orientada a papel. ADMIN não deve receber um link visual para `/admin/pedidos` se não tiver CASHIER; CASHIER precisa de um shell próprio, ou de uma variante explicitamente financeira.
2. **Estoque:** `app/admin/estoque/client.tsx` concentra insumos, saldos/movimentações e ficha técnica em um componente client muito grande. Separar em três experiências e manter apenas uma navegação compartilhada.
3. **Garçom:** remodelar `app/garcom/mesa/[id]/client.tsx`, `MenuGrid`, `ItemCard`, `CartDrawer` e `TableOrdersPanel` para o fluxo mobile de uma coluna, ação primária fixa e menos carga visual.
4. **Cozinha:** transformar `KanbanBoard`/`PedidoCard` em cartões legíveis à distância, com status de um toque e ritmo/atraso explícitos.
5. **Pedidos/caixa:** retirar a semântica de caixa de dentro do admin genérico e criar resumo de pagamento, divisão e fechamento com confirmações adequadas.
6. **Status:** consolidar `StatusBadge`, classes `status-*`, classes locais e cores de pedido/estoque em um contrato de status com texto + ícone + cor.
7. **Ações e menus:** substituir `details/summary` espalhados por menu/dropdown acessível e usar Drawer em mobile quando a ação tiver contexto complexo.
8. **Formulários:** manter `ActionForm`, mas padronizar campos, erros associados, preservação de dados e barra de ações para formulários longos.

## 5. Tokens e divergências visuais

### Tokens-alvo do design

- Primário `#1F7A4D`, hover `#17613D`, active `#114C30`, soft `#EAF6EF`.
- Acento `#F2A93B`; canvas `#F6F8F7`; surface `#FFFFFF`.
- Ink `#18211C`; body `#45534A`; muted `#6D7A71`; border `#D8E0DB`.
- Success `#208A52`; warning `#C98216`; error `#C64343`; info `#2E6EB5`.
- Inter, escala display/title/body/caption definida no design; nenhum texto abaixo de 12px.
- Espaçamento 4px-base; card 20–24px; botão/input 10px; card 14px; modal 18px.
- Sidebar 240px; max-width 1440px; padding desktop 32px/mobile 16px; target 44px.
- Breakpoints de produto: mobile <640, tablet 640–1023, desktop 1024–1279, wide >=1280.

### Estado atual e drift

- `app/globals.css` ainda é majoritariamente um tema preto/branco inspirado em Mintlify: `--primary: #0a0a0a`, `--brand-green: #00d4a4`, `--admin-canvas: #f7f7f7`.
- Há uma segunda paleta semântica `--action-*` (verde `#15803d`, azul `#175cd3`, âmbar, vermelho) e aliases temporários `--success`, `--destructive`, `--status-*`.
- O mesmo produto mistura `var(--radius)`, arredondamentos Tailwind `rounded-2xl/3xl/full`, sombras utilitárias e padrões locais.
- `Button` mantém compatibilidade entre semântica nova (`intent/appearance`) e API legada (`variant`), o que é útil para migração, mas mantém dois vocabulários e duas expectativas visuais.
- `ItemCard` usa cards muito arredondados (`rounded-3xl/2xl`) e o fluxo da mesa usa cabeçalho preto e ações circulares, em contraste com o canvas claro/verde do design.
- Há classes específicas não centralizadas, como `order-card` e `order-header`, além de emojis/imagens de fallback e strings com sinais de mojibake em diversos arquivos; isso deve ser tratado como trilha própria de qualidade/encoding antes da reimplementação final.
- O dark theme está definido em CSS, mas o layout raiz não mostra ThemeProvider; o comportamento efetivo do tema precisa ser validado antes de prometer suporte a dark mode.

## 6. Sessão, usuário, tenant e papel

- A sessão é um cookie HTTP-only `restaurante_session`, com token aleatório; o banco armazena apenas o hash e validade de 30 dias.
- `getCurrentSession()` lê o cookie no servidor, consulta `authSession` e `usuario`, retornando `usuarioId`, email, nome e `selectedTenantId`.
- `setSelectedTenant()` atualiza o tenant na sessão. A seleção de empresa usa Server Action.
- `getCurrentAccesses()` cruza `usuarioAcesso`, `tenantUser` e `tenant`, filtrando membership e tenant ativos.
- `requireAccess()`/`requireAnyAccess()` fazem os redirects de autenticação, tenant ausente e falta de permissão; páginas e actions também repetem a proteção no servidor.
- `ProfileMenu` obtém sessão e acessos no servidor e entrega a parte interativa a `ProfileMenuClient`; troca de acesso usa links para destinos fixos.
- O middleware/proxy atual não autentica: `proxy.ts` apenas chama `NextResponse.next()`. A segurança depende dos guards server-side e das APIs/actions.
- Ponto positivo: APIs de garçom/cozinha/caixa e actions usam `requireAccess`; a reimplementação deve preservar essa fronteira, nunca mover autorização para o client.

## 7. Testes frontend e E2E

### Existente

- Vitest inclui `tests/unit/**/*.test.ts`, jsdom, Testing Library e setup global.
- Há testes de componentes/UX: botão, tooltip, semântica de botão, design system, ActionForm, Kanban, fluxo de estados e componentes de garçom.
- Há testes de navegação/permissão e sessão: `access-navigation`, `permission-boundary`, `auth/access`, `auth/session`, login/logout e redirects.
- Playwright executa Chromium desktop e Mobile Chrome; há apenas `tests/e2e/cozinha-flow.spec.ts` e `tests/e2e/garcom-flow.spec.ts`, predominantemente sem sessão: redirects, existência da tela de login e testes estruturais.
- Não há evidência de E2E autenticado cobrindo os quatro papéis, tenant selecionado, fluxo completo do garçom, atualização da cozinha ou fechamento do caixa em viewport real.
- Não há configuração visível de teste visual, axe/accessibility automatizado, contrato de snapshots ou matriz de breakpoints.

### Gaps que bloqueiam uma reimplementação segura

1. Criar fixtures autenticadas por papel e tenant, sem burlar os guards.
2. Cobrir rotas destino, troca de acesso e sem-acesso com cada combinação relevante.
3. E2E mobile do garçom: abrir mesa → adicionar item → observação → confirmar → acompanhar → entregar.
4. E2E tablet/desktop da cozinha: polling, iniciar preparo, pronto e leitura de atraso.
5. E2E desktop/tablet do caixa: pendência, forma de pagamento, divisão, confirmação e fechamento.
6. Testes de contrato para navegação por papel: links exibidos devem corresponder ao acesso real.
7. Axe/keyboard/focus e verificação visual mínima nos shells e componentes críticos.
8. Testes de estados sem conexão, erro de action, retry e preservação de formulário.

## 8. Ordem de migração recomendada

1. **Contrato e baseline:** congelar inventário, corrigir encoding em trilha separada, definir matriz de papéis/rotas, fixtures E2E e critérios de acessibilidade.
2. **Fundação visual:** migrar tokens de `globals.css`, tipografia, radius, spacing, status, foco e botão; manter aliases temporários com testes para evitar quebra abrupta.
3. **Shells e autorização visual:** separar Admin, Cashier, Cook e Waiter; criar navegação responsiva por papel; adicionar guard de layout onde a rota puder renderizar sem página filha protegida.
4. **WAITER:** priorizar `/garcom/mesas`, `/garcom/mesa/[id]` e `/garcom/pedidos`; entregar mobile-first e testar o fluxo operacional completo.
5. **COOK:** reimplementar dashboard/kanban para tablet e desktop, com tempo, prioridade e transição de um toque.
6. **CASHIER:** retirar a semântica de caixa de dentro do admin genérico e criar fluxo de pagamento/fechamento.
7. **ADMIN/OWNER:** migrar dashboard/visão geral, cardápio, mesas, estoque, ficha técnica, relatórios, equipe e configurações; quebrar o mega-componente de estoque.
8. **Consolidação:** remover estilos legados, API legada de Button quando a migração terminar, aliases temporários, duplicações de status e rota alias se não houver necessidade de compatibilidade.
9. **Validação final:** unit + integração + E2E autenticado em mobile/tablet/desktop, acessibilidade, estados de erro/offline e revisão visual por papel.

## 9. Riscos técnicos e regressão

- **Autorização divergente da navegação:** `app/admin/layout.tsx` não chama `requireAccess`; seu menu inclui `/admin/pedidos`, que exige CASHIER. Isso pode causar links mortos, experiência de “sem acesso” e regressão ao separar shells.
- **Mistura de domínio:** mesas admin cadastra/ativa estrutura; mesas garçom opera atendimento. Pedidos admin é caixa, enquanto o shell se chama admin. Estoque mistura cadastro, saldo, movimentação e ficha técnica no mesmo client.
- **Tenant na sessão:** qualquer cache, prefetch, polling ou Server Component novo deve respeitar `selectedTenantId`; não introduzir cache compartilhado ou dados client persistidos sem chave por tenant.
- **Polling a cada 5 segundos:** refresh de rota e fetch podem competir com ações em andamento; estados otimistas, retry e abort devem evitar sobrescrever feedback ou dados recém-alterados.
- **Server Actions em componentes client:** erros são tratados de forma desigual (toast, inline, `role=status`); padronizar sem engolir falhas e sem duplicar ações.
- **Compatibilidade de UI:** Base UI/shadcn/Tailwind v4 e classes semânticas locais coexistem; uma troca global de tokens pode mudar componentes que ainda dependem de aliases antigos.
- **Route alias:** `/mesa/[id]` e `/garcom/mesa/[id]` podem divergir em analytics, links, cache e testes; definir uma rota canônica antes de remover.
- **Acessibilidade:** vários ícones têm labels, mas ações e menus/details precisam revisão de foco, escape, anúncio de loading e estados não dependentes apenas de cor.
- **Encoding:** strings exibidas e alguns comentários apresentam mojibake; uma migração visual pode mascarar o problema ou criar diffs massivos não relacionados.
- **Mudança de superfície:** rebaixar densidade no mobile sem preservar tarefas essenciais pode quebrar o atendimento; cada papel precisa de jornadas E2E antes de remover campos/ações.
- **Dark mode:** CSS declara tokens escuros, mas o suporte real não está claramente montado; não misturar a migração clara do Agiliza Fluxo com uma decisão de dark mode não validada.

## 10. Critérios de conclusão

A reimplementação só deve ser considerada concluída quando:

- Cada papel tem shell, navegação e hierarquia próprios, com matriz de rotas testada.
- OWNER/ADMIN usam desktop-first; WAITER mobile-first; COOK tablet/desktop; CASHIER desktop/tablet, conforme o design.
- Cada tela importante deixa claro onde estou, o que exige atenção, qual é a ação principal e o resultado da ação.
- Não há mistura visual/semântica entre cadastro, operação e gestão nas telas principais.
- Tokens-alvo estão centralizados e não dependem dos aliases antigos; status usam texto + ícone + cor.
- Todos os targets críticos têm pelo menos 44px, foco visível, labels e erros associados.
- Loading, vazio, sucesso, erro, offline, sem permissão, desabilitado e conteúdo parcial foram desenhados e testados.
- O fluxo autenticado de cada papel passa em E2E nos dispositivos principais e não vaza dados entre tenants.
- Testes unitários, integração, E2E, teclado e acessibilidade passam; não existem regressões de autorização, polling ou feedback.
- `rg` não encontra estilos/tokens legados não justificados, componentes duplicados ou strings quebradas na superfície migrada.
- O domínio e as actions existentes continuam intactos; a mudança fica restrita à camada de apresentação e seus contratos de teste.

## 11. Arquivos de referência auditados

- `docs/AGILIZA_FLUXO_DESIGN.md`
- `package.json`, `components.json`, `playwright.config.ts`, `vitest.config.ts`
- `app/layout.tsx`, layouts de `admin`, `cozinha`, `garcom` e `admin/estoque`
- Todas as páginas em `app/**/page.tsx`
- `app/globals.css`
- `components/admin/*`, `components/auth/*`, `components/cozinha/*`, `components/garcom/*`, `components/ui/*`
- `lib/auth/session.ts`, `lib/auth/access.ts`
- `tests/unit/**` relacionados a UI, auth, routing, negócio e operação
- `tests/e2e/cozinha-flow.spec.ts`, `tests/e2e/garcom-flow.spec.ts`
# Domain note — atendimento e contas

The operational redesign now treats the table as a physical location, the attendance as the financial/consumption cycle, orders as kitchen rounds, and payments as settlement of an attendance. Waiter table entry uses explicit Continue attendance / Start new attendance decisions, while cashier views are grouped by attendance.
