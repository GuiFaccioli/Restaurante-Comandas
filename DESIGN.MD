---
name: Restaurante Comandas
description: Operational restaurant command system for waiter, kitchen, cashier, and admin workflows.
colors:
  background: "#ffffff"
  foreground: "#0a0a0a"
  card: "#ffffff"
  muted: "#f7f7f7"
  muted-foreground: "#5a5a5c"
  border: "#e5e5e5"
  primary: "#0a0a0a"
  primary-foreground: "#ffffff"
  action-positive: "#15803d"
  action-positive-hover: "#166534"
  action-informational: "#175cd3"
  action-informational-hover: "#1849a9"
  action-warning: "#fde68a"
  action-warning-solid-foreground: "#713f12"
  action-warning-soft: "#fffbeb"
  action-warning-soft-foreground: "#92400e"
  action-warning-outline: "#b45309"
  action-destructive: "#b42318"
  focus-ring: "#007f62"
  status-new: "#171717"
  status-preparing: "#ffa600"
  status-ready: "#28a948"
  status-delivered: "#8f8f8f"
typography:
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  section-title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  sm: "0.45rem"
  md: "0.6rem"
  lg: "0.75rem"
  xl: "1.05rem"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "9999px"
    padding: "0.625rem 1.25rem"
    height: "2.5rem"
  button-positive:
    backgroundColor: "{colors.action-positive}"
    textColor: "#ffffff"
    rounded: "9999px"
    padding: "0.625rem 1.25rem"
    height: "2.5rem"
  button-informational:
    backgroundColor: "{colors.action-informational}"
    textColor: "#ffffff"
    rounded: "9999px"
    padding: "0.625rem 1.25rem"
    height: "2.5rem"
  button-warning:
    backgroundColor: "{colors.action-warning}"
    textColor: "{colors.action-warning-solid-foreground}"
    rounded: "9999px"
    padding: "0.625rem 1.25rem"
    height: "2.5rem"
  button-destructive:
    backgroundColor: "{colors.action-destructive}"
    textColor: "#ffffff"
    rounded: "9999px"
    padding: "0.625rem 1.25rem"
    height: "2.5rem"
  card-operational:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  input-default:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.5rem"
---

# Design System: Restaurante Comandas

## 1. Overview

**Creative North Star: "The Calm Service Rail"**

Restaurante Comandas is a product UI for real restaurant work. The design should feel like a clean service rail: every item has a place, every action is reachable, and nothing decorative competes with the next operational decision.

The system is intentionally restrained: white surfaces, dark text, thin borders, semantic action colors, an accessible focus treatment, and compact rounded controls. It must not behave like a marketing page. It serves garçom, cozinha, caixa, and administração screens where speed and confidence matter more than visual novelty.

**Key Characteristics:**

- Mobile-first operational density without visual clutter.
- Clear intent and appearance vocabulary for actions.
- Cards used as command units, not decoration.
- Live-update surfaces that preserve local user state.
- Profile-contained area switching for users with multiple permissions.

## 2. Colors

The palette is restrained and task-oriented: neutral surfaces carry most of the UI, semantic action tokens communicate intent, and status tokens remain reserved for operational data.

### Primary

- **Operational Ink** (`#0a0a0a`): primary text, top-priority neutral buttons, and high-confidence labels.
- **Action Positive** (`#15803d`): create, save, confirm, register, or complete an operation.

### Secondary

- **Muted Work Surface** (`#f7f7f7`): secondary surfaces, hover states, badges, and low-emphasis containers.
- **Hairline Border** (`#e5e5e5`): card borders, dividers, input borders, and low-noise structure.

### Tertiary

- **Accessible Focus Ring** (`#007f62`): shared interaction affordance tested against the white (`#ffffff`) and near-black (`#0a0a0a`) adjacent surfaces.
- **Kitchen Amber** (`#ffa600`): preparation/status signal only.

### Neutral

- **Canvas White** (`#ffffff`): page and card background.
- **Readable Muted Text** (`#5a5a5c`): secondary text that remains legible on white and muted surfaces.
- **Delivered Gray** (`#8f8f8f`): delivered/low-priority status.

### Named Rules

**The Semantic Action Rule.** Intent communicates business meaning and appearance communicates emphasis. Never use action colors decoratively or as the only cue.

**The No-Fog Rule.** Muted text must stay readable. If a label matters to the task, it cannot be pale gray for elegance.

## Semantic actions

Buttons combine an intent (`neutral, positive, informational, warning, destructive`)
with an appearance (`solid, soft, outline, ghost, link`). Intent describes the
business meaning; appearance describes visual emphasis. Color is never the only cue:
pair it with explicit wording, an icon, accessible state, or confirmation.

| Intent | Use | Approved palette |
| --- | --- | --- |
| neutral | navigation, inspect, close, logout, or discard an unpersisted draft | existing foreground/secondary tokens |
| positive | create, add, save, confirm, register, or complete | `#15803d`; hover `#166534` |
| informational | edit or configure | `#175cd3`; hover `#1849a9` |
| warning | reversible operational disruption | warning solid `#fde68a` with `#713f12`; warning soft `#fffbeb` with `#92400e`; outline `#b45309` |
| destructive | delete, remove, or cancel persisted work | `#b42318` |

Use focus ring `#007f62`; it is verified at 3:1 or better against `#ffffff` and
`#0a0a0a`. Body text must meet 4.5:1 contrast.
Outline text, border, and icon contrast is guaranteed only on the approved light `background`, `card`, and `popover` surfaces (`#ffffff`).
On any other surface, choose an intent and appearance combination with valid contrast.
This contract does not introduce a dark action palette. Dismissive “Cancelar” is
neutral, while “Cancelar pedido” is destructive. Icon-only controls have an
accessible name and at least a 44 × 44px target.

## 3. Typography

**Display Font:** Inter with system sans fallbacks.
**Body Font:** Inter with system sans fallbacks.
**Label/Mono Font:** Geist Mono only for code-like/debug contexts when needed.

**Character:** The typography is compact, familiar, and utilitarian. It should support quick scanning in a noisy restaurant, not perform as a brand flourish.

### Hierarchy

- **Title** (700, `1.5rem`, `1.25`): route titles such as `Entregas pendentes`, `Cozinha`, and `Pedidos`.
- **Section Title** (700, `1.125rem`, `1.35`): card headings such as table numbers and order group names.
- **Body** (400, `1rem`, `1.5`): main operational text, item names, instructions.
- **Body Small** (400, `0.875rem`, `1.5`): timestamps, secondary descriptions, helper copy.
- **Label** (500, `0.875rem`, `1.3`): buttons, form labels, compact actions.

### Named Rules

**The No Display Drama Rule.** Product screens do not use oversized hero typography. Large type belongs to marketing, not restaurant operations.

## 4. Elevation

The system is mostly flat. Depth is conveyed through borders, muted surface fills, and spacing rather than heavy shadows. Shadows are reserved for overlays like the profile menu, where layering needs to be explicit.

### Shadow Vocabulary

- **Overlay Shadow** (`0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): profile menu and floating overlays only.

### Named Rules

**The Flat-By-Default Rule.** Operational cards are bordered and flat at rest. Do not add decorative drop shadows to cards or buttons.

## 5. Components

### Buttons

- **Shape:** pill-shaped for primary operational buttons (`9999px`) with compact height (`2.5rem`).
- **Intent:** choose neutral, positive, informational, warning, or destructive from the semantic action contract.
- **Appearance:** use solid, soft, outline, ghost, or link to express emphasis without changing business meaning.
- **Hover / Focus:** use the matching hover token and the shared `#007f62` focus ring. Disabled state uses explicit disabled tokens and blocks pointer interaction.

### Chips

- **Style:** rounded pills with muted backgrounds for low-emphasis status labels.
- **State:** status colors must map to operational meaning: new, preparing, ready, delivered, canceled.

### Cards / Containers

- **Corner Style:** rounded but not cartoonish (`0.75rem`).
- **Background:** white card on white canvas, separated by border and spacing.
- **Shadow Strategy:** no card shadows at rest.
- **Border:** thin neutral border (`#e5e5e5`).
- **Internal Padding:** `1rem` on mobile, expanding only when the screen has room.

### Inputs / Fields

- **Style:** bordered, white-background inputs with `2.5rem` height.
- **Focus:** visible ring and border shift.
- **Error / Disabled:** error uses destructive ring/border; disabled uses muted background and reduced opacity.

### Navigation

Area switching belongs inside the profile menu. Protected operational layouts should not expose standalone `Trocar área` links. Admin may keep its management navigation, but permission-area switching stays profile-scoped.

### Operational Order Card

Order cards must keep table identity, elapsed time, grouped items, and the next action visible without forcing horizontal scanning on mobile. On small screens, long action buttons may stack below the title area.

## 6. Do's and Don'ts

### Do:

- **Do** preserve existing routes, components, business rules, authentication, analytics/dataLayer, and tenant-aware access checks.
- **Do** keep garçom, cozinha, caixa, and admin flows visually consistent while respecting each role's primary task.
- **Do** choose semantic intent from the action contract and pair color with explicit wording, an icon, accessible state, or confirmation.
- **Do** keep touch targets comfortable on mobile and make focus states visible.
- **Do** preserve local UI state during SSE and polling refreshes.

### Don't:

- **Don't** rewrite the app or rebuild flows from scratch for visual polish.
- **Don't** use standalone area-switch links in protected operational layouts; use the profile menu.
- **Don't** add glassmorphism, gradient text, decorative grid backgrounds, side-stripe cards, or heavy shadows.
- **Don't** change backend, database, authentication, analytics, GTM, GA4, dataLayer, or business logic without explicit approval.
- **Don't** depend on browser refresh for operational updates.
