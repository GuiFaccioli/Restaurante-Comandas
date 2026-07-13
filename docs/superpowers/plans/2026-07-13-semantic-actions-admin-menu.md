# Semantic Actions and Admin Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply an accessible project-wide action-color language and replace the admin menu's oversized category controls with one progressive inline category manager.

**Architecture:** The shared `Button` will separate semantic `intent` from visual `appearance`, resolve temporary legacy aliases at one boundary, and consume semantic CSS tokens. Existing screens will migrate call sites without changing routes or business behavior. A focused `CategoryManager` client component will own the single inline editor, mutation/focus/error state, and portal tooltip, while `MenuAdminClient` continues to own selected-category and product-form state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 strict mode, Tailwind CSS 4, class-variance-authority 0.7, Base UI 1.6 Tooltip, Vitest 4, Testing Library 16, Playwright 1.61, Drizzle ORM.

## Global Constraints

- The approved source of truth is `docs/superpowers/specs/2026-07-13-semantic-actions-admin-menu-design.md`; do not edit it.
- Keep the product UI restrained: color communicates action intent or risk, never decoration and never the only cue.
- `neutral` means back, close, logout, inspect, navigation, or dismissing an unpersisted draft.
- `positive` means create, add, save, confirm, register, or complete.
- `informational` means edit or configure.
- `warning` means a rare reversible operational disruption, including making a product unavailable.
- `destructive` means deleting, removing, or canceling an existing persisted business object or order.
- A dismissive `Cancelar` is neutral; `Cancelar pedido` remains destructive.
- Use the approved colors exactly: positive `#15803d` / hover `#166534`, destructive `#b42318`, informational `#175cd3` / hover `#1849a9`, warning `#fde68a` with `#713f12`, and focus ring `#007f62`.
- Body text must reach `4.5:1`; interactive borders, icons, and focus indicators must reach `3:1` against adjacent surfaces.
- Color must always be accompanied by wording, iconography, accessible state, or another non-color cue.
- Preserve routes, tenant checks, auth, order/payment/preparation/delivery rules, SSE/polling behavior, and existing confirmations.
- The category server boundary may only normalize names with `trim`, reject blank names, and return the created category identity; do not add uniqueness or other business rules.
- `Novo produto` stays prominent at the page top. `Adicionar` belongs inside the single `Categorias` panel, and category rename/delete stay behind the pencil editor.
- Category controls must have at least `44 × 44px` targets, visible focus, keyboard operation, inline `role="alert"` errors, busy/disabled states, and focus restoration.
- Only one category editor may be open. `Enter` saves and `Escape` cancels.
- The first created category must be selected from the server-returned `id`, immediately enabling `Novo produto` for that category.
- Do not introduce `@testing-library/user-event`, axe, another tooltip package, or any dependency; the installed Testing Library and `@base-ui/react/tooltip` are sufficient.
- Use `.test.ts` plus `React.createElement`, matching the current Vitest include `tests/unit/**/*.test.ts`; do not modify `vitest.config.ts` solely to permit TSX tests.
- Preserve and never edit, stage, delete, or commit the untracked user files `DESIGNTESTE.MD` and `revisao_geral.md`.
- Never add `Co-Authored-By` or AI attribution. Use only selective `git add` commands and the conventional commit subjects recorded below.
- Follow strict RED → GREEN → REFACTOR. Every production change starts with the failing test shown in its task.

## File Structure

### Semantic foundation

- `app/globals.css` — semantic action, disabled, outline, soft-surface, and accessible focus tokens.
- `components/ui/button.tsx` — durable `intent + appearance` API, temporary alias resolver, sizes, and shared interaction states.
- `tests/unit/ui/button.test.ts` — rendered Button behavior and legacy mapping.
- `tests/types/button-props.ts` — compile-time proof that semantic props and legacy aliases cannot be mixed.
- `tests/unit/design/design-system.test.ts` — token values and contrast regression.
- `tests/unit/design/button-semantics.test.ts` — repository-level action vocabulary regressions.

### Project-wide call-site migration

- `components/admin/produto-form.tsx` — neutral dismiss and positive save.
- `app/admin/mesas/client.tsx` — positive create plus positive/warning availability actions.
- `app/admin/usuarios/page.tsx` — shared Button adoption for save/remove.
- `app/auth/sign-in/client.tsx` — explicit neutral primary login.
- `app/auth/sign-up/page.tsx` — positive account creation.
- `components/auth/profile-menu.tsx` — neutral logout.
- `components/auth/profile-menu-client.tsx` — shared neutral profile trigger.
- `app/sem-acesso/page.tsx` — neutral area navigation and logout.
- `app/selecionar-empresa/page.tsx` — neutral company selection.
- `components/ui/dialog.tsx` — explicit neutral close actions.
- `components/ui/sheet.tsx` — explicit neutral close action.
- `app/garcom/mesa/[id]/client.tsx` — neutral back navigation.
- `components/garcom/table-orders-panel.tsx` — destructive persisted cancellation, neutral inspection, positive completion.
- `components/garcom/pending-deliveries-client.tsx` — positive delivery confirmation and neutral navigation.
- `components/garcom/item-card.tsx` — neutral decrement and positive add/increment with accessible icon labels.
- `components/garcom/observacao-sheet.tsx` — positive save.
- `components/garcom/cart-drawer.tsx` — informational edit, neutral decrement/dismiss, positive increment/confirm, destructive remove.
- `components/garcom/cart-fab.tsx` — neutral high-priority navigation rather than a false success state.
- `app/admin/pedidos/client.tsx` — neutral inspection/dismiss and positive payment registration.
- `tests/unit/auth/logout-button.test.ts` — logout semantic regression.
- `tests/unit/routing/access-navigation.test.ts` — neutral route-control regression.
- `tests/unit/business/admin-management.test.ts` — admin action and native-button adoption regressions.
- `tests/unit/business/table-orders-panel.test.ts` — waiter action semantics.
- `tests/unit/business/waiter-cart-actions.test.ts` — cart/item labels, targets, and busy semantics.
- `tests/unit/business/waiter-order-actions.test.ts` — back/order/delivery semantics and busy states.
- `tests/unit/business/cashier-orders.test.ts` — cashier action semantics.

### Progressive category management

- `components/ui/tooltip.tsx` — Base UI tooltip wrapper with body portal and restrained motion.
- `tests/unit/ui/tooltip.test.ts` — portal, role, and accessible trigger behavior.
- `lib/actions/produtos.ts` — trim/blank validation and `{ id, nome }` create response.
- `tests/unit/actions/produtos.test.ts` — server-boundary normalization and rejection.
- `components/admin/admin-page.tsx` — optional action slot in `AdminPanel` header.
- `components/admin/category-manager.tsx` — exclusive inline create/edit/delete state, focus, pending, errors, and tooltip.
- `tests/unit/business/category-manager.test.ts` — component interaction and accessibility behavior.
- `lib/admin/category-selection.ts` — pure next/previous/empty selection fallback after deletion.
- `tests/unit/business/category-selection.test.ts` — deterministic deletion-selection transitions.
- `app/admin/menu/client.tsx` — integrate CategoryManager, optimistic created selection, product actions, and empty states.
- `tests/unit/business/admin-menu-client.test.ts` — page integration, first-category selection, deletion fallback, and empty states.
- `DESIGN.md` — final semantic action contract and current accessible tokens.

## Interfaces

```ts
export type ButtonIntent =
  | 'neutral'
  | 'positive'
  | 'informational'
  | 'warning'
  | 'destructive'

export type ButtonAppearance = 'solid' | 'soft' | 'outline' | 'ghost' | 'link'

export type LegacyButtonVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'success'
  | 'destructive'
  | 'link'

export type CreatedCategory = { id: string; nome: string }

export type CategoryEditorState =
  | { mode: 'idle' }
  | { mode: 'create' }
  | { mode: 'edit'; categoryId: string }
```

`ButtonStyleProps` is a discriminated union: semantic callers may provide `intent` and `appearance` but not `variant`; legacy callers may provide `variant` but not semantic props. `CategoryManager` consumes ordered `{ id, nome, ordem }[]` rows and callbacks for select/create/delete/refresh; it does not own product state.

## Recorded Feature Base

Before Task 1 changes a file, record the exact base commit inside Git metadata:

```powershell
git rev-parse HEAD | Set-Content .git/semantic-actions-admin-menu.base
Get-Content .git/semantic-actions-admin-menu.base
```

Expected: one 40-character commit hash. Keep this untracked marker through final verification. Range audits use `$(Get-Content .git/semantic-actions-admin-menu.base)..HEAD`; never assume a fixed number of commits because review fixes may add precise conventional commits.

## Review Workload Forecast

This change is high-risk for the repository's 400-changed-line review budget. Do not claim an exact total before implementation: migrations of existing JSX may shrink or expand after formatting. Use a **feature-branch-chain** rooted at tracker `semantic-actions-admin-menu`: PR 1 targets the tracker, every later child targets its immediate predecessor so each review diff stays focused, and only the accumulated tracker ultimately targets `main`. Measure every child with `git diff --stat <parent>...HEAD` and keep it targeted at `≤400` changed lines. If a measured child exceeds the target, stop before opening the PR and split that child at the nearest behavior/test boundary.

| # | Child branch boundary | Autonomous, testable result | Required targeted gate |
| --- | --- | --- | --- |
| 1 | `semantic-actions/tokens` | Accessible semantic/focus tokens with contrast regression | design-system token tests |
| 2 | `semantic-actions/button-api` | `intent + appearance`, alias resolver, type fixture, rendered matrix | Button/unit/type checks |
| 3 | `semantic-actions/admin-controls` | Product/table/user admin create-save-toggle actions migrated | admin-management tests |
| 4 | `semantic-actions/auth-overlays` | Auth/access/profile plus Dialog/Sheet neutral actions and 44px close targets | auth/routing tests |
| 5 | `semantic-actions/waiter-cart` | Item card, observation, cart, and cart navigation semantics/labels/busy | button-semantics focused tests |
| 6 | `semantic-actions/waiter-orders` | Back, order cancel/inspect/deliver, and pending-delivery semantics/busy | table-order tests |
| 7 | `semantic-actions/cashier` | Cashier inspection/payment/dismiss semantics and announced pending form | cashier-order tests |
| 8 | `semantic-actions/tooltip` | Portal Tooltip primitive and accessibility regression | Tooltip test |
| 9 | `semantic-actions/category-boundary` | Trim/blank handling with tenant max-order append preserved | produtos action tests |
| 10 | `semantic-actions/category-editor` | Complete CategoryManager create/edit state, focus, errors, and busy behavior | CategoryManager create/edit cases |
| 11 | `semantic-actions/category-delete` | Guarded delete, next/previous/Add focus, and pure selection fallback | CategoryManager deletion + selection tests |
| 12 | `semantic-actions/menu-integration` | Parent reconciliation, product semantics, empty states, DESIGN contract, and final audits | menu/design focused suite, full gates, browser fixtures |

Each child includes its production code and the tests that first failed for that behavior. The tracker accumulates the verified children; only the tracker targets `main`. Tasks below show the complete end state, while these boundaries govern commits/PRs during apply. Record the measured stat for every child in its PR; `≤400` is a target enforced from evidence, not an unsupported forecast.

---

### Task 1: Add semantic action tokens and the durable Button API

**Files:**
- Modify: `app/globals.css:4-78,101-135`
- Modify: `components/ui/button.tsx:1-60`
- Create: `tests/unit/ui/button.test.ts`
- Create: `tests/types/button-props.ts`
- Modify: `tests/unit/design/design-system.test.ts:10-45`
- Modify: `tests/unit/design/button-semantics.test.ts:10-18`
- Modify: `tests/unit/business/admin-management.test.ts:126-145`

**Interfaces:**
- Consumes: existing Base UI `Button`, CVA, Tailwind 4, `cn`, and current legacy `variant` callers.
- Produces: `Button`, `buttonVariants`, `ButtonProps`, `ButtonStyleProps`, `ButtonIntent`, `ButtonAppearance`, and `LegacyButtonVariant` with the signatures documented above.

- [ ] **Step 0: Create the new test directories explicitly**

```powershell
New-Item -ItemType Directory -Force tests/unit/ui, tests/types | Out-Null
```

Expected: both directories exist. Do not add placeholder files; the next step creates their tracked tests.

- [ ] **Step 1: Write failing rendered and token tests**

Create `tests/unit/ui/button.test.ts`:

```ts
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Button, buttonVariants } from '@/components/ui/button'

afterEach(cleanup)

describe('semantic Button', () => {
  const intents = [
    'neutral',
    'positive',
    'informational',
    'warning',
    'destructive',
  ] as const
  const appearances = ['solid', 'soft', 'outline', 'ghost', 'link'] as const
  const themes = ['light', 'dark'] as const
  const combinations = themes.flatMap((theme) =>
    intents.flatMap((intent) =>
      appearances.map((appearance) => [theme, intent, appearance] as const)
    )
  )

  it.each(combinations)(
    'renders %s %s + %s through the shared state layer',
    (theme, intent, appearance) => {
      render(
        createElement(
          'div',
          { className: theme },
          createElement(
            Button,
            { intent, appearance },
            `${theme}-${intent}-${appearance}`
          )
        )
      )
      const button = screen.getByRole('button', {
        name: `${theme}-${intent}-${appearance}`,
      })
      const classes = button.className

      expect(button.closest(`.${theme}`)).not.toBeNull()
      expect(classes).toContain(`[--button-solid:var(--action-${intent})]`)
      expect(classes).toContain('focus-visible:ring-2')
      expect(classes).toContain('aria-busy:pointer-events-none')
      expect(classes).toMatch(/hover:/)
    }
  )

  it('renders positive solid actions from semantic variables', () => {
    render(
      createElement(
        Button,
        { intent: 'positive', appearance: 'solid' },
        'Salvar'
      )
    )

    const button = screen.getByRole('button', { name: 'Salvar' })
    expect(button).toHaveClass('[--button-solid:var(--action-positive)]')
    expect(button).toHaveClass('bg-[var(--button-solid)]')
    expect(button).toHaveClass('text-[var(--button-solid-foreground)]')
  })

  it('renders informational ghost and warning soft without losing the label', () => {
    render(
      createElement(
        'div',
        null,
        createElement(
          Button,
          { intent: 'informational', appearance: 'ghost' },
          'Editar'
        ),
        createElement(
          Button,
          { intent: 'warning', appearance: 'soft' },
          'Tornar indisponível'
        )
      )
    )

    expect(screen.getByRole('button', { name: 'Editar' })).toHaveClass(
      '[--button-outline:var(--action-informational)]'
    )
    expect(screen.getByRole('button', { name: 'Tornar indisponível' })).toHaveClass(
      '[--button-soft:var(--action-warning-soft)]'
    )
  })

  it('maps every legacy alias at the shared boundary', () => {
    expect(buttonVariants({ variant: 'default' })).toBe(
      buttonVariants({ intent: 'neutral', appearance: 'solid' })
    )
    expect(buttonVariants({ variant: 'outline' })).toBe(
      buttonVariants({ intent: 'neutral', appearance: 'outline' })
    )
    expect(buttonVariants({ variant: 'secondary' })).toBe(
      buttonVariants({ intent: 'neutral', appearance: 'soft' })
    )
    expect(buttonVariants({ variant: 'ghost' })).toBe(
      buttonVariants({ intent: 'neutral', appearance: 'ghost' })
    )
    expect(buttonVariants({ variant: 'success' })).toBe(
      buttonVariants({ intent: 'positive', appearance: 'solid' })
    )
    expect(buttonVariants({ variant: 'destructive' })).toBe(
      buttonVariants({ intent: 'destructive', appearance: 'soft' })
    )
    expect(buttonVariants({ variant: 'link' })).toBe(
      buttonVariants({ intent: 'neutral', appearance: 'link' })
    )
  })

  it('uses native disabled state without opacity as the only cue', () => {
    render(createElement(Button, { disabled: true }, 'Salvar'))

    const button = screen.getByRole('button', { name: 'Salvar' })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:opacity-100')
    expect(button).toHaveClass('disabled:bg-[var(--action-disabled)]')
  })

  it('announces and blocks an explicitly busy action', () => {
    render(createElement(Button, { 'aria-busy': true }, 'Salvando'))

    const button = screen.getByRole('button', { name: 'Salvando' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveClass('aria-busy:pointer-events-none')
  })
})
```

Create `tests/types/button-props.ts`:

```ts
import type { ButtonProps } from '../../components/ui/button'

const semantic: ButtonProps = {
  intent: 'positive',
  appearance: 'solid',
}
const legacy: ButtonProps = { variant: 'success' }

// @ts-expect-error legacy aliases cannot be mixed with semantic props
const mixedIntent: ButtonProps = { variant: 'success', intent: 'positive' }

// @ts-expect-error legacy aliases cannot be mixed with semantic appearance
const mixedAppearance: ButtonProps = {
  variant: 'outline',
  appearance: 'outline',
}

void [semantic, legacy, mixedIntent, mixedAppearance]
```

In `tests/unit/design/design-system.test.ts`, first replace the legacy foundation test and rename the input test so neither describes mint as the shared focus language:

```ts
it('defines the foundation color, radius, and accessible focus tokens', () => {
  const css = source('app/globals.css')

  expect(css).toContain('--brand-green: #00d4a4')
  expect(css).toContain('--radius: 0.75rem')
  expect(css).toContain('--focus-ring: #007f62')
  expect(css).toContain('--ring: var(--focus-ring)')
  expect(css).toContain('--hairline: #e5e5e5')
})
```

Rename `uses 40px inputs with mint focus rings` to `uses 40px inputs with the shared focus ring`; keep its three implementation assertions. Then add real contrast helpers/tests:

```ts
function token(css: string, name: string) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  expect(match, `missing --${name}`).not.toBeNull()
  return match![1]
}

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
  const [red, green, blue] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrast(foreground: string, background: string) {
  const first = relativeLuminance(foreground)
  const second = relativeLuminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

it('defines accessible semantic action and focus tokens', () => {
  const css = source('app/globals.css')

  expect(token(css, 'action-positive')).toBe('#15803d')
  expect(token(css, 'action-positive-hover')).toBe('#166534')
  expect(token(css, 'action-informational')).toBe('#175cd3')
  expect(token(css, 'action-warning')).toBe('#fde68a')
  expect(token(css, 'action-warning-foreground')).toBe('#713f12')
  expect(token(css, 'action-destructive')).toBe('#b42318')
  expect(token(css, 'focus-ring')).toBe('#007f62')

  expect(contrast(token(css, 'action-positive'), '#ffffff')).toBeGreaterThanOrEqual(4.5)
  expect(contrast(token(css, 'action-informational'), '#ffffff')).toBeGreaterThanOrEqual(4.5)
  expect(
    contrast(token(css, 'action-warning-foreground'), token(css, 'action-warning'))
  ).toBeGreaterThanOrEqual(4.5)
  expect(contrast(token(css, 'action-destructive'), '#ffffff')).toBeGreaterThanOrEqual(4.5)
  const hoverPairs = [
    ['action-positive-hover', '#ffffff'],
    ['action-informational-hover', '#ffffff'],
    ['action-warning-foreground', token(css, 'action-warning-hover')],
    ['action-destructive-hover', '#ffffff'],
  ] as const
  const softPairs = [
    ['action-neutral-foreground', 'action-neutral-soft'],
    ['action-positive-foreground', 'action-positive-soft'],
    ['action-informational-foreground', 'action-informational-soft'],
    ['action-warning-foreground', 'action-warning-soft'],
    ['action-destructive-foreground', 'action-destructive-soft'],
    ['action-disabled-foreground', 'action-disabled'],
  ] as const

  for (const [foreground, background] of hoverPairs) {
    expect(contrast(token(css, foreground), background.startsWith('#') ? background : token(css, background))).toBeGreaterThanOrEqual(4.5)
  }
  for (const [foreground, background] of softPairs) {
    expect(contrast(token(css, foreground), token(css, background))).toBeGreaterThanOrEqual(4.5)
  }
  for (const outline of [
    'action-neutral-outline',
    'action-positive-outline',
    'action-informational-outline',
    'action-warning-outline',
    'action-destructive-outline',
  ]) {
    expect(contrast(token(css, outline), '#ffffff')).toBeGreaterThanOrEqual(3)
  }
  expect(contrast(token(css, 'focus-ring'), '#ffffff')).toBeGreaterThanOrEqual(3)
  expect(contrast(token(css, 'focus-ring'), '#0a0a0a')).toBeGreaterThanOrEqual(3)
})
```

Update the first test in `tests/unit/design/button-semantics.test.ts` to expect the temporary mapping instead of the old CVA key:

```ts
it('maps the legacy success alias to a positive solid action', () => {
  const button = readProjectFile('components/ui/button.tsx')

  expect(button).toContain("success: { intent: 'positive', appearance: 'solid' }")
})
```

Replace the last two `buttonSource` assertions in `tests/unit/business/admin-management.test.ts`:

```ts
expect(buttonSource).toContain('intent:')
expect(buttonSource).toContain('appearance:')
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```powershell
npm test -- tests/unit/ui/button.test.ts tests/unit/design/design-system.test.ts tests/unit/design/button-semantics.test.ts tests/unit/business/admin-management.test.ts
npx.cmd tsc --noEmit --pretty false
```

Expected: Vitest FAIL because semantic props are not translated into classes, `#007f62` and the new action tokens do not exist, and the alias map is absent. TypeScript also reports a new `tests/types/button-props.ts` export/contract diagnostic in addition to the recorded unrelated `tests/unit/sse.test.ts(17,93)` baseline.

- [ ] **Step 3: Add exact semantic CSS tokens**

Add these mappings inside `@theme inline` in `app/globals.css`:

```css
--color-action-neutral: var(--action-neutral);
--color-action-positive: var(--action-positive);
--color-action-informational: var(--action-informational);
--color-action-warning: var(--action-warning);
--color-action-destructive: var(--action-destructive);
--color-ring: var(--focus-ring);
```

Replace the current action/focus declarations in `:root` with this exact semantic layer:

```css
--action-neutral: #0a0a0a;
--action-neutral-hover: #262626;
--action-neutral-solid-foreground: #ffffff;
--action-neutral-soft: #f7f7f7;
--action-neutral-soft-hover: #ededed;
--action-neutral-foreground: #262626;
--action-neutral-outline: #767676;

--action-positive: #15803d;
--action-positive-hover: #166534;
--action-positive-solid-foreground: #ffffff;
--action-positive-soft: #ecfdf3;
--action-positive-soft-hover: #d1fadf;
--action-positive-foreground: #166534;
--action-positive-outline: #15803d;

--action-informational: #175cd3;
--action-informational-hover: #1849a9;
--action-informational-solid-foreground: #ffffff;
--action-informational-soft: #eff8ff;
--action-informational-soft-hover: #d1e9ff;
--action-informational-foreground: #175cd3;
--action-informational-outline: #175cd3;

--action-warning: #fde68a;
--action-warning-hover: #fcd34d;
--action-warning-solid-foreground: #713f12;
--action-warning-soft: #fffbeb;
--action-warning-soft-hover: #fef3c7;
--action-warning-foreground: #713f12;
--action-warning-outline: #b45309;

--action-destructive: #b42318;
--action-destructive-hover: #912018;
--action-destructive-solid-foreground: #ffffff;
--action-destructive-soft: #fff1f0;
--action-destructive-soft-hover: #fee4e2;
--action-destructive-foreground: #b42318;
--action-destructive-outline: #b42318;

--action-disabled: #f2f4f7;
--action-disabled-border: #d0d5dd;
--action-disabled-foreground: #667085;
--focus-ring: #007f62;

/* Temporary non-action aliases for existing status/data consumers. */
--success: var(--action-positive);
--success-hover: var(--action-positive-hover);
--destructive: var(--action-destructive);
--destructive-foreground: var(--action-destructive-solid-foreground);
--ring: var(--focus-ring);
--sidebar-ring: var(--focus-ring);
```

In `.dark`, replace `--ring` and `--sidebar-ring` with `var(--focus-ring)`. Do not design a new dark palette in this change.

- [ ] **Step 3a: Verify and commit autonomous slice 1 (tokens)**

```powershell
npm test -- tests/unit/design/design-system.test.ts
git add -- app/globals.css tests/unit/design/design-system.test.ts
git commit -m "feat(ui): add accessible semantic action tokens"
```

Expected: the design-system test passes with contrast/token assertions; no Button implementation file belongs to this commit.

- [ ] **Step 4: Replace `components/ui/button.tsx` with the semantic resolver**

Use this complete implementation:

```tsx
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

export type ButtonIntent =
  | 'neutral'
  | 'positive'
  | 'informational'
  | 'warning'
  | 'destructive'

export type ButtonAppearance = 'solid' | 'soft' | 'outline' | 'ghost' | 'link'
export type ButtonSize =
  | 'default'
  | 'xs'
  | 'sm'
  | 'lg'
  | 'icon'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-lg'

export type LegacyButtonVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'success'
  | 'link'

type SharedStyleProps = { size?: ButtonSize; className?: string }
type SemanticStyleProps = {
  intent?: ButtonIntent
  appearance?: ButtonAppearance
  variant?: never
}
type LegacyStyleProps = {
  variant: LegacyButtonVariant
  intent?: never
  appearance?: never
}

export type ButtonStyleProps = SharedStyleProps & (SemanticStyleProps | LegacyStyleProps)
export type ButtonProps = ButtonPrimitive.Props & ButtonStyleProps

const legacyVariantMap = {
  default: { intent: 'neutral', appearance: 'solid' },
  outline: { intent: 'neutral', appearance: 'outline' },
  secondary: { intent: 'neutral', appearance: 'soft' },
  ghost: { intent: 'neutral', appearance: 'ghost' },
  destructive: { intent: 'destructive', appearance: 'soft' },
  success: { intent: 'positive', appearance: 'solid' },
  link: { intent: 'neutral', appearance: 'link' },
} as const satisfies Record<
  LegacyButtonVariant,
  { intent: ButtonIntent; appearance: ButtonAppearance }
>

const buttonStyles = cva(
  'group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium leading-[1.3] whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-[var(--action-disabled-border)] disabled:bg-[var(--action-disabled)] disabled:text-[var(--action-disabled-foreground)] disabled:opacity-100 aria-busy:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      intent: {
        neutral:
          '[--button-solid:var(--action-neutral)] [--button-solid-hover:var(--action-neutral-hover)] [--button-solid-foreground:var(--action-neutral-solid-foreground)] [--button-soft:var(--action-neutral-soft)] [--button-soft-hover:var(--action-neutral-soft-hover)] [--button-foreground:var(--action-neutral-foreground)] [--button-outline:var(--action-neutral-outline)]',
        positive:
          '[--button-solid:var(--action-positive)] [--button-solid-hover:var(--action-positive-hover)] [--button-solid-foreground:var(--action-positive-solid-foreground)] [--button-soft:var(--action-positive-soft)] [--button-soft-hover:var(--action-positive-soft-hover)] [--button-foreground:var(--action-positive-foreground)] [--button-outline:var(--action-positive-outline)]',
        informational:
          '[--button-solid:var(--action-informational)] [--button-solid-hover:var(--action-informational-hover)] [--button-solid-foreground:var(--action-informational-solid-foreground)] [--button-soft:var(--action-informational-soft)] [--button-soft-hover:var(--action-informational-soft-hover)] [--button-foreground:var(--action-informational-foreground)] [--button-outline:var(--action-informational-outline)]',
        warning:
          '[--button-solid:var(--action-warning)] [--button-solid-hover:var(--action-warning-hover)] [--button-solid-foreground:var(--action-warning-solid-foreground)] [--button-soft:var(--action-warning-soft)] [--button-soft-hover:var(--action-warning-soft-hover)] [--button-foreground:var(--action-warning-foreground)] [--button-outline:var(--action-warning-outline)]',
        destructive:
          '[--button-solid:var(--action-destructive)] [--button-solid-hover:var(--action-destructive-hover)] [--button-solid-foreground:var(--action-destructive-solid-foreground)] [--button-soft:var(--action-destructive-soft)] [--button-soft-hover:var(--action-destructive-soft-hover)] [--button-foreground:var(--action-destructive-foreground)] [--button-outline:var(--action-destructive-outline)]',
      },
      appearance: {
        solid:
          'bg-[var(--button-solid)] text-[var(--button-solid-foreground)] hover:bg-[var(--button-solid-hover)]',
        soft:
          'bg-[var(--button-soft)] text-[var(--button-foreground)] hover:bg-[var(--button-soft-hover)]',
        outline:
          'border-[var(--button-outline)] bg-background text-[var(--button-outline)] hover:bg-[var(--button-soft)]',
        ghost:
          'bg-transparent text-[var(--button-outline)] hover:bg-[var(--button-soft)]',
        link:
          'bg-transparent text-[var(--button-outline)] underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-10 gap-1.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        xs: 'h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*=size-])]:size-3',
        sm: 'h-9 gap-1 rounded-full px-4 text-sm [&_svg:not([class*=size-])]:size-3.5',
        lg: 'h-12 gap-1.5 px-6',
        icon: 'size-10',
        'icon-xs': 'size-6 rounded-md [&_svg:not([class*=size-])]:size-3',
        'icon-sm': 'size-7 rounded-md',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      intent: 'neutral',
      appearance: 'solid',
      size: 'default',
    },
  }
)

function resolveButtonSemantics(props: ButtonStyleProps) {
  if (props.variant) return legacyVariantMap[props.variant]
  return {
    intent: props.intent ?? 'neutral',
    appearance: props.appearance ?? 'solid',
  }
}

function buttonVariants(props: ButtonStyleProps = {}) {
  const { intent, appearance } = resolveButtonSemantics(props)
  return buttonStyles({
    intent,
    appearance,
    size: props.size ?? 'default',
    className: props.className,
  })
}

function Button({
  className,
  size = 'default',
  variant,
  intent,
  appearance,
  ...props
}: ButtonProps) {
  const classNames = variant
    ? buttonVariants({ variant, size, className })
    : buttonVariants({ intent, appearance, size, className })

  return <ButtonPrimitive data-slot="button" className={cn(classNames)} {...props} />
}

export { Button, buttonVariants }
```

- [ ] **Step 5: Verify GREEN and the compatibility boundary**

Run:

```powershell
npm test -- tests/unit/ui/button.test.ts tests/unit/design/design-system.test.ts tests/unit/design/button-semantics.test.ts tests/unit/business/admin-management.test.ts
npm run build
npx.cmd tsc --noEmit --pretty false
```

Expected: targeted Vitest files PASS and Next production build exits `0`. TypeScript reports no `tests/types/button-props.ts` diagnostic; only the recorded unrelated `tests/unit/sse.test.ts(17,93)` baseline remains. Vitest currently prints one pre-existing `vite-tsconfig-paths` deprecation warning; this task must add no new warning.

- [ ] **Step 6: Commit the semantic foundation**

```powershell
git add -- components/ui/button.tsx tests/unit/ui/button.test.ts tests/types/button-props.ts tests/unit/design/button-semantics.test.ts tests/unit/business/admin-management.test.ts
git commit -m "feat(ui): add semantic action buttons"
```

### Task 2: Migrate admin and authentication actions

**Files:**
- Modify: `components/admin/produto-form.tsx:97-102`
- Modify: `app/admin/mesas/client.tsx:60-99`
- Modify: `app/admin/usuarios/page.tsx:1-8,128-147`
- Modify: `app/auth/sign-in/client.tsx:73-75`
- Modify: `app/auth/sign-up/page.tsx:33-35`
- Modify: `components/auth/profile-menu.tsx:60-64`
- Modify: `components/auth/profile-menu-client.tsx:1-45`
- Modify: `app/sem-acesso/page.tsx:17-28`
- Modify: `app/selecionar-empresa/page.tsx:29-40`
- Modify: `components/ui/dialog.tsx:63-70,109-114`
- Modify: `components/ui/sheet.tsx:63-70`
- Modify: `tests/unit/auth/logout-button.test.ts:12-27`
- Modify: `tests/unit/routing/access-navigation.test.ts:11-23`
- Modify: `tests/unit/business/admin-management.test.ts:44-89,126-145`

**Interfaces:**
- Consumes: Task 1 `Button` and `buttonVariants` semantic props.
- Produces: explicit semantic call sites in admin/auth and removes duplicated native action styles from users, profile, and table availability controls.

- [ ] **Step 1: Add failing admin/auth semantic assertions**

Add these assertions to the named existing tests:

```ts
// tests/unit/auth/logout-button.test.ts, first test
expect(component).toMatch(/intent="neutral"[\s\S]*appearance="outline"[\s\S]*Sair/)
expect(component).not.toMatch(/intent="destructive"[\s\S]*Sair/)

// tests/unit/routing/access-navigation.test.ts, first test
expect(page).toMatch(/intent="neutral"[\s\S]*Sair/)
expect(page).not.toMatch(/(?:variant="destructive"|intent="destructive")[\s\S]*Sair/)
expect(page).toContain("intent: 'neutral'")

// tests/unit/business/admin-management.test.ts, users test
expect(usersPage).toContain("import { Button } from '@/components/ui/button'")
expect(usersPage).toMatch(/intent="positive"[\s\S]*Salvar acessos/)
expect(usersPage).toMatch(/intent="destructive"[\s\S]*Remover usuário/)
expect(usersPage).not.toContain('<button')

// tests/unit/business/admin-management.test.ts, form/table test
expect(productFormSource).toMatch(/intent="neutral"[\s\S]*Cancelar/)
expect(productFormSource).toMatch(/intent="positive"[\s\S]*Salvar/)
expect(productFormSource).toContain('aria-busy={saving}')
expect(mesasSource).toContain("intent={m.ativa ? 'warning' : 'positive'}")
expect(mesasSource).toContain("m.ativa ? 'Desativar' : 'Ativar'")
```

Add this focused overlay target test to `tests/unit/routing/access-navigation.test.ts`:

```ts
it('keeps overlay close actions named and at least 44px', () => {
  const dialogSource = source('components/ui/dialog.tsx')
  const sheetSource = source('components/ui/sheet.tsx')

  expect(dialogSource).toContain('aria-label="Fechar diálogo"')
  expect(dialogSource).toContain('className="absolute right-2 top-2 size-11"')
  expect(sheetSource).toContain('aria-label="Fechar painel"')
  expect(sheetSource).toContain('className="absolute right-3 top-3 size-11"')
})
```

- [ ] **Step 2: Run the tests to verify RED**

```powershell
npm test -- tests/unit/auth/logout-button.test.ts tests/unit/routing/access-navigation.test.ts tests/unit/business/admin-management.test.ts
```

Expected: FAIL on the new semantic props because logout is red, create/save remains black, and admin user/table controls are native duplicated buttons.

- [ ] **Step 3: Apply this exact admin/auth migration matrix**

Preserve every existing handler, form action, disabled rule, label association, route, and layout class. Change only the element/semantic props and the two toggle labels shown here.

| Path and action | Required opening element |
| --- | --- |
| `components/admin/produto-form.tsx` Cancelar | `<Button type="button" intent="neutral" appearance="outline" className="min-h-11" onClick={onClose}>` |
| `components/admin/produto-form.tsx` Salvar | `<Button type="button" intent="positive" appearance="solid" className="min-h-11" aria-busy={saving} disabled={saving || !nome || !preco} onClick={handleSave}>` |
| `app/admin/mesas/client.tsx` Adicionar Mesa | `<Button type="button" intent="positive" appearance="solid" size="sm" className="min-h-11" onClick={handleNovaMesa}>` |
| `app/admin/usuarios/page.tsx` Salvar acessos | `<Button type="submit" intent="positive" appearance="solid" className="min-h-11 w-full">` |
| `app/admin/usuarios/page.tsx` Remover usuário | `<Button type="submit" intent="destructive" appearance="soft" className="min-h-11 w-full" disabled={user.isCurrentUser}>` |
| `app/auth/sign-in/client.tsx` Entrar | `<Button type="submit" intent="neutral" appearance="solid" className="min-h-11 w-full">` |
| `app/auth/sign-up/page.tsx` Criar conta | `<Button type="submit" intent="positive" appearance="solid" className="min-h-11 w-full">` |
| `components/auth/profile-menu.tsx` Sair | `<Button type="submit" intent="neutral" appearance="outline" size="sm" className="min-h-11 w-full">` |
| `app/sem-acesso/page.tsx` Trocar área link | `buttonVariants({ intent: 'neutral', appearance: 'outline', className: 'min-h-11 w-full sm:w-auto' })` |
| `app/sem-acesso/page.tsx` Sair | `<Button type="submit" intent="neutral" appearance="outline" className="min-h-11 w-full sm:w-auto">` |
| `app/selecionar-empresa/page.tsx` company choice | `<Button type="submit" intent="neutral" appearance="outline" className="h-auto min-h-11 w-full justify-start p-4 text-left">` |
| `components/ui/dialog.tsx` icon close | Keep `DialogPrimitive.Close`; set its `render={<Button intent="neutral" appearance="ghost" className="absolute right-2 top-2 size-11" size="icon" aria-label="Fechar diálogo" />}` |
| `components/ui/dialog.tsx` footer Close | Keep `DialogPrimitive.Close`; set its `render={<Button intent="neutral" appearance="outline" className="min-h-11" />}` |
| `components/ui/sheet.tsx` icon close | Keep `SheetPrimitive.Close`; set its `render={<Button intent="neutral" appearance="ghost" className="absolute right-3 top-3 size-11" size="icon" aria-label="Fechar painel" />}` |

Replace the active/inactive native button in `app/admin/mesas/client.tsx` with:

```tsx
<Button
  type="button"
  intent={m.ativa ? 'warning' : 'positive'}
  appearance="soft"
  className="min-h-11"
  aria-pressed={m.ativa}
  onClick={() => handleToggleMesa(m.id)}
>
  {m.ativa ? 'Desativar' : 'Ativar'}
</Button>
```

Import `Button` in `app/admin/usuarios/page.tsx`. In `components/auth/profile-menu-client.tsx`, import `Button` and replace its native trigger with:

```tsx
<Button
  type="button"
  intent="neutral"
  appearance="outline"
  aria-expanded={open}
  aria-haspopup="menu"
  className="min-h-11 cursor-pointer"
  onClick={() => setOpen((current) => !current)}
>
  Perfil
</Button>
```

- [ ] **Step 4: Verify GREEN and no native duplication in these surfaces**

```powershell
npm test -- tests/unit/auth/logout-button.test.ts tests/unit/routing/access-navigation.test.ts tests/unit/business/admin-management.test.ts
rg -n "<button|variant=" app/admin/usuarios/page.tsx app/admin/mesas/client.tsx components/auth/profile-menu-client.tsx components/auth/profile-menu.tsx app/sem-acesso/page.tsx components/admin/produto-form.tsx
```

Expected: tests PASS. `rg` returns no native `<button>` or legacy `variant=` in these migrated files; an exit code of `1` from `rg` means the audit found no matches and is success for this command.

- [ ] **Step 5: Commit autonomous slice 3 (admin controls)**

```powershell
git add -- components/admin/produto-form.tsx app/admin/mesas/client.tsx app/admin/usuarios/page.tsx tests/unit/business/admin-management.test.ts
git commit -m "refactor(admin): apply semantic action intents"
```

- [ ] **Step 6: Commit autonomous slice 4 (auth/access/overlays)**

```powershell
git add -- app/auth/sign-in/client.tsx app/auth/sign-up/page.tsx components/auth/profile-menu.tsx components/auth/profile-menu-client.tsx app/sem-acesso/page.tsx app/selecionar-empresa/page.tsx components/ui/dialog.tsx components/ui/sheet.tsx tests/unit/auth/logout-button.test.ts tests/unit/routing/access-navigation.test.ts
git commit -m "refactor(auth): apply neutral action semantics"
```

### Task 3: Migrate waiter and cashier actions without weakening destructive meaning

**Files:**
- Modify: `app/garcom/mesa/[id]/client.tsx:44-55`
- Modify: `components/garcom/table-orders-panel.tsx:138-166`
- Modify: `components/garcom/pending-deliveries-client.tsx:45-54,118-124`
- Modify: `components/garcom/item-card.tsx:48-75`
- Modify: `components/garcom/observacao-sheet.tsx:34-38`
- Modify: `components/garcom/cart-drawer.tsx:68-132`
- Modify: `components/garcom/cart-fab.tsx:12-21`
- Modify: `app/admin/pedidos/client.tsx:251-347`
- Modify: `tests/unit/design/button-semantics.test.ts:10-36`
- Create: `tests/unit/business/waiter-cart-actions.test.ts`
- Create: `tests/unit/business/waiter-order-actions.test.ts`
- Modify: `tests/unit/business/table-orders-panel.test.ts:47-53`
- Modify: `tests/unit/business/cashier-orders.test.ts:24-36`

**Interfaces:**
- Consumes: Task 1 semantic Button API and Task 2 neutral/danger distinction.
- Produces: explicit operational semantics, 44px icon actions, and a repository regression that protects neutral dismissals while preserving actual order cancellation.

- [ ] **Step 1: Replace brittle legacy expectations with failing semantic regressions**

Create `tests/unit/business/waiter-cart-actions.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('waiter cart action semantics', () => {
  it('names every icon-only quantity/removal action and uses 44px targets', () => {
    const itemCard = source('components/garcom/item-card.tsx')
    const cart = source('components/garcom/cart-drawer.tsx')

    expect(itemCard).toContain('aria-label={`Diminuir ${produto.nome}`}')
    expect(itemCard).toContain('aria-label={`Adicionar mais ${produto.nome}`}')
    expect(cart).toContain('aria-label={`Diminuir ${item.nome}`}')
    expect(cart).toContain('aria-label={`Adicionar mais ${item.nome}`}')
    expect(cart).toContain('aria-label={`Remover ${item.nome} do carrinho`}')
    expect(itemCard).toContain('size-11')
    expect(cart).toContain('size-11')
  })

  it('announces cart confirmation pending and keeps dismiss neutral', () => {
    const cart = source('components/garcom/cart-drawer.tsx')

    expect(cart).toContain('aria-busy={sending}')
    expect(cart).toMatch(/intent="positive"[\s\S]*Confirmar pedido/)
    expect(cart).toMatch(/intent="neutral"[\s\S]*Cancelar/)
  })
})
```

Create `tests/unit/business/waiter-order-actions.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('waiter order action semantics', () => {
  it('keeps back/inspection neutral and persisted cancellation destructive', () => {
    const back = source('app/garcom/mesa/[id]/client.tsx')
    const panel = source('components/garcom/table-orders-panel.tsx')

    expect(back).toContain("intent: 'neutral'")
    expect(panel).toMatch(/intent="destructive"[\s\S]*Cancelar/)
    expect(panel).toMatch(/intent="neutral"[\s\S]*Itens/)
  })

  it('announces cancel, deliver, and pending-delivery transitions', () => {
    const panel = source('components/garcom/table-orders-panel.tsx')
    const deliveries = source('components/garcom/pending-deliveries-client.tsx')

    expect(panel).toContain('aria-busy={canceling}')
    expect(panel).toContain('aria-busy={confirming}')
    expect(deliveries).toContain('aria-busy={pending}')
    expect(deliveries).toContain('intent="positive"')
  })
})
```

Replace the operational tests in `tests/unit/design/button-semantics.test.ts` with:

```ts
describe('operational button semantics', () => {
  it('uses positive intent for add, save, confirm, register, and complete actions', () => {
    const paths = [
      'components/garcom/item-card.tsx',
      'components/garcom/observacao-sheet.tsx',
      'components/garcom/cart-drawer.tsx',
      'components/garcom/pending-deliveries-client.tsx',
      'components/garcom/table-orders-panel.tsx',
      'app/admin/pedidos/client.tsx',
    ]

    for (const path of paths) {
      expect(readProjectFile(path), path).toContain('intent="positive"')
    }
  })

  it('keeps dismiss, back, logout, and navigation out of destructive red', () => {
    const paths = [
      'components/garcom/cart-drawer.tsx',
      'app/admin/pedidos/client.tsx',
      'app/garcom/mesa/[id]/client.tsx',
      'components/auth/profile-menu.tsx',
      'app/sem-acesso/page.tsx',
    ]

    for (const path of paths) {
      const file = readProjectFile(path)
      expect(file, path).not.toMatch(
        /(?:variant="destructive"|intent="destructive")[\s\S]{0,220}(?:Voltar|Sair|Fechar|>Cancelar<)/
      )
    }
  })

  it('keeps canceling an existing order destructive', () => {
    const panel = readProjectFile('components/garcom/table-orders-panel.tsx')

    expect(panel).toMatch(/intent="destructive"[\s\S]*Cancelar/)
  })

  it('gives icon-only waiter actions accessible names and touch targets', () => {
    const itemCard = readProjectFile('components/garcom/item-card.tsx')
    const cart = readProjectFile('components/garcom/cart-drawer.tsx')

    expect(itemCard).toContain('aria-label={`Diminuir ${produto.nome}`}')
    expect(itemCard).toContain('aria-label={`Adicionar mais ${produto.nome}`}')
    expect(cart).toContain('aria-label={`Diminuir ${item.nome}`}')
    expect(cart).toContain('aria-label={`Adicionar mais ${item.nome}`}')
    expect(cart).toContain('aria-label={`Remover ${item.nome} do carrinho`}')
    expect(itemCard).toContain('size-11')
    expect(cart).toContain('size-11')
  })

  it('announces every existing operational pending state', () => {
    expect(readProjectFile('components/garcom/table-orders-panel.tsx')).toContain(
      'aria-busy={canceling}'
    )
    expect(readProjectFile('components/garcom/table-orders-panel.tsx')).toContain(
      'aria-busy={confirming}'
    )
    expect(readProjectFile('components/garcom/pending-deliveries-client.tsx')).toContain(
      'aria-busy={pending}'
    )
    expect(readProjectFile('components/garcom/cart-drawer.tsx')).toContain(
      'aria-busy={sending}'
    )
    expect(readProjectFile('app/admin/pedidos/client.tsx')).toContain(
      'aria-busy={isPending}'
    )
  })
})
```

Update the final assertions in `tests/unit/business/table-orders-panel.test.ts`:

```ts
expect(panel).toMatch(/intent="destructive"[\s\S]*Cancelar/)
expect(panel).toMatch(/intent="neutral"[\s\S]*Itens/)
expect(panel).toMatch(/ml-auto[\s\S]*intent="positive"[\s\S]*Entregue/)
expect(panel).toContain('aria-busy={canceling}')
expect(panel).toContain('aria-busy={confirming}')
```

Replace the legacy success assertion in `tests/unit/business/cashier-orders.test.ts`:

```ts
expect(client).toMatch(/intent="positive"[\s\S]*Registrar pagamento/)
expect(client).toMatch(/intent="neutral"[\s\S]*Cancelar/)
expect(client).toContain('aria-busy={isPending}')
```

- [ ] **Step 2: Run the operational tests to verify RED**

```powershell
npm test -- tests/unit/business/waiter-cart-actions.test.ts tests/unit/business/waiter-order-actions.test.ts tests/unit/design/button-semantics.test.ts tests/unit/business/table-orders-panel.test.ts tests/unit/business/cashier-orders.test.ts
```

Expected: FAIL because the listed files still use legacy `success`, red dismiss/back controls, and 40px unnamed icon actions.

- [ ] **Step 3: Apply the exact waiter/cashier intent matrix**

Preserve handlers, disabled conditions, polling/SSE state, forms, and routes. Replace the semantic props as follows:

| Path and action | Intent / appearance |
| --- | --- |
| `app/garcom/mesa/[id]/client.tsx` Voltar link | `buttonVariants({ intent: 'neutral', appearance: 'outline', size: 'sm', className: 'min-h-11' })` |
| `table-orders-panel.tsx` Cancelar persisted order | `destructive + soft`, `min-h-11`, `aria-busy={canceling}` |
| `table-orders-panel.tsx` Itens | `neutral + outline`, `min-h-11` |
| `table-orders-panel.tsx` Entregue | `positive + solid`, `min-h-11`, `aria-busy={confirming}` |
| `pending-deliveries-client.tsx` Confirmar entrega | `positive + solid`, `min-h-11`, `aria-busy={pending}` |
| `pending-deliveries-client.tsx` Abrir mesas link | `neutral + solid`, `min-h-11` |
| `item-card.tsx` decrement | `neutral + outline`, `className="size-11 p-0"`, label `Diminuir ${produto.nome}` |
| `item-card.tsx` increment | `positive + soft`, `className="size-11 p-0"`, label `Adicionar mais ${produto.nome}` |
| `item-card.tsx` first add | `positive + solid` |
| `observacao-sheet.tsx` Salvar | `positive + solid`, `min-h-11` |
| `cart-drawer.tsx` Editar observação | `informational + link`, minimum height `44px` |
| `cart-drawer.tsx` decrement | `neutral + outline`, `size-11`, label `Diminuir ${item.nome}` |
| `cart-drawer.tsx` increment | `positive + soft`, `size-11`, label `Adicionar mais ${item.nome}` |
| `cart-drawer.tsx` remove item | `destructive + ghost`, `size-11`, label `Remover ${item.nome} do carrinho` |
| `cart-drawer.tsx` Confirmar pedido | `positive + solid`, `min-h-11`, `aria-busy={sending}` |
| `cart-drawer.tsx` dismiss Cancelar | `neutral + outline`, `min-h-11` |
| `cart-fab.tsx` Abrir carrinho navigation | `neutral + solid`, `min-h-11` |
| `admin/pedidos/client.tsx` Itens do pedido | `neutral + outline`, `min-h-11` |
| `admin/pedidos/client.tsx` open/submit payment | `positive + solid`, `min-h-11`, `aria-busy={isPending}` |
| `admin/pedidos/client.tsx` dismiss payment Cancelar | `neutral + outline`, `min-h-11` |

In `components/garcom/item-card.tsx`, use this exact increment control:

```tsx
<Button
  type="button"
  intent="positive"
  appearance="soft"
  size="icon"
  className="size-11"
  aria-label={`Adicionar mais ${produto.nome}`}
  onClick={() => addItem({ produtoId: produto.id, nome: produto.nome, preco })}
>
  <Plus aria-hidden="true" />
</Button>
```

In `components/garcom/cart-drawer.tsx`, use these exact three icon-only controls:

```tsx
<Button
  type="button"
  intent="neutral"
  appearance="outline"
  size="icon"
  className="size-11"
  aria-label={`Diminuir ${item.nome}`}
  onClick={() => decrementItem(item.produtoId)}
>
  <Minus aria-hidden="true" />
</Button>
<Button
  type="button"
  intent="positive"
  appearance="soft"
  size="icon"
  className="size-11"
  aria-label={`Adicionar mais ${item.nome}`}
  onClick={() =>
    addItem({ produtoId: item.produtoId, nome: item.nome, preco: item.preco })
  }
>
  <Plus aria-hidden="true" />
</Button>
<Button
  type="button"
  intent="destructive"
  appearance="ghost"
  size="icon"
  className="size-11"
  aria-label={`Remover ${item.nome} do carrinho`}
  onClick={() => removeItem(item.produtoId)}
>
  <Trash2 aria-hidden="true" />
</Button>
```

Replace the native `Editar observação` button in `components/garcom/cart-drawer.tsx` with:

```tsx
<Button
  type="button"
  intent="informational"
  appearance="link"
  className="min-h-11 justify-start px-0 text-xs"
  onClick={() => setObsItem(item.produtoId)}
>
  Editar observação
</Button>
```

For pending buttons, expose the actual local pending boolean on the control (and on the payment form) without changing handlers:

```tsx
// components/garcom/table-orders-panel.tsx
<Button aria-busy={canceling} disabled={actionDisabled}>
  {canceling ? 'Cancelando...' : 'Cancelar'}
</Button>
<Button aria-busy={confirming} disabled={actionDisabled}>
  {confirming ? 'Entregando...' : 'Entregue'}
</Button>

// components/garcom/pending-deliveries-client.tsx
<Button aria-busy={pending} disabled={pending}>
  {pending ? 'Confirmando...' : 'Confirmar entrega'}
</Button>

// components/garcom/cart-drawer.tsx
<Button aria-busy={sending} disabled={sending || items.length === 0}>
  {sending ? 'Confirmando...' : 'Confirmar pedido'}
</Button>

// app/admin/pedidos/client.tsx (also set aria-busy on the containing form)
<form
  aria-busy={isPending}
  onSubmit={(event) => handlePaymentSubmit(event, pedido)}
>
<Button
  type="submit"
  intent="positive"
  appearance="solid"
  aria-busy={isPending}
  disabled={isPending}
  className="min-h-11"
>
  {isPending ? 'Registrando...' : 'Registrar pagamento'}
</Button>
</form>
```

- [ ] **Step 4: Verify GREEN and remove operational legacy aliases**

```powershell
npm test -- tests/unit/business/waiter-cart-actions.test.ts tests/unit/business/waiter-order-actions.test.ts tests/unit/design/button-semantics.test.ts tests/unit/business/table-orders-panel.test.ts tests/unit/business/cashier-orders.test.ts
rg -n "variant=|buttonVariants\(\{ variant" app/garcom components/garcom app/admin/pedidos/client.tsx
```

Expected: tests PASS. `rg` finds no legacy Button aliases in the migrated operational files; exit `1` is the expected no-match result.

- [ ] **Step 5: Commit autonomous slice 5 (waiter cart)**

```powershell
git add -- components/garcom/item-card.tsx components/garcom/observacao-sheet.tsx components/garcom/cart-drawer.tsx components/garcom/cart-fab.tsx tests/unit/business/waiter-cart-actions.test.ts
git commit -m "refactor(waiter): apply semantic cart actions"
```

- [ ] **Step 6: Commit autonomous slice 6 (waiter orders)**

```powershell
git add -- "app/garcom/mesa/[id]/client.tsx" components/garcom/table-orders-panel.tsx components/garcom/pending-deliveries-client.tsx tests/unit/business/waiter-order-actions.test.ts tests/unit/business/table-orders-panel.test.ts
git commit -m "refactor(waiter): apply semantic order actions"
```

- [ ] **Step 7: Commit autonomous slice 7 (cashier and cross-surface guard)**

```powershell
git add -- app/admin/pedidos/client.tsx tests/unit/business/cashier-orders.test.ts tests/unit/design/button-semantics.test.ts
git commit -m "refactor(cashier): apply semantic payment actions"
```

---

### Task 4: Add an accessible portal Tooltip primitive

**Files:**
- Create: `components/ui/tooltip.tsx`
- Create: `tests/unit/ui/tooltip.test.ts`

**Interfaces:**
- Consumes: `Tooltip.Root`, `Tooltip.Trigger`, `Tooltip.Portal`, `Tooltip.Positioner`, `Tooltip.Popup`, and `Tooltip.Provider` from the already-installed `@base-ui/react/tooltip` entry point.
- Produces: `Tooltip`, `TooltipTrigger`, `TooltipContent`, and `TooltipProvider`. `TooltipContent` accepts all popup props plus an optional `sideOffset` and always portals outside clipping admin panels.

- [ ] **Step 1: Write the failing portal and accessibility test**

Create `tests/unit/ui/tooltip.test.ts`:

```ts
import { createElement } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

afterEach(cleanup)

describe('Tooltip', () => {
  it('keeps an icon trigger named and portals the popup outside a clipped panel', async () => {
    const { container } = render(
      createElement(
        'div',
        { 'data-testid': 'clipped-panel', style: { overflow: 'hidden' } },
        createElement(
          Tooltip,
          { defaultOpen: true },
          createElement(
            TooltipTrigger,
            {
              render: createElement(
                Button,
                {
                  type: 'button',
                  intent: 'informational',
                  appearance: 'ghost',
                  size: 'icon',
                  'aria-label': 'Editar categoria Bebidas',
                },
                '\u270e'
              ),
            }
          ),
          createElement(TooltipContent, null, 'Editar categoria')
        )
      )
    )

    expect(
      screen.getByRole('button', { name: 'Editar categoria Bebidas' })
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent('Editar categoria')
    })

    expect(container.querySelector('[role="tooltip"]')).toBeNull()
    expect(document.body.querySelector('[role="tooltip"]')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the Tooltip test to verify RED**

```powershell
npm test -- tests/unit/ui/tooltip.test.ts
```

Expected: FAIL with `Failed to resolve import "@/components/ui/tooltip"` because the wrapper does not exist.

- [ ] **Step 3: Implement the Base UI wrapper with a body portal**

Create `components/ui/tooltip.tsx`:

```tsx
'use client'

import type { ComponentProps } from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@/lib/utils'

const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipProvider = TooltipPrimitive.Provider

type TooltipContentProps = ComponentProps<typeof TooltipPrimitive.Popup> & {
  sideOffset?: ComponentProps<
    typeof TooltipPrimitive.Positioner
  >['sideOffset']
}

function TooltipContent({
  className,
  sideOffset = 8,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner className="z-50" sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            'max-w-xs rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-sm',
            'transition-[opacity,transform] duration-150 ease-out',
            'data-starting-style:scale-[0.98] data-starting-style:opacity-0',
            'data-ending-style:scale-[0.98] data-ending-style:opacity-0',
            'data-instant:transition-none motion-reduce:transition-none',
            className
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
```

Do not add a second tooltip dependency and do not render the popup inline: `AdminPanel` uses `overflow-hidden`, so the portal is part of the functional contract rather than visual polish.

- [ ] **Step 4: Verify GREEN**

```powershell
npm test -- tests/unit/ui/tooltip.test.ts
```

Expected: PASS; the trigger remains accessible by name and the tooltip exists under `document.body`, not inside the test's clipping container.

- [ ] **Step 5: Commit the Tooltip primitive**

```powershell
git add -- components/ui/tooltip.tsx tests/unit/ui/tooltip.test.ts
git commit -m "feat(ui): add accessible portal tooltip"
```

---

### Task 5: Preserve category ordering while hardening the create boundary

**Files:**
- Modify: `lib/actions/produtos.ts:18-30`
- Modify: `tests/unit/actions/produtos.test.ts:1-38`

**Interfaces:**
- Produces: `export type CreatedCategory = { id: string; nome: string }` and `criarCategoria(nome: string): Promise<CreatedCategory>`.
- Preserves: `requireAccess('admin')`, the tenant-filtered category-order query, `crypto.randomUUID()`, and append order `max(ordem) + 1` (or `0` for the tenant's first category).
- Does not add uniqueness, cross-tenant reads, cache side effects, or any new business rule.

- [ ] **Step 1: Replace the old action test with failing normalization and ordering coverage**

Keep the existing module mocks and `beforeEach(() => vi.clearAllMocks())`. Replace only the current `describe('criarCategoria', ...)` block in `tests/unit/actions/produtos.test.ts`:

```ts
describe('criarCategoria', () => {
  it('trims the name, appends after the tenant max order, and returns id plus name', async () => {
    const where = vi.fn().mockResolvedValue([{ ordem: 2 }, { ordem: 7 }])
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as any).mockReturnValue({ from })

    const returning = vi.fn().mockResolvedValue([
      { id: 'cat-1', nome: 'Pizzas' },
    ])
    const values = vi.fn().mockReturnValue({ returning })
    ;(db.insert as any).mockReturnValue({ values })

    await expect(criarCategoria('  Pizzas  ')).resolves.toEqual({
      id: 'cat-1',
      nome: 'Pizzas',
    })

    expect(db.select).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledTimes(1)
    expect(where).toHaveBeenCalledTimes(1)
    expect(values).toHaveBeenCalledWith({
      id: expect.any(String),
      tenantId: 'tenant-1',
      nome: 'Pizzas',
      ordem: 8,
    })
    expect(returning).toHaveBeenCalledTimes(1)
  })

  it('uses order zero only for the tenant first category', async () => {
    const where = vi.fn().mockResolvedValue([])
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as any).mockReturnValue({ from })

    const returning = vi.fn().mockResolvedValue([
      { id: 'cat-1', nome: 'Pizzas' },
    ])
    const values = vi.fn().mockReturnValue({ returning })
    ;(db.insert as any).mockReturnValue({ values })

    await criarCategoria('Pizzas')

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        tenantId: 'tenant-1',
        nome: 'Pizzas',
        ordem: 0,
      })
    )
  })

  it('rejects a blank normalized name before querying or inserting', async () => {
    await expect(criarCategoria('   ')).rejects.toThrow(
      'Informe o nome da categoria'
    )

    expect(db.select).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })
})
```

The first test protects the non-obvious existing business behavior: order is appended within the authenticated tenant, not reset globally or forced to zero.

- [ ] **Step 2: Run the focused action test and verify RED**

```powershell
npm test -- tests/unit/actions/produtos.test.ts
```

Expected: FAIL because current code inserts the raw name and returns `{ id }` without `nome`. The existing max-order behavior should already satisfy the new order assertions; RED must come from the new boundary contract, not a mock typo.

- [ ] **Step 3: Implement only the approved normalization/return change**

Replace `criarCategoria` in `lib/actions/produtos.ts` with this complete implementation:

```ts
export type CreatedCategory = {
  id: string
  nome: string
}

export async function criarCategoria(nome: string): Promise<CreatedCategory> {
  const { tenantId } = await requireAccess('admin')
  const normalizedName = nome.trim()

  if (!normalizedName) {
    throw new Error('Informe o nome da categoria')
  }

  const categories = await db
    .select({ ordem: categoria.ordem })
    .from(categoria)
    .where(eq(categoria.tenantId, tenantId))
  const ordem = categories.length
    ? Math.max(...categories.map((category) => category.ordem)) + 1
    : 0

  const [created] = await db
    .insert(categoria)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      nome: normalizedName,
      ordem,
    })
    .returning({
      id: categoria.id,
      nome: categoria.nome,
    })

  return created
}
```

- [ ] **Step 4: Verify GREEN and inspect the exact source boundary**

```powershell
npm test -- tests/unit/actions/produtos.test.ts
rg -n "crypto\.randomUUID|max\(|id: categoria\.id|nome: categoria\.nome" lib/actions/produtos.ts
```

Expected: Vitest PASS. `rg` shows the existing UUID generator, max-order append, and typed return projection.

- [ ] **Step 5: Commit the preserved-order boundary change**

```powershell
git add -- lib/actions/produtos.ts tests/unit/actions/produtos.test.ts
git commit -m "fix(categories): validate names without changing order"
```

---
### Task 6: Implement the complete progressive CategoryManager

**Files:**
- Modify: `components/admin/admin-page.tsx:101-128`
- Create: `components/admin/category-manager.tsx`
- Create: `tests/unit/business/category-manager.test.ts`

**Interfaces:**

```ts
export type CategoryListItem = {
  id: string
  nome: string
  ordem: number
}

export type CategoryManagerProps = {
  categorias: CategoryListItem[]
  selectedId: string
  onSelect: (id: string) => void
  onCreated: (category: CreatedCategory) => void
  onDeleted: (id: string) => void
  onRefresh: () => void
}
```

The component owns the exclusive editor, draft, inline error, mutation guard, and focus restoration. The page owns selection and product state. This task includes create, rename, and delete completely; no handler or return tree is deferred to prose.

- [ ] **Step 1: Write the complete failing transition suite**

Create `tests/unit/business/category-manager.test.ts`:

```ts
import { createElement } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const actions = vi.hoisted(() => ({
  criarCategoria: vi.fn(),
  editarCategoria: vi.fn(),
  removerCategoria: vi.fn(),
}))

vi.mock('@/lib/actions/produtos', () => actions)
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import {
  CategoryManager,
  type CategoryManagerProps,
} from '@/components/admin/category-manager'

const pizzas = { id: 'cat-1', nome: 'Pizzas', ordem: 0 }
const bebidas = { id: 'cat-2', nome: 'Bebidas', ordem: 1 }
const doces = { id: 'cat-3', nome: 'Doces', ordem: 2 }

function renderManager(overrides: Partial<CategoryManagerProps> = {}) {
  const props: CategoryManagerProps = {
    categorias: [pizzas, bebidas],
    selectedId: pizzas.id,
    onSelect: vi.fn(),
    onCreated: vi.fn(),
    onDeleted: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  }

  render(createElement(CategoryManager, props))
  return props
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('CategoryManager', () => {
  it('keeps Add and empty guidance visible with 44px controls', () => {
    renderManager({ categorias: [], selectedId: '' })

    const add = screen.getByRole('button', { name: 'Adicionar categoria' })
    expect(add).toBeEnabled()
    expect(add).toHaveClass('min-h-11')
    expect(
      screen.getByText('Nenhuma categoria criada. Use Adicionar para começar.')
    ).toBeInTheDocument()
  })

  it('opens create with focus and makes create/edit/other rows mutually exclusive', async () => {
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
    expect(
      await screen.findByRole('textbox', { name: 'Nome da categoria Pizzas' })
    ).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Pizzas' })).toHaveClass('min-h-11')
    for (const name of [
      'Cancelar edição de Pizzas',
      'Excluir categoria Pizzas',
      'Salvar categoria Pizzas',
    ]) {
      expect(screen.getByRole('button', { name })).toHaveClass('min-h-11')
    }

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar categoria' }))
    expect(
      await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
    ).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Cancelar nova categoria' })).toHaveClass(
      'min-h-11'
    )
    expect(screen.getByRole('button', { name: 'Salvar nova categoria' })).toHaveClass(
      'min-h-11'
    )
    expect(screen.queryByRole('textbox', { name: 'Nome da categoria Pizzas' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar nova categoria' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Bebidas' }))

    expect(
      await screen.findByRole('textbox', { name: 'Nome da categoria Bebidas' })
    ).toHaveFocus()
    expect(screen.queryByRole('textbox', { name: 'Nome da categoria Pizzas' })).toBeNull()
  })

  it('creates the trimmed name once, forwards server identity, and restores Add focus', async () => {
    actions.criarCategoria.mockResolvedValueOnce({ id: doces.id, nome: doces.nome })
    const props = renderManager()

    const add = screen.getByRole('button', { name: 'Adicionar categoria' })
    fireEvent.click(add)
    const input = await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
    fireEvent.change(input, { target: { value: '  Doces  ' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(actions.criarCategoria).toHaveBeenCalledTimes(1)
      expect(actions.criarCategoria).toHaveBeenCalledWith('Doces')
      expect(props.onCreated).toHaveBeenCalledWith({ id: doces.id, nome: doces.nome })
      expect(props.onRefresh).toHaveBeenCalledTimes(1)
      expect(add).toHaveFocus()
    })
  })

  it('retains the create draft and inline alert after a failure', async () => {
    actions.criarCategoria.mockRejectedValueOnce(new Error('Nome indisponível'))
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar categoria' }))
    const input = await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
    fireEvent.change(input, { target: { value: 'Doces' } })
    fireEvent.submit(input.closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Nome indisponível')
    expect(input).toHaveValue('Doces')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('marks create busy, disables related controls, and ignores repeat submit', async () => {
    let resolveCreate!: (value: { id: string; nome: string }) => void
    actions.criarCategoria.mockImplementationOnce(
      () => new Promise((resolve) => { resolveCreate = resolve })
    )
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar categoria' }))
    const input = await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
    fireEvent.change(input, { target: { value: 'Doces' } })
    const form = input.closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(actions.criarCategoria).toHaveBeenCalledTimes(1)
    expect(form).toHaveAttribute('aria-busy', 'true')
    expect(input).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salvar nova categoria' })).toBeDisabled()

    await act(async () => resolveCreate({ id: doces.id, nome: doces.nome }))
  })

  it('Escape cancels rename and restores the same pencil', async () => {
    renderManager()
    const pencil = screen.getByRole('button', { name: 'Editar categoria Pizzas' })
    expect(pencil).toHaveClass('size-11')
    fireEvent.click(pencil)

    const input = await screen.findByRole('textbox', { name: 'Nome da categoria Pizzas' })
    expect(input).toHaveValue('Pizzas')
    expect(input).toHaveFocus()
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(actions.editarCategoria).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Editar categoria Pizzas' })
      ).toHaveFocus()
    })
  })

  it('renames once while busy and restores the same pencil on success', async () => {
    let resolveRename!: () => void
    actions.editarCategoria.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveRename = resolve })
    )
    renderManager()

    const pencil = screen.getByRole('button', { name: 'Editar categoria Pizzas' })
    fireEvent.click(pencil)
    const input = await screen.findByRole('textbox', { name: 'Nome da categoria Pizzas' })
    fireEvent.change(input, { target: { value: '  Massas  ' } })
    const form = input.closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(actions.editarCategoria).toHaveBeenCalledTimes(1)
    expect(actions.editarCategoria).toHaveBeenCalledWith(pizzas.id, 'Massas')
    expect(form).toHaveAttribute('aria-busy', 'true')
    expect(input).toBeDisabled()

    await act(async () => resolveRename())
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Editar categoria Pizzas' })
      ).toHaveFocus()
    })
  })

  it('retains rename draft and alert after failure', async () => {
    actions.editarCategoria.mockRejectedValueOnce(new Error('Nome indisponível'))
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Bebidas' }))
    const input = await screen.findByRole('textbox', { name: 'Nome da categoria Bebidas' })
    fireEvent.change(input, { target: { value: 'Bebidas geladas' } })
    fireEvent.submit(input.closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Nome indisponível')
    expect(input).toHaveValue('Bebidas geladas')
    expect(screen.getByRole('button', { name: 'Excluir categoria Bebidas' })).toBeInTheDocument()
  })

  it('rejects blank drafts in create and rename before a server call', async () => {
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar categoria' }))
    const createInput = await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
    fireEvent.change(createInput, { target: { value: '   ' } })
    fireEvent.submit(createInput.closest('form')!)
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome da categoria')
    expect(actions.criarCategoria).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
    const editInput = await screen.findByRole('textbox', { name: 'Nome da categoria Pizzas' })
    fireEvent.change(editInput, { target: { value: '   ' } })
    fireEvent.submit(editInput.closest('form')!)
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome da categoria')
    expect(actions.editarCategoria).not.toHaveBeenCalled()
  })

  it('shows delete only in edit mode and preserves the confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderManager()

    expect(screen.queryByRole('button', { name: 'Excluir categoria Pizzas' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Excluir categoria Pizzas' })
    )

    expect(confirm).toHaveBeenCalledWith('Excluir a categoria "Pizzas"?')
    expect(actions.removerCategoria).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'Nome da categoria Pizzas' })).toBeInTheDocument()
  })

  it.each([
    {
      categorias: [pizzas, bebidas, doces],
      target: bebidas,
      expectedFocus: 'Editar categoria Doces',
    },
    {
      categorias: [pizzas, bebidas],
      target: bebidas,
      expectedFocus: 'Editar categoria Pizzas',
    },
    {
      categorias: [pizzas],
      target: pizzas,
      expectedFocus: 'Adicionar categoria',
    },
  ])('restores next, previous, or Add focus after deleting $target.nome', async ({
    categorias,
    target,
    expectedFocus,
  }) => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    actions.removerCategoria.mockResolvedValueOnce(undefined)
    const props = renderManager({ categorias, selectedId: target.id })

    fireEvent.click(
      screen.getByRole('button', { name: `Editar categoria ${target.nome}` })
    )
    fireEvent.click(
      await screen.findByRole('button', { name: `Excluir categoria ${target.nome}` })
    )

    await waitFor(() => {
      expect(actions.removerCategoria).toHaveBeenCalledWith(target.id)
      expect(props.onDeleted).toHaveBeenCalledWith(target.id)
      expect(props.onRefresh).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: expectedFocus })).toHaveFocus()
    })
  })

  it('retains delete editor, draft, and server error when products block deletion', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    actions.removerCategoria.mockRejectedValueOnce(
      new Error('Remova os produtos antes de excluir a categoria')
    )
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
    const input = await screen.findByRole('textbox', { name: 'Nome da categoria Pizzas' })
    fireEvent.change(input, { target: { value: 'Pizzas especiais' } })
    fireEvent.click(screen.getByRole('button', { name: 'Excluir categoria Pizzas' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Remova os produtos antes de excluir a categoria'
    )
    expect(input).toHaveValue('Pizzas especiais')
  })

  it('marks delete busy and ignores a second delete attempt', async () => {
    let resolveDelete!: () => void
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    actions.removerCategoria.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveDelete = resolve })
    )
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
    const remove = await screen.findByRole('button', { name: 'Excluir categoria Pizzas' })
    const form = remove.closest('form')!
    fireEvent.click(remove)
    fireEvent.click(remove)

    expect(actions.removerCategoria).toHaveBeenCalledTimes(1)
    expect(form).toHaveAttribute('aria-busy', 'true')
    expect(remove).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salvar categoria Pizzas' })).toBeDisabled()

    await act(async () => resolveDelete())
  })
})
```

- [ ] **Step 2: Run the component suite and verify RED**

```powershell
npm test -- tests/unit/business/category-manager.test.ts
```

Expected: FAIL with `Failed to resolve import "@/components/admin/category-manager"`. Fix test setup errors until the failure is specifically the missing production component.

- [ ] **Step 3: Add the compact `AdminPanel` header action slot**

Import `type ReactNode` if it is not already imported, then replace only `AdminPanel` in `components/admin/admin-page.tsx`:

```tsx
export function AdminPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-[var(--radius)] border bg-card', className)}>
      {title || description || action ? (
        <div className="flex min-h-16 items-start justify-between gap-3 border-b bg-muted/35 px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 className="font-semibold">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}
```

This preserves optional titles, the current radius/background/padding, and every existing caller.

- [ ] **Step 4: Implement the complete CategoryManager**

Create `components/admin/category-manager.tsx` exactly as follows:

```tsx
'use client'

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel } from '@/components/admin/admin-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  criarCategoria,
  editarCategoria,
  removerCategoria,
  type CreatedCategory,
} from '@/lib/actions/produtos'
import { cn } from '@/lib/utils'

export type CategoryListItem = {
  id: string
  nome: string
  ordem: number
}

export type CategoryManagerProps = {
  categorias: CategoryListItem[]
  selectedId: string
  onSelect: (id: string) => void
  onCreated: (category: CreatedCategory) => void
  onDeleted: (id: string) => void
  onRefresh: () => void
}

type EditorState =
  | { mode: 'idle' }
  | { mode: 'create' }
  | { mode: 'edit'; categoryId: string }

type PendingMutation = null | 'create' | 'rename' | 'delete'
type FocusTarget = 'add' | string

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Não foi possível salvar a categoria'
}

export function CategoryManager({
  categorias,
  selectedId,
  onSelect,
  onCreated,
  onDeleted,
  onRefresh,
}: CategoryManagerProps) {
  const [editor, setEditor] = useState<EditorState>({ mode: 'idle' })
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<PendingMutation>(null)
  const pendingRef = useRef<PendingMutation>(null)
  const returnFocusRef = useRef<FocusTarget | null>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const ordered = [...categorias].sort((a, b) => a.ordem - b.ordem)

  useEffect(() => {
    if (editor.mode !== 'idle') {
      inputRef.current?.focus()
      inputRef.current?.select()
      return
    }

    const target = returnFocusRef.current
    if (!target) return
    returnFocusRef.current = null
    queueMicrotask(() => {
      if (target === 'add') addButtonRef.current?.focus()
      else editButtonRefs.current.get(target)?.focus()
    })
  }, [editor])

  function beginMutation(kind: Exclude<PendingMutation, null>) {
    if (pendingRef.current) return false
    pendingRef.current = kind
    setPending(kind)
    return true
  }

  function finishMutation() {
    pendingRef.current = null
    setPending(null)
  }

  function closeEditor(target: FocusTarget) {
    returnFocusRef.current = target
    setEditor({ mode: 'idle' })
    setDraft('')
    setError('')
  }

  function openCreate() {
    setEditor({ mode: 'create' })
    setDraft('')
    setError('')
  }

  function openEdit(category: CategoryListItem) {
    setEditor({ mode: 'edit', categoryId: category.id })
    setDraft(category.nome)
    setError('')
  }

  function handleEscape(
    event: KeyboardEvent<HTMLFormElement>,
    target: FocusTarget
  ) {
    if (event.key !== 'Escape' || pendingRef.current) return
    event.preventDefault()
    closeEditor(target)
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nome = draft.trim()
    if (!nome) {
      setError('Informe o nome da categoria')
      return
    }
    if (!beginMutation('create')) return

    setError('')
    try {
      const created = await criarCategoria(nome)
      onCreated(created)
      onRefresh()
      toast.success('Categoria criada')
      finishMutation()
      closeEditor('add')
    } catch (caught) {
      finishMutation()
      setError(errorMessage(caught))
      toast.error('Não foi possível criar a categoria')
    }
  }

  async function submitRename(
    event: FormEvent<HTMLFormElement>,
    category: CategoryListItem
  ) {
    event.preventDefault()
    const nome = draft.trim()
    if (!nome) {
      setError('Informe o nome da categoria')
      return
    }
    if (!beginMutation('rename')) return

    setError('')
    try {
      await editarCategoria(category.id, nome)
      onRefresh()
      toast.success('Categoria atualizada')
      finishMutation()
      closeEditor(category.id)
    } catch (caught) {
      finishMutation()
      setError(errorMessage(caught))
      toast.error('Não foi possível renomear a categoria')
    }
  }

  async function deleteCategory(category: CategoryListItem) {
    if (pendingRef.current) return
    if (!window.confirm(`Excluir a categoria "${category.nome}"?`)) return

    const index = ordered.findIndex((item) => item.id === category.id)
    const focusFallback = ordered[index + 1] ?? ordered[index - 1]
    if (!beginMutation('delete')) return

    setError('')
    try {
      await removerCategoria(category.id)
      onDeleted(category.id)
      onRefresh()
      toast.success('Categoria excluída')
      finishMutation()
      closeEditor(focusFallback?.id ?? 'add')
    } catch (caught) {
      finishMutation()
      setError(errorMessage(caught))
      toast.error('Não foi possível excluir a categoria')
    }
  }

  const createErrorId = 'new-category-error'

  return (
    <AdminPanel
      title="Categorias"
      description="Escolha uma seção para revisar produtos."
      action={
        <Button
          ref={addButtonRef}
          type="button"
          intent="positive"
          appearance="ghost"
          size="sm"
          className="min-h-11"
          aria-label="Adicionar categoria"
          disabled={pending !== null}
          onClick={openCreate}
        >
          <Plus aria-hidden="true" />
          Adicionar
        </Button>
      }
    >
      {editor.mode === 'create' ? (
        <form
          className="mb-3 flex flex-wrap items-end gap-2 border-b pb-3"
          aria-busy={pending === 'create'}
          onSubmit={submitCreate}
          onKeyDown={(event) => handleEscape(event, 'add')}
        >
          <div className="min-w-0 flex-1 basis-48">
            <label htmlFor="new-category-name" className="text-xs font-medium">
              Nome da nova categoria
            </label>
            <Input
              ref={inputRef}
              id="new-category-name"
              className="mt-1 min-h-11"
              value={draft}
              required
              disabled={pending !== null}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? createErrorId : undefined}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
          <Button
            type="button"
            intent="neutral"
            appearance="ghost"
            className="min-h-11"
            disabled={pending !== null}
            aria-label="Cancelar nova categoria"
            onClick={() => closeEditor('add')}
          >
            <X aria-hidden="true" />
            Cancelar
          </Button>
          <Button
            type="submit"
            intent="positive"
            appearance="solid"
            className="min-h-11"
            disabled={pending !== null}
            aria-label="Salvar nova categoria"
          >
            <Check aria-hidden="true" />
            {pending === 'create' ? 'Criando...' : 'Criar'}
          </Button>
          {error ? (
            <p id={createErrorId} className="basis-full text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}

      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma categoria criada. Use Adicionar para começar.
        </p>
      ) : (
        <ul className="divide-y" aria-label="Categorias do cardápio">
          {ordered.map((category) => {
            const editing =
              editor.mode === 'edit' && editor.categoryId === category.id
            const errorId = `category-error-${category.id}`

            return (
              <li key={category.id} className="py-1 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-1">
                  <Button
                    type="button"
                    intent="neutral"
                    appearance="ghost"
                    className={cn(
                      'min-h-11 min-w-0 flex-1 justify-start whitespace-normal break-words rounded-md text-left',
                      selectedId === category.id && 'bg-muted font-semibold'
                    )}
                    aria-pressed={selectedId === category.id}
                    disabled={pending !== null}
                    onClick={() => onSelect(category.id)}
                  >
                    {category.nome}
                  </Button>

                  {!editing ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            ref={(node) => {
                              if (node) editButtonRefs.current.set(category.id, node)
                              else editButtonRefs.current.delete(category.id)
                            }}
                            type="button"
                            intent="informational"
                            appearance="ghost"
                            size="icon"
                            className="size-11 shrink-0"
                            aria-label={`Editar categoria ${category.nome}`}
                            disabled={pending !== null}
                            onClick={() => openEdit(category)}
                          />
                        }
                      >
                        <Pencil aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>Editar categoria</TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>

                {editing ? (
                  <form
                    className="flex min-w-0 flex-wrap items-end gap-2 border-t py-3"
                    aria-busy={pending !== null}
                    onSubmit={(event) => submitRename(event, category)}
                    onKeyDown={(event) => handleEscape(event, category.id)}
                  >
                    <div className="min-w-0 flex-1 basis-48">
                      <label
                        htmlFor={`category-name-${category.id}`}
                        className="text-xs font-medium"
                      >
                        Nome da categoria {category.nome}
                      </label>
                      <Input
                        ref={inputRef}
                        id={`category-name-${category.id}`}
                        className="mt-1 min-h-11"
                        value={draft}
                        required
                        disabled={pending !== null}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : undefined}
                        onChange={(event) => setDraft(event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      intent="neutral"
                      appearance="ghost"
                      className="min-h-11"
                      aria-label={`Cancelar edição de ${category.nome}`}
                      disabled={pending !== null}
                      onClick={() => closeEditor(category.id)}
                    >
                      <X aria-hidden="true" />
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      intent="destructive"
                      appearance="ghost"
                      className="min-h-11"
                      aria-label={`Excluir categoria ${category.nome}`}
                      disabled={pending !== null}
                      onClick={() => void deleteCategory(category)}
                    >
                      <Trash2 aria-hidden="true" />
                      Excluir
                    </Button>
                    <Button
                      type="submit"
                      intent="positive"
                      appearance="solid"
                      className="min-h-11"
                      aria-label={`Salvar categoria ${category.nome}`}
                      disabled={pending !== null}
                    >
                      <Check aria-hidden="true" />
                      {pending === 'rename' ? 'Salvando...' : 'Salvar'}
                    </Button>
                    {error ? (
                      <p
                        id={errorId}
                        className="basis-full text-sm text-destructive"
                        role="alert"
                      >
                        {error}
                      </p>
                    ) : null}
                  </form>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </AdminPanel>
  )
}
```

The selection button has text, weight/surface, and `aria-pressed`; pencil is the only icon-only idle action and has a specific accessible name. Every action target in this panel is at least 44px, every pending form exposes `aria-busy`, and errors remain adjacent to the active field.

- [ ] **Step 5: Verify GREEN for all transitions**

```powershell
npm test -- tests/unit/business/category-manager.test.ts tests/unit/ui/tooltip.test.ts
```

Expected: PASS for empty state; create/edit exclusivity; Enter/form submit; Escape; trim/blank validation; returned identity; next/previous/Add focus restoration; create/rename/delete pending repeat prevention; retained drafts/errors; confirmation; tooltip portal; and accessible labels/targets.

- [ ] **Step 6: Commit the complete manager work unit**

```powershell
git add -- components/admin/admin-page.tsx components/admin/category-manager.tsx tests/unit/business/category-manager.test.ts
git commit -m "feat(admin): add progressive category manager"
```

---

### Task 7: Isolate and test category deletion selection fallback

**Files:**
- Create: `lib/admin/category-selection.ts`
- Create: `tests/unit/business/category-selection.test.ts`

**Interfaces:**
- Produces: `nextCategoryIdAfterDeletion(categories, deletedId, currentId): string`.
- Preserves the current selection when another category is deleted; otherwise chooses next, then previous, then empty.

- [ ] **Step 0: Create the focused admin helper directory**

```powershell
New-Item -ItemType Directory -Force lib/admin | Out-Null
```

Expected: `lib/admin` exists and no unrelated directory is created.

- [ ] **Step 1: Write the failing pure transition tests**

Create `tests/unit/business/category-selection.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { nextCategoryIdAfterDeletion } from '@/lib/admin/category-selection'

const categories = [{ id: 'cat-1' }, { id: 'cat-2' }, { id: 'cat-3' }]

describe('nextCategoryIdAfterDeletion', () => {
  it('uses the next category when the selected category is deleted', () => {
    expect(nextCategoryIdAfterDeletion(categories, 'cat-2', 'cat-2')).toBe('cat-3')
  })

  it('uses the previous category when the deleted selection was last', () => {
    expect(nextCategoryIdAfterDeletion(categories, 'cat-3', 'cat-3')).toBe('cat-2')
  })

  it('clears selection when the deleted category was the only category', () => {
    expect(
      nextCategoryIdAfterDeletion([{ id: 'cat-1' }], 'cat-1', 'cat-1')
    ).toBe('')
  })

  it('preserves selection when a different category is deleted', () => {
    expect(nextCategoryIdAfterDeletion(categories, 'cat-1', 'cat-3')).toBe('cat-3')
  })
})
```

- [ ] **Step 2: Run the helper test and verify RED**

```powershell
npm test -- tests/unit/business/category-selection.test.ts
```

Expected: FAIL because `@/lib/admin/category-selection` does not exist.

- [ ] **Step 3: Implement the pure fallback**

Create `lib/admin/category-selection.ts`:

```ts
type CategoryIdentity = { id: string }

export function nextCategoryIdAfterDeletion(
  categories: CategoryIdentity[],
  deletedId: string,
  currentId: string
): string {
  if (currentId !== deletedId) return currentId

  const index = categories.findIndex((category) => category.id === deletedId)
  if (index < 0) return categories[0]?.id ?? ''
  return categories[index + 1]?.id ?? categories[index - 1]?.id ?? ''
}
```

- [ ] **Step 4: Verify GREEN**

```powershell
npm test -- tests/unit/business/category-selection.test.ts
```

Expected: all four transition cases PASS.

- [ ] **Step 5: Commit the deterministic selection unit**

```powershell
git add -- lib/admin/category-selection.ts tests/unit/business/category-selection.test.ts
git commit -m "feat(admin): define category deletion fallback"
```

---
### Task 8: Integrate progressive categories and semantic product actions

**Files:**
- Modify: `app/admin/menu/client.tsx`
- Create: `tests/unit/business/admin-menu-client.test.ts`
- Modify: `tests/unit/business/admin-management.test.ts`

**Interfaces:**
- Consumes: `CategoryManager`, `CreatedCategory`, and `nextCategoryIdAfterDeletion` from Tasks 5–7.
- Preserves the real server action name `toggleDisponivel`.
- `MenuAdminClient` owns selected-category/product-form state; `CategoryManager` owns editor state.

- [ ] **Step 1: Write the complete failing parent-state tests**

Create `tests/unit/business/admin-menu-client.test.ts`:

```ts
import { createElement } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategoryManagerProps } from '@/components/admin/category-manager'

const state = vi.hoisted(() => ({
  categoryProps: undefined as CategoryManagerProps | undefined,
  refresh: vi.fn(),
}))
const productActions = vi.hoisted(() => ({
  removerProduto: vi.fn(),
  toggleDisponivel: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: state.refresh }),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/components/admin/category-manager', () => ({
  CategoryManager: (props: CategoryManagerProps) => {
    state.categoryProps = props
    return createElement('div', { 'data-testid': 'category-manager' })
  },
}))
vi.mock('@/components/admin/produto-form', () => ({
  ProdutoForm: ({
    categoriaId,
    open,
  }: {
    categoriaId: string
    open: boolean
  }) =>
    open
      ? createElement('div', {
          'data-testid': 'product-form',
          'data-category-id': categoriaId,
        })
      : null,
}))
vi.mock('@/lib/actions/produtos', () => productActions)

import { MenuAdminClient } from '@/app/admin/menu/client'

const lanches = { id: 'cat-1', nome: 'Lanches', ordem: 0, produtos: [] }
const bebidas = { id: 'cat-2', nome: 'Bebidas', ordem: 1, produtos: [] }
const doces = { id: 'cat-3', nome: 'Doces', ordem: 2, produtos: [] }

beforeEach(() => {
  state.categoryProps = undefined
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('MenuAdminClient category selection', () => {
  it('uses unique empty-state copy and an accessible disabled reason', () => {
    render(createElement(MenuAdminClient, { categorias: [] }))

    const newProduct = screen.getByRole('button', { name: 'Novo produto' })
    expect(newProduct).toBeDisabled()
    expect(newProduct).toHaveAccessibleDescription(
      'Selecione ou crie uma categoria para habilitar Novo produto.'
    )
    expect(
      screen.getByRole('heading', { name: 'Crie sua primeira categoria' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Crie uma categoria para começar a cadastrar produtos.')
    ).toBeInTheDocument()
  })

  it('selects the server-created id immediately and opens product form for it', () => {
    render(createElement(MenuAdminClient, { categorias: [] }))

    act(() => {
      state.categoryProps!.onCreated({ id: doces.id, nome: doces.nome })
    })

    const newProduct = screen.getByRole('button', { name: 'Novo produto' })
    expect(newProduct).toBeEnabled()
    expect(state.categoryProps!.selectedId).toBe(doces.id)
    fireEvent.click(newProduct)
    expect(screen.getByTestId('product-form')).toHaveAttribute(
      'data-category-id',
      doces.id
    )
  })

  it('preserves the created selection when refreshed props contain it', async () => {
    const view = render(createElement(MenuAdminClient, { categorias: [] }))
    act(() => {
      state.categoryProps!.onCreated({ id: doces.id, nome: doces.nome })
    })

    view.rerender(
      createElement(MenuAdminClient, { categorias: [doces] })
    )

    await waitFor(() => expect(state.categoryProps!.selectedId).toBe(doces.id))
  })

  it('falls forward after deleting a selected middle category', () => {
    render(
      createElement(MenuAdminClient, {
        categorias: [lanches, bebidas, doces],
      })
    )

    act(() => state.categoryProps!.onSelect(bebidas.id))
    act(() => state.categoryProps!.onDeleted(bebidas.id))
    expect(state.categoryProps!.selectedId).toBe(doces.id)
  })

  it('falls backward after deleting the selected last category', () => {
    render(createElement(MenuAdminClient, { categorias: [lanches, bebidas] }))

    act(() => state.categoryProps!.onSelect(bebidas.id))
    act(() => state.categoryProps!.onDeleted(bebidas.id))
    expect(state.categoryProps!.selectedId).toBe(lanches.id)
  })

  it('clears selection after deleting the only category', () => {
    render(createElement(MenuAdminClient, { categorias: [lanches] }))

    act(() => state.categoryProps!.onDeleted(lanches.id))
    expect(state.categoryProps!.selectedId).toBe('')
    expect(screen.getByRole('button', { name: 'Novo produto' })).toBeDisabled()
  })

  it('falls to the first stable category after an external refresh removes selection', async () => {
    const view = render(
      createElement(MenuAdminClient, { categorias: [lanches, bebidas] })
    )
    act(() => state.categoryProps!.onSelect(bebidas.id))

    view.rerender(createElement(MenuAdminClient, { categorias: [lanches] }))

    await waitFor(() => expect(state.categoryProps!.selectedId).toBe(lanches.id))
  })

  it('shows the selected-category product empty state', () => {
    render(createElement(MenuAdminClient, { categorias: [lanches] }))

    expect(
      screen.getByRole('heading', { name: 'Nenhum produto nesta categoria' })
    ).toBeInTheDocument()
  })
})

describe('MenuAdminClient product actions', () => {
  const product = {
    id: 'prod-1',
    nome: 'X-Salada',
    descricao: null,
    preco: '25.00',
    imagemUrl: null,
    disponivel: true,
  }

  it('names edit, delete, and available-to-unavailable actions beyond color', async () => {
    render(
      createElement(MenuAdminClient, {
        categorias: [{ ...lanches, produtos: [product] }],
      })
    )

    expect(
      screen.getByRole('button', { name: 'Editar produto X-Salada' })
    ).toHaveClass('size-11')
    expect(
      screen.getByRole('button', { name: 'Excluir produto X-Salada' })
    ).toHaveClass('min-h-11')
    expect(screen.getByRole('button', { name: 'Excluir produto X-Salada' })).toHaveTextContent(
      'Excluir'
    )
    const availability = screen.getByRole('button', {
      name: 'Tornar X-Salada indisponível',
    })
    expect(availability).toHaveClass('min-h-11')
    expect(availability).toHaveTextContent('Tornar indisponível')
    fireEvent.click(availability)
    await waitFor(() => {
      expect(productActions.toggleDisponivel).toHaveBeenCalledWith(product.id)
    })
  })

  it('names the unavailable-to-available action explicitly', () => {
    render(
      createElement(MenuAdminClient, {
        categorias: [{
          ...lanches,
          produtos: [{ ...product, disponivel: false }],
        }],
      })
    )

    expect(
      screen.getByRole('button', { name: 'Disponibilizar X-Salada' })
    ).toHaveTextContent('Disponibilizar')
  })
})
```

These tests exercise each deletion fallback independently; they do not compress forward/backward/empty into a rerender sequence that can hide stale state.

- [ ] **Step 2: Replace the old source-string menu tests with the real identifier**

In `tests/unit/business/admin-management.test.ts`, replace the two current menu-specific `it(...)` blocks with:

```ts
it('uses one progressive category manager without the old category cards', () => {
  const menuClient = source('app/admin/menu/client.tsx')
  const categoryManager = source('components/admin/category-manager.tsx')

  expect(menuClient).toContain('<CategoryManager')
  expect(menuClient).not.toContain('title="Nova categoria"')
  expect(menuClient).not.toContain('Renomear categoria</Button>')
  expect(categoryManager).toContain('aria-label="Adicionar categoria"')
  expect(categoryManager).toContain('aria-label={`Editar categoria ${category.nome}`}')
  expect(categoryManager).toContain('<TooltipContent>Editar categoria</TooltipContent>')
  expect(categoryManager).toContain('aria-busy=')
  expect(categoryManager).toContain('role="alert"')
})

it('uses real semantic product actions and the existing server names', () => {
  const menuClient = source('app/admin/menu/client.tsx')
  const productActions = source('lib/actions/produtos.ts')

  expect(menuClient).toContain('toggleDisponivel')
  expect(productActions).toContain('editarCategoria')
  expect(productActions).toContain('removerCategoria')
  expect(productActions).toContain('removerProduto')
  expect(productActions).toContain("requireAccess('admin')")
  expect(menuClient).toContain('Tornar indisponível')
  expect(menuClient).toContain('Disponibilizar')
  expect(menuClient).toContain('aria-label={`Editar produto ${p.nome}`}')
  expect(menuClient).toContain('aria-label={`Excluir produto ${p.nome}`}')
  expect(menuClient).not.toContain('<Badge')
})
```

The local variable is `menuClient` everywhere. Delete the obsolete assertions for `Nome da nova categoria`, `Adicionar Categoria`, the always-visible rename panel, and direct `removerCategoria` imports in the page.

- [ ] **Step 3: Run integration tests and verify RED**

```powershell
npm test -- tests/unit/business/admin-menu-client.test.ts tests/unit/business/admin-management.test.ts tests/unit/business/category-selection.test.ts
```

Expected: FAIL because the page still owns the old forms, ignores the create payload, lacks the helper integration/unique empty copy, and uses native/legacy product controls.

- [ ] **Step 4: Replace scattered category state with exact selection continuity**

In `app/admin/menu/client.tsx`:

1. Change the React import to `import { useEffect, useState } from 'react'`.
2. Remove `Input`, `criarCategoria`, `editarCategoria`, and `removerCategoria` imports and their local states/handlers.
3. Keep the real `removerProduto` and `toggleDisponivel` imports.
4. Add imports for `CategoryManager`, `CreatedCategory`, and `nextCategoryIdAfterDeletion`.

The resulting local imports are:

```tsx
import {
  CategoryManager,
} from '@/components/admin/category-manager'
import {
  removerProduto,
  toggleDisponivel,
  type CreatedCategory,
} from '@/lib/actions/produtos'
import { nextCategoryIdAfterDeletion } from '@/lib/admin/category-selection'
```

Use this complete state block after `const router = useRouter()`:

```tsx
const [selectedCategoryId, setSelectedCategoryId] = useState(
  categorias[0]?.id ?? ''
)
const [formOpen, setFormOpen] = useState(false)
const [editProduto, setEditProduto] = useState<Produto | undefined>()
const [pendingCategory, setPendingCategory] = useState<CreatedCategory | null>(null)
const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})
const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({})

const displayedCategories =
  pendingCategory &&
  !categorias.some((category) => category.id === pendingCategory.id)
    ? [
        ...categorias,
        {
          ...pendingCategory,
          ordem: Number.MAX_SAFE_INTEGER,
          produtos: [],
        },
      ]
    : categorias

const selectedCategory = displayedCategories.find(
  (category) => category.id === selectedCategoryId
)
const produtoCount = selectedCategory?.produtos.length ?? 0

useEffect(() => {
  if (
    pendingCategory &&
    categorias.some((category) => category.id === pendingCategory.id)
  ) {
    setPendingCategory(null)
  }

  setSelectedCategoryId((current) => {
    const currentStillExists = categorias.some(
      (category) => category.id === current
    )
    const currentIsPending = pendingCategory?.id === current
    return currentStillExists || currentIsPending
      ? current
      : (categorias[0]?.id ?? '')
  })
}, [categorias, pendingCategory])

function handleCreated(created: CreatedCategory) {
  setPendingCategory(created)
  setSelectedCategoryId(created.id)
}

function handleDeleted(deletedId: string) {
  setPendingCategory((current) =>
    current?.id === deletedId ? null : current
  )
  setSelectedCategoryId((current) =>
    nextCategoryIdAfterDeletion(displayedCategories, deletedId, current)
  )
}
```

Keep `totalProdutos` and `totalDisponiveis` derived from the canonical `categorias` props so an optimistic identity without products does not distort server-backed metrics.

- [ ] **Step 5: Render the one manager and unique empty-state descriptions**

Keep `Novo produto` in `AdminPageHeader`; its action is:

```tsx
<>
  <Button
    type="button"
    intent="positive"
    appearance="solid"
    className="min-h-11 w-full sm:w-auto"
    aria-describedby={
      selectedCategory ? undefined : 'novo-produto-disabled-reason'
    }
    disabled={!selectedCategory}
    onClick={() => {
      setEditProduto(undefined)
      setFormOpen(true)
    }}
  >
    <Plus aria-hidden="true" />
    Novo produto
  </Button>
  <span id="novo-produto-disabled-reason" className="sr-only">
    Selecione ou crie uma categoria para habilitar Novo produto.
  </span>
</>
```

Replace the complete old `<aside>` contents with:

```tsx
<CategoryManager
  categorias={displayedCategories.map(({ id, nome, ordem }) => ({
    id,
    nome,
    ordem,
  }))}
  selectedId={selectedCategoryId}
  onSelect={setSelectedCategoryId}
  onCreated={handleCreated}
  onDeleted={handleDeleted}
  onRefresh={router.refresh}
/>
```

Use mutually exclusive product-area states with distinct copy:

```tsx
{!selectedCategory ? (
  <AdminEmptyState
    title="Crie sua primeira categoria"
    description="Crie uma categoria para começar a cadastrar produtos."
  />
) : produtoCount === 0 ? (
  <AdminEmptyState
    title="Nenhum produto nesta categoria"
    description="Use Novo produto para cadastrar o primeiro item desta categoria."
    action={
      <Button
        type="button"
        intent="positive"
        appearance="soft"
        className="min-h-11"
        onClick={() => {
          setEditProduto(undefined)
          setFormOpen(true)
        }}
      >
        <Plus aria-hidden="true" />
        Adicionar primeiro produto
      </Button>
    }
  />
) : (
  <div className="space-y-2">
    {selectedCategory.produtos.map((p) => (
      <div
        key={p.id}
        className="grid gap-3 rounded-[var(--radius)] border bg-card px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      >
        <div className="flex min-w-0 gap-3">
          <div className="relative flex h-12 w-12 shrink-0 select-none items-center justify-center overflow-hidden rounded-[var(--radius)] bg-muted text-xl">
            <span aria-hidden="true">🍕</span>
            {p.imagemUrl && !brokenImages[p.id] ? (
              <img
                src={p.imagemUrl}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover ${
                  loadedImages[p.id] ? 'block' : 'hidden'
                }`}
                onLoad={() => {
                  setLoadedImages((current) => ({ ...current, [p.id]: true }))
                }}
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                  setBrokenImages((current) => ({ ...current, [p.id]: true }))
                }}
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="break-words text-sm font-medium">{p.nome}</p>
            <p className="text-sm text-muted-foreground">
              R$ {parseFloat(p.preco).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            type="button"
            intent={p.disponivel ? 'warning' : 'positive'}
            appearance="soft"
            className="min-h-11"
            aria-pressed={p.disponivel}
            aria-label={
              p.disponivel
                ? `Tornar ${p.nome} indisponível`
                : `Disponibilizar ${p.nome}`
            }
            onClick={() => handleToggleProduto(p)}
          >
            {p.disponivel ? 'Tornar indisponível' : 'Disponibilizar'}
          </Button>
          <Button
            type="button"
            intent="informational"
            appearance="ghost"
            size="icon"
            className="size-11"
            aria-label={`Editar produto ${p.nome}`}
            onClick={() => {
              setEditProduto(p)
              setFormOpen(true)
            }}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            type="button"
            intent="destructive"
            appearance="soft"
            className="min-h-11"
            aria-label={`Excluir produto ${p.nome}`}
            onClick={() => handleRemoveProduto(p)}
          >
            Excluir
          </Button>
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 6: Replace the product action block with real handlers and labels**

Inside the existing `selectedCategory.produtos.map((p) => ...)` card, replace only the action-controls `<div>` with:

```tsx
<div className="flex flex-wrap items-center gap-2 sm:justify-end">
  <Button
    type="button"
    intent={p.disponivel ? 'warning' : 'positive'}
    appearance="soft"
    className="min-h-11"
    aria-pressed={p.disponivel}
    aria-label={
      p.disponivel
        ? `Tornar ${p.nome} indisponível`
        : `Disponibilizar ${p.nome}`
    }
    onClick={() => handleToggleProduto(p)}
  >
    {p.disponivel ? 'Tornar indisponível' : 'Disponibilizar'}
  </Button>
  <Button
    type="button"
    intent="informational"
    appearance="ghost"
    size="icon"
    className="size-11"
    aria-label={`Editar produto ${p.nome}`}
    onClick={() => {
      setEditProduto(p)
      setFormOpen(true)
    }}
  >
    <Pencil aria-hidden="true" />
  </Button>
  <Button
    type="button"
    intent="destructive"
    appearance="soft"
    className="min-h-11"
    aria-label={`Excluir produto ${p.nome}`}
    onClick={() => handleRemoveProduto(p)}
  >
    Excluir
  </Button>
</div>
```

Keep the existing functions and call `toggleDisponivel(produto.id)` inside `handleToggleProduto`; do not rename the import or action. The availability control exposes current state through `aria-pressed` and next action through explicit text, so color is never the only signal.

Render the product form only for a real or optimistic selected identity:

```tsx
{selectedCategory ? (
  <ProdutoForm
    key={editProduto?.id ?? 'new'}
    open={formOpen}
    onClose={() => setFormOpen(false)}
    categoriaId={selectedCategory.id}
    produto={editProduto}
  />
) : null}
```

- [ ] **Step 7: Verify GREEN and every parent transition**

```powershell
npm test -- tests/unit/business/admin-menu-client.test.ts tests/unit/business/category-manager.test.ts tests/unit/business/category-selection.test.ts tests/unit/business/admin-management.test.ts tests/unit/actions/produtos.test.ts
```

Expected: PASS for unique zero-state copy, immediate first-ID selection, refresh continuity, external-removal fallback, forward/backward/empty deletion, product empty state, semantic labels, the real `toggleDisponivel` name, manager transitions, and server ordering.

- [ ] **Step 8: Commit the integration work unit**

```powershell
git add -- app/admin/menu/client.tsx tests/unit/business/admin-menu-client.test.ts tests/unit/business/admin-management.test.ts
git commit -m "feat(admin): integrate progressive category management"
```

---
### Task 9: Document the action contract and verify the complete change

**Files:**
- Modify: `DESIGN.md`
- Modify: `tests/unit/design/design-system.test.ts`
- Verify only: every file in the feature range; do not commit screenshots, `test-results/`, database files, or server logs.

- [ ] **Step 1: Write the failing design-contract regression**

Extend `tests/unit/design/design-system.test.ts`:

```ts
it('documents the semantic action taxonomy and accessible token values', () => {
  const guide = source('DESIGN.md')

  expect(guide).toContain('neutral, positive, informational, warning, destructive')
  expect(guide).toContain('solid, soft, outline, ghost, link')
  expect(guide).toContain('#15803d')
  expect(guide).toContain('#175cd3')
  expect(guide).toContain('#fde68a')
  expect(guide).toContain('#007f62')
  expect(guide).toContain('Color is never the only cue')
  expect(guide).not.toContain('green success actions')
  expect(guide).not.toContain('Focus Mint')
})
```

- [ ] **Step 2: Run the design-system test to verify RED**

```powershell
npm test -- tests/unit/design/design-system.test.ts
```

Expected: FAIL because the current guide still describes the old success/destructive vocabulary and does not record all approved tokens.

- [ ] **Step 3: Replace the legacy Button section in `DESIGN.md`**

Keep the existing document structure. In the frontmatter color map replace the legacy success/focus entries with `action-positive: "#15803d"`, `action-positive-hover: "#166534"`, `action-informational: "#175cd3"`, `action-informational-hover: "#1849a9"`, `action-warning: "#fde68a"`, `action-warning-foreground: "#713f12"`, `action-destructive: "#b42318"`, and `focus-ring: "#007f62"`. Replace `button-success` with semantic examples named `button-positive`, `button-informational`, and `button-warning`; keep the destructive example but point it at `action-destructive`.

Then replace the prose Buttons/action section with this contract:

```md
## Semantic actions

Buttons combine an intent (`neutral, positive, informational, warning, destructive`)
with an appearance (`solid, soft, outline, ghost, link`). Intent describes the
business meaning; appearance describes visual emphasis. Color is never the only
cue: pair it with explicit wording, an icon, accessible state, or confirmation.

| Intent | Use | Base token |
| --- | --- | --- |
| neutral | navigation, inspect, close, logout, or discard an unpersisted draft | existing foreground/secondary tokens |
| positive | create, add, save, confirm, register, or complete | `#15803d`; hover `#166534` |
| informational | edit or configure | `#175cd3`; hover `#1849a9` |
| warning | reversible operational disruption | soft `#fde68a` with text `#713f12` |
| destructive | delete, remove, or cancel persisted work | `#b42318` |

Use focus ring `#007f62`. Body text must meet 4.5:1 contrast; interactive borders,
icons, and focus indicators must meet 3:1 against adjacent surfaces. Dismissive
“Cancelar” is neutral, while “Cancelar pedido” is destructive. Icon-only controls
have an accessible name and at least a 44 × 44px target.
```

Remove any frontmatter or prose that calls mint green the primary success action, maps every Cancel button to destructive red, or describes color without its semantic/non-color cue.

- [ ] **Step 4: Verify the documentation test is GREEN**

```powershell
npm test -- tests/unit/design/design-system.test.ts tests/unit/design/button-semantics.test.ts
```

Expected: PASS with the exact approved action vocabulary and tokens.

- [ ] **Step 5: Commit the documented contract**

```powershell
git add -- DESIGN.md tests/unit/design/design-system.test.ts
git commit -m "docs: document semantic action system"
```

- [ ] **Step 6: Run the focused feature suite**

```powershell
npm test -- tests/unit/ui/button.test.ts tests/unit/ui/tooltip.test.ts tests/unit/actions/produtos.test.ts tests/unit/design/design-system.test.ts tests/unit/design/button-semantics.test.ts tests/unit/business/admin-management.test.ts tests/unit/business/admin-menu-client.test.ts tests/unit/business/category-manager.test.ts tests/unit/business/category-selection.test.ts tests/unit/business/waiter-cart-actions.test.ts tests/unit/business/waiter-order-actions.test.ts tests/unit/business/table-orders-panel.test.ts tests/unit/business/cashier-orders.test.ts tests/unit/auth/logout-button.test.ts tests/unit/routing/access-navigation.test.ts
```

Expected: all listed files PASS. Fix feature regressions before proceeding; do not delete an assertion merely to make the suite green.

- [ ] **Step 7: Run repository gates and distinguish known baseline failures**

```powershell
npm test
npm run build
npx.cmd tsc --noEmit
```

Expected:

- `npm test`: all tests PASS; the existing `vite-tsconfig-paths` warning may remain.
- `npm run build`: PASS.
- `npx.cmd tsc --noEmit`: no new feature diagnostic. At the recorded base this command already exits non-zero at `tests/unit/sse.test.ts(17,93)` because its string payload conflicts with the declared SSE payload type. Record that exact baseline diagnostic separately; do not misreport the typecheck as green and do not broaden this feature to fix the unrelated SSE test.

Use `npx.cmd`, not `npx`, because the PowerShell execution policy blocks the `.ps1` shim in this environment.
The recorded `package.json` has no `lint` script. Do not invent or report a lint gate; rely on the configured Vitest, Next build, TypeScript, browser, and Git checks unless a separate lint work unit is approved.

- [ ] **Step 8: Verify the real UI with a disposable database and explicit fixtures**

Never point this verification at `dev.db`. In the first PowerShell terminal, create an isolated database under the OS temp directory and record the development DB hash only as a non-mutation guard:

```powershell
$fixtureRoot = Join-Path $env:TEMP 'restaurante-comandas-semantic-actions'
New-Item -ItemType Directory -Force $fixtureRoot | Out-Null
$dbPath = Join-Path $fixtureRoot 'browser.db'
foreach ($artifact in @($dbPath, "$dbPath-wal", "$dbPath-shm")) {
  if (Test-Path -LiteralPath $artifact) {
    Remove-Item -LiteralPath $artifact -Force
  }
}
$devDbPath = Join-Path (Get-Location).Path 'dev.db'
$devDbExistedBefore = Test-Path -LiteralPath $devDbPath
$devHashBefore = if ($devDbExistedBefore) {
  (Get-FileHash -LiteralPath $devDbPath -Algorithm SHA256).Hash
} else {
  $null
}
$env:DATABASE_URL = "file:$dbPath"
npm run db:push
npm run db:seed
```

Expected: `$dbPath` exists and seed output names the temp path. No database command or application server points at `dev.db`; `Get-FileHash` reads it only as the non-mutation guard.

Start the app in a second terminal with the same explicit path:

```powershell
$fixtureRoot = Join-Path $env:TEMP 'restaurante-comandas-semantic-actions'
$dbPath = Join-Path $fixtureRoot 'browser.db'
$env:DATABASE_URL = "file:$dbPath"
npm run dev
```

Use Playwright or the in-app browser at the printed localhost URL. Sign in with the disposable seeded admin fixture `admin@local.com` / `dev123456`. Verify at `1440 × 900` and `390 × 844` in this order:

**Fixture A — populated:** the seed explicitly creates `Cozinha` with `Lasanha Bolonhesa` and other products.

1. `/admin/menu` shows categories/products without horizontal overflow.
2. `Novo produto` remains in the page header.
3. Availability uses explicit `Tornar indisponível` / `Disponibilizar` wording and not color alone.
4. Product edit pencil and every category pencil have visible focus, object-specific accessible names, and measured `44 × 44px` targets.

**Fixture B — protected deletion failure:** still on the populated database, open the `Cozinha` pencil, choose `Excluir`, and confirm.

1. The editor remains open.
2. `Remova os produtos antes de excluir a categoria` appears inline with `role="alert"`.
3. The category draft is preserved and the action is no longer busy after rejection.

Stop the dev server before changing fixture state. In the first terminal, convert only the disposable database to the empty fixture:

```powershell
$fixtureRoot = Join-Path $env:TEMP 'restaurante-comandas-semantic-actions'
$dbPath = Join-Path $fixtureRoot 'browser.db'
@"
const Database = require('better-sqlite3')
const path = process.argv[2]
const db = new Database(path)
db.pragma('foreign_keys = ON')
const tenantId = '00000000-0000-4000-8000-000000000001'
db.transaction(() => {
  db.prepare('DELETE FROM produto WHERE tenant_id = ?').run(tenantId)
  db.prepare('DELETE FROM categoria WHERE tenant_id = ?').run(tenantId)
})()
db.close()
"@ | node - "$dbPath"
```

Restart `npm run dev` with the same temp `DATABASE_URL`, sign in again, and verify:

**Fixture C — empty:**

1. The category panel keeps `Adicionar` visible with its local guidance.
2. The product area shows `Crie sua primeira categoria` and the distinct description `Crie uma categoria para começar a cadastrar produtos.`
3. Header `Novo produto` is disabled and its accessible description is `Selecione ou crie uma categoria para habilitar Novo produto.`

**Fixture D — first category created through the real UI:**

1. Activate `Adicionar`, confirm immediate input focus, and enter `Sobremesas artesanais da casa para compartilhar`.
2. Press Enter once. While pending, the form announces busy and blocks a second submit.
3. After success, focus returns to `Adicionar`, the returned identity is selected immediately, and header `Novo produto` becomes enabled without manual category selection.
4. The long name wraps without pushing the 44px pencil outside the panel.
5. Open the pencil: the portal tooltip is not clipped. Replace the name with spaces and submit to produce `Informe o nome da categoria`; confirm the draft/editor remains with `role="alert"`. Then restore a valid name, save once, and confirm busy plus pencil-focus restoration. Reopen and use Escape to confirm the same focus fallback.
6. The new category has no products, so `Nenhum produto nesta categoria` and `Adicionar primeiro produto` are visible.

Across both viewports, keyboard through every category/create/edit/delete control, confirm one editor at a time, and check that labels/icons/state still distinguish actions with color ignored. In Chromium DevTools Rendering, repeat representative positive/informational/warning/destructive checks with protanopia and deuteranopia emulation. Inspect computed contrast for text (≥4.5:1) and interactive borders/icons/focus (≥3:1).

Before cleanup, spot-check representative admin, waiter, kitchen, cashier, sign-in/profile/logout, no-access, and company-selection screens using the same disposable database. Kitchen has no shared action-button surface in the recorded base; preserve its order-state behavior rather than inventing controls.

Stop the server, verify the development database hash, then remove only the validated temp fixture directory:

```powershell
if ($devDbExistedBefore) {
  $devHashAfter = (Get-FileHash -LiteralPath $devDbPath -Algorithm SHA256).Hash
  if ($devHashAfter -ne $devHashBefore) {
    throw 'dev.db changed during disposable browser verification'
  }
} elseif (Test-Path -LiteralPath $devDbPath) {
  throw 'dev.db was created during disposable browser verification'
}
$resolvedFixture = (Resolve-Path -LiteralPath $fixtureRoot).Path
$resolvedTemp = (Resolve-Path -LiteralPath $env:TEMP).Path
if (-not $resolvedFixture.StartsWith(
  $resolvedTemp + [IO.Path]::DirectorySeparatorChar,
  [StringComparison]::OrdinalIgnoreCase
)) {
  throw "Refusing to remove fixture outside TEMP: $resolvedFixture"
}
Remove-Item -LiteralPath $resolvedFixture -Recurse -Force
```

Do not use the full Chromium suite as this feature's acceptance gate: the recorded base already has five stale kitchen tests that assume unauthenticated public access and three passing waiter tests. If run for extra evidence, report that baseline split honestly; never weaken auth to satisfy stale fixtures.
- [ ] **Step 9: Audit the feature range, generated artifacts, and worktree**

```powershell
$base = Get-Content .git/semantic-actions-admin-menu.base
git diff --check "$base..HEAD"
git diff --stat "$base..HEAD"
git diff --name-only "$base..HEAD"
rg -n "variant=|buttonVariants\(\{ variant|<button" app components
git status --short
```

Expected:

- `git diff --check` prints nothing and exits `0`.
- The changed-file list contains only paths named in this plan plus any separately reviewed test fixture required by an actual compiler error.
- No `test-results/`, screenshots, local database changes, logs, or `.env` files appear.
- Every remaining legacy alias call is either removed or listed as an intentional compatibility consumer; every remaining native `<button>` is a justified tab, disclosure, row selector, or accessible primitive and uses the shared semantic utility rather than a duplicated action palette.
- `DESIGNTESTE.MD` and `revisao_geral.md` remain untracked and untouched.
- The range consists of the conventional work-unit commits recorded in Tasks 1–9, without AI attribution.

If implementation review produces a code correction after its task commit, make one narrowly scoped conventional follow-up commit; never hide review corrections by rewriting unrelated history.

## Completion Evidence

Before requesting merge or push, attach a concise evidence table with:

| Gate | Required evidence |
| --- | --- |
| Focused Vitest | command plus passing file/test counts |
| Full Vitest | command plus passing file/test counts |
| Next build | successful command exit |
| TypeScript | exact pre-existing SSE diagnostic only, or a clean run if separately fixed before this work |
| Browser | desktop/mobile routes, keyboard/focus flows, error path, and contrast observations |
| Git | `diff --check`, range stat, commit list, and clean feature paths |

Do not claim completion while a new feature test, build error, accessibility regression, or unreviewed file remains.
