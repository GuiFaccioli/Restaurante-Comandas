# Sistema de Gestão de Pedidos — Pizzaria

**Data:** 2026-06-20
**Status:** Aprovado para implementação

---

## Contexto

Sistema interno para uma única pizzaria sem delivery. Substitui o PizzaQL (referência arquitetural) com stack completamente atualizada. Três usuários: garçom (no celular), cozinha (no display), e admin (no computador).

---

## Escopo

**Incluído:**
- App do garçom: montar e enviar pedidos por mesa
- Display da cozinha: receber e atualizar status de pedidos em tempo real
- Painel admin: gerenciar cardápio (produtos, categorias) e mesas
- Auth para garçom e admin via Neon Auth

**Excluído:**
- Pagamento online (maquininha física, fora do sistema)
- Delivery (dine-in apenas)
- Multi-tenant (um único restaurante)
- Relatórios e analytics (fora do escopo inicial)
- App do cliente (autoatendimento via QR)

---

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js | 16.x |
| Roteamento | App Router | — |
| Mutations | Server Actions | — |
| Banco de dados | Neon (PostgreSQL serverless) | — |
| ORM | Drizzle | latest |
| Auth | Neon Auth (`@neondatabase/auth`) | latest |
| Real-time | SSE via Route Handler | — |
| UI components | Shadcn/UI | latest |
| Estilos | Tailwind CSS + tokens Geist | — |
| Estado client | Zustand | latest |
| Deploy | Vercel | — |

---

## Arquitetura

### Estrutura de rotas

```
app/
  (garcom)/
    layout.tsx              # Auth guard (role: garcom | admin)
    mesa/
      [id]/
        page.tsx            # Menu + cart da mesa
    pedidos/
      page.tsx              # Pedidos ativos (histórico da sessão)

  (cozinha)/
    layout.tsx              # Sem auth (display interno)
    dashboard/
      page.tsx              # Kanban de pedidos em tempo real

  (admin)/
    layout.tsx              # Auth guard (role: admin)
    menu/
      page.tsx              # Listagem de categorias e produtos
      [categoriaId]/
        page.tsx            # Produtos da categoria
    mesas/
      page.tsx              # Listagem e gestão de mesas

  auth/
    sign-in/
      page.tsx
    sign-up/
      page.tsx

  api/
    auth/
      [...path]/
        route.ts            # Neon Auth handler
    events/
      route.ts              # SSE endpoint (real-time cozinha)

  layout.tsx                # Root layout
  page.tsx                  # Redirect por role após auth
```

### Fluxo de dados

```
[Garçom — celular]
  → seleciona mesa
  → adiciona itens ao cart (Zustand, client-side)
  → envia pedido (Server Action)
      → Drizzle INSERT pedido + itens no Neon
      → notifyKitchen({ type: 'novo_pedido', pedido })
          → SSE stream → [Cozinha — display]
                           → card aparece na coluna NOVOS

[Cozinha — display]
  → clica "Em Preparo" (Server Action)
      → Drizzle UPDATE pedido.status
      → notifyKitchen({ type: 'status_atualizado', pedido })
          → [Garçom] vê toast "Em preparo…"

[Admin]
  → cria/edita produto (Server Action → Drizzle)
  → ativa/desativa mesa (Server Action → Drizzle)
```

---

## Data Model

Ver `db/schema.sql` para DDL completo. Resumo:

```
mesa          id, numero (unique), ativa
categoria     id, nome, ordem
produto       id, categoria_id, nome, descricao, preco, disponivel, imagem_url
pedido        id, mesa_id, status (enum), criado_em, atualizado_em
item_pedido   id, pedido_id, produto_id, quantidade, preco_unitario*, observacao
usuario       id (= Neon Auth id), nome, email, role (garcom | admin)
```

*`preco_unitario` é snapshot do momento do pedido — mudanças de preço não afetam pedidos existentes.

**Status flow:** `novo → em_preparo → pronto → entregue`

Uma mesa pode ter múltiplos pedidos com status diferentes simultaneamente.

---

## Real-time (SSE)

### Endpoint (`app/api/events/route.ts`)

```typescript
const clients = new Set<ReadableStreamDefaultController>()

export function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller)
      req.signal.addEventListener('abort', () => clients.delete(controller))
    }
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}

export function notifyKitchen(data: object) {
  const msg = `data: ${JSON.stringify(data)}\n\n`
  clients.forEach(c => c.enqueue(new TextEncoder().encode(msg)))
}
```

### Eventos emitidos

| Evento | Quando | Payload |
|--------|--------|---------|
| `novo_pedido` | Server Action `enviarPedido` | pedido + itens + mesa |
| `status_atualizado` | Server Action `atualizarStatus` | pedido id + novo status |
| `produto_indisponivel` | Admin desativa produto | produto id |

### Client (cozinha)

```typescript
useEffect(() => {
  const es = new EventSource('/api/events')
  es.onmessage = (e) => {
    const evento = JSON.parse(e.data)
    dispatch(evento)  // atualiza estado Zustand
  }
  return () => es.close()
}, [])
```

**Limitação conhecida:** `clients` em memória funciona para single instance (suficiente para uma pizzaria). Se necessário escalar, trocar por Neon LISTEN/NOTIFY ou Upstash Redis.

---

## Auth

### Roles

| Role | Acesso |
|------|--------|
| `garcom` | `(garcom)/` — montar e enviar pedidos |
| `admin` | `(garcom)/` + `(admin)/` — tudo |
| sem auth | `(cozinha)/` — display interno, sem login |

### Configuração

```typescript
// lib/auth/server.ts
import { createNeonAuth } from '@neondatabase/auth/next/server'
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
})

// proxy.ts
export default auth.middleware({ loginUrl: '/auth/sign-in' })
export const config = {
  matcher: ['/(garcom)/:path*', '/(admin)/:path*'],
}
```

---

## UI/UX

### Design tokens (Geist → Shadcn CSS variables)

```css
/* app/globals.css */
:root {
  --background: #ffffff;
  --foreground: #171717;
  --primary: #171717;
  --primary-foreground: #ffffff;
  --destructive: #fc0035;
  --border: #eaeaea;          /* gray-400 */
  --ring: #006bff;            /* blue-700 */
  --radius: 0.375rem;         /* 6px */
}
```

### Tela do Garçom (mobile-first)

- Grid 2 colunas de cards de produto
- Tabs horizontais por categoria (scroll horizontal)
- Botão `[+]` em cada card — 48px (button-large)
- FAB do carrinho fixo no bottom-right com badge de quantidade
- Drawer (Shadcn) para campo de observação por item
- Toast para feedback de status do pedido (`Em preparo…`, `Pronto!`)
- Botão `ENVIAR PEDIDO` fixo no bottom, desabilitado se cart vazio

### Tela da Cozinha (display PC)

- Layout Kanban: 4 colunas (Novos | Em Preparo | Prontos | Entregues)
- Card por pedido: número da mesa, horário, lista de itens, timer de status
- Cores semânticas Geist: `amber-600` = em preparo, `green-700` = pronto, `gray-500` = entregue
- Botão de avanço de status: 48px, ocupa largura do card
- Novos pedidos entram com animação leve (150ms, `prefers-reduced-motion` respeitado)
- Som opcional ao receber novo pedido (Web Audio API, toggle no header)

### Painel Admin (desktop)

**Gestão de Menu:**
- Sidebar com categorias ordenáveis (drag-and-drop via `@dnd-kit/core`)
- Lista de produtos por categoria com toggle de disponibilidade inline
- Modal (Shadcn Dialog) para criar/editar produto: nome, descrição, preço, imagem, categoria
- Criação de categoria via input inline

**Gestão de Mesas:**
- Lista simples com número, status (ativa/inativa) e toggle
- Input para adicionar nova mesa com número

---

## PWA

Ambos garçom e cozinha são instaláveis como PWA:

```typescript
// next.config.ts
import withPWA from 'next-pwa'
export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
})
```

`manifest.json` configurado por route group (`(garcom)` e `(cozinha)`) para ícones e nomes separados se necessário.

---

## Variáveis de Ambiente

```bash
# Neon
DATABASE_URL=postgresql://...
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth...
NEON_AUTH_COOKIE_SECRET=<openssl rand -base64 32>
```

---

## Fora do Escopo Inicial (backlog)

- Relatórios: pedidos por mesa, produtos mais vendidos, tempo médio de preparo
- Histórico de pedidos por data
- Notificações push (além do SSE atual)
- Integração com impressora de cozinha
- Múltiplos garçons por mesa
- Comanda dividida por pessoa
