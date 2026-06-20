---
title: Geist Design System
type: concept
updated: 2026-06-20
tags: [design-system, vercel, ui, tokens, geist]
---

# Geist Design System

## Definição

Sistema de design da Vercel para interfaces developer-focused. Estética: **minimal, high-contrast, whitespace generoso, cores contidas em superfícies near-neutral**. Prioriza legibilidade e acessibilidade; cor sinaliza estado, não decoração.

Documentado em https://vercel.com/design.md (Light theme) e `/design.dark.md` (Dark theme).

## Color System

Escalas de 10 passos (`100`–`1000`). O número codifica **intenção**, não apenas leveza:

| Step | Uso |
|------|-----|
| 100 | Background padrão |
| 200 | Background hover |
| 300 | Background active |
| 400 | Border padrão |
| 500 | Border hover |
| 600 | Border active |
| 700 | Solid fill, alto contraste |
| 800 | Solid fill, hover |
| 900 | Texto secundário e ícones |
| 1000 | Texto primário e ícones |

**Semântica de cor:**
- `blue` → success, links, focus
- `red` → errors
- `amber` → warnings
- `gray-alpha-*` → translúcido (borders, dividers, overlays, hover)
- `gray-*` → opaco (texto, fills)

**Principais valores (Light theme):**
```yaml
primary: "#171717"
secondary: "#4d4d4d"
tertiary: "#006bff"     # blue-700
background-100: "#ffffff"
background-200: "#fafafa"
red-700: "#fc0035"      # error
amber-600: "#ffa600"    # warning
green-700: "#28a948"    # success
```

## Tipografia

| Família | Uso |
|---------|-----|
| Geist Sans | UI, texto, prose |
| Geist Mono | Código, dados tabulares |

Tokens de tamanho: `heading-72` → `heading-14`, `label-20` → `label-12`, `copy-24` → `copy-13`, `button-16` → `button-12`.

Regra prática: **`copy-14` e `label-14` cobrem a maioria dos textos.**

## Spacing

Base: **4px**. Ritmo de 3 passos:
- 8px — dentro de um grupo
- 16px — entre grupos
- 32–40px — entre seções

Cards: 24px padding (16px compact, 32px hero). Coluna central: 1200px.

## Elevation (Light theme)

```css
/* Raised cards */
box-shadow: 0 2px 2px rgba(0,0,0,0.04);

/* Popovers/menus */
box-shadow: 0 1px 1px rgba(0,0,0,0.02), 0 4px 8px -4px rgba(0,0,0,0.04), 0 16px 24px -8px rgba(0,0,0,0.06);

/* Modals */
box-shadow: 0 1px 1px rgba(0,0,0,0.02), 0 8px 16px -4px rgba(0,0,0,0.04), 0 24px 32px -8px rgba(0,0,0,0.06);
```

## Shapes (Border Radius)

| Token | Valor | Uso |
|-------|-------|-----|
| sm | 6px | Superfícies e controles padrão |
| md | 12px | Menus e modais |
| lg | 16px | Fullscreen |
| full | 9999px | Pills, avatares, circular |

Regra: **uma família de radius por view.**

## Motion

Funcional apenas. Durations:
- `0ms` — geralmente o melhor (parece mais rápido)
- `150ms` — mudanças de estado
- `200ms` — popovers e tooltips
- `300ms` — overlays e modais

Easing: `cubic-bezier(0.175, 0.885, 0.32, 1.1)`. Honrar `prefers-reduced-motion`.

## Componentes (tokens)

| Componente | Altura | Uso |
|-----------|--------|-----|
| button-primary | 40px | Ação principal da view |
| button-secondary | 40px | Ação secundária |
| button-tertiary | 40px | Low-emphasis |
| button-error | 40px | Ações destrutivas (red-800) |
| button-small | 32px | Compacto |
| button-large | 48px | Hero |
| input | 40px | Padrão |
| input-small | 32px | Compacto |
| input-large | 48px | — |

**Focus ring:** `box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #006bff`

## Voice & Content (regras de copy)

- Title Case: labels, buttons, tabs
- Sentence case: body, helper text, toasts
- Actions: verbo + substantivo (`Deploy Project`, nunca `Confirm`)
- Errors: o que aconteceu + o que fazer (`Build failed. Bundle exceeds 50 MB. Reduce it.`)
- Toasts: coisa específica que mudou, sem trailing period, sem "successfully" (`Project deleted`)
- In-progress: particípio + ellipsis (`Deploying…`)
- Nunca `please` ou superlativos de marketing

## Relevância no projeto de pizzaria

- Garçom (mobile): contraste alto, botões grandes (48px), legibilidade
- Cozinha (display): heading grande para status do pedido, cores semânticas para status (green=pronto, amber=em preparo, red=erro)
- Ambos são PWA → usar `prefers-reduced-motion` e focus rings para acessibilidade

❓ Verificar: Shadcn/UI (stack escolhida) usa sistema próprio de tokens ou pode ser configurado com tokens Geist?

## Relações

- Criado por: Vercel
- Relacionado com: [[nextjs]] (mesmo ecossistema)
- Relevante para: sistema de pizzaria (design das telas do garçom e cozinha)

## Fontes

- [[vercel-geist-design]]
