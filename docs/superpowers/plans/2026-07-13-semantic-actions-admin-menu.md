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
- `tests/unit/business/cashier-orders.test.ts` — cashier action semantics.

### Progressive category management

- `components/ui/tooltip.tsx` — Base UI tooltip wrapper with body portal and restrained motion.
- `tests/unit/ui/tooltip.test.ts` — portal, role, and accessible trigger behavior.
- `lib/actions/produtos.ts` — trim/blank validation and `{ id, nome }` create response.
- `tests/unit/actions/produtos.test.ts` — server-boundary normalization and rejection.
- `components/admin/admin-page.tsx` — optional action slot in `AdminPanel` header.
- `components/admin/category-manager.tsx` — exclusive inline create/edit/delete state, focus, pending, errors, and tooltip.
- `tests/unit/business/category-manager.test.ts` — component interaction and accessibility behavior.
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

| Measure | Forecast |
| --- | --- |
| Tracked files | approximately 40 |
| Changed lines | approximately 1,500–2,100 |
| Largest unit | CategoryManager plus behavioral tests |
| `400`-line budget risk | **High** |
| Chained PRs recommended | **Yes** |
| Decision needed before apply | **Yes** |

Suggested review slices are: Task 1; Tasks 2–3; Tasks 4–5; Tasks 6–7; Tasks 8–9. Each task still ends in its own work-unit commit so either chained strategy can move boundaries without rewriting history.

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
git add -- app/globals.css components/ui/button.tsx tests/unit/ui/button.test.ts tests/types/button-props.ts tests/unit/design/design-system.test.ts tests/unit/design/button-semantics.test.ts tests/unit/business/admin-management.test.ts
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
expect(mesasSource).toContain("intent={m.ativa ? 'warning' : 'positive'}")
expect(mesasSource).toContain("m.ativa ? 'Desativar' : 'Ativar'")
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
| `components/auth/profile-menu.tsx` Sair | `<Button type="submit" intent="neutral" appearance="outline" size="sm" className="w-full">` |
| `app/sem-acesso/page.tsx` Trocar área link | `buttonVariants({ intent: 'neutral', appearance: 'outline', className: 'w-full sm:w-auto' })` |
| `app/sem-acesso/page.tsx` Sair | `<Button type="submit" intent="neutral" appearance="outline" className="w-full sm:w-auto">` |
| `app/selecionar-empresa/page.tsx` company choice | `<Button type="submit" intent="neutral" appearance="outline" className="h-auto min-h-11 w-full justify-start p-4 text-left">` |
| `components/ui/dialog.tsx` icon close | Keep `DialogPrimitive.Close`; set its `render={<Button intent="neutral" appearance="ghost" className="absolute right-2 top-2" size="icon-sm" />}` |
| `components/ui/dialog.tsx` footer Close | Keep `DialogPrimitive.Close`; set its `render={<Button intent="neutral" appearance="outline" />}` |
| `components/ui/sheet.tsx` icon close | Keep `SheetPrimitive.Close`; set its `render={<Button intent="neutral" appearance="ghost" className="absolute right-3 top-3" size="icon-sm" />}` |

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
  className="cursor-pointer"
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

- [ ] **Step 5: Commit the admin/auth work unit**

```powershell
git add -- components/admin/produto-form.tsx app/admin/mesas/client.tsx app/admin/usuarios/page.tsx app/auth/sign-in/client.tsx app/auth/sign-up/page.tsx components/auth/profile-menu.tsx components/auth/profile-menu-client.tsx app/sem-acesso/page.tsx app/selecionar-empresa/page.tsx components/ui/dialog.tsx components/ui/sheet.tsx tests/unit/auth/logout-button.test.ts tests/unit/routing/access-navigation.test.ts tests/unit/business/admin-management.test.ts
git commit -m "refactor(admin): apply semantic action intents"
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
- Modify: `tests/unit/business/table-orders-panel.test.ts:47-53`
- Modify: `tests/unit/business/cashier-orders.test.ts:24-36`

**Interfaces:**
- Consumes: Task 1 semantic Button API and Task 2 neutral/danger distinction.
- Produces: explicit operational semantics, 44px icon actions, and a repository regression that protects neutral dismissals while preserving actual order cancellation.

- [ ] **Step 1: Replace brittle legacy expectations with failing semantic regressions**

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
    expect(cart).toContain('aria-label={`Remover ${item.nome} do carrinho`}')
    expect(itemCard).toContain('size-11')
    expect(cart).toContain('size-11')
  })
})
```

Update the final assertions in `tests/unit/business/table-orders-panel.test.ts`:

```ts
expect(panel).toMatch(/intent="destructive"[\s\S]*Cancelar/)
expect(panel).toMatch(/intent="neutral"[\s\S]*Itens/)
expect(panel).toMatch(/ml-auto[\s\S]*intent="positive"[\s\S]*Entregue/)
```

Replace the legacy success assertion in `tests/unit/business/cashier-orders.test.ts`:

```ts
expect(client).toMatch(/intent="positive"[\s\S]*Registrar pagamento/)
expect(client).toMatch(/intent="neutral"[\s\S]*Cancelar/)
```

- [ ] **Step 2: Run the operational tests to verify RED**

```powershell
npm test -- tests/unit/design/button-semantics.test.ts tests/unit/business/table-orders-panel.test.ts tests/unit/business/cashier-orders.test.ts
```

Expected: FAIL because the listed files still use legacy `success`, red dismiss/back controls, and 40px unnamed icon actions.

- [ ] **Step 3: Apply the exact waiter/cashier intent matrix**

Preserve handlers, disabled conditions, polling/SSE state, forms, and routes. Replace the semantic props as follows:

| Path and action | Intent / appearance |
| --- | --- |
| `app/garcom/mesa/[id]/client.tsx` Voltar link | `buttonVariants({ intent: 'neutral', appearance: 'outline', size: 'sm' })` |
| `table-orders-panel.tsx` Cancelar persisted order | `destructive + soft` |
| `table-orders-panel.tsx` Itens | `neutral + outline` |
| `table-orders-panel.tsx` Entregue | `positive + solid` |
| `pending-deliveries-client.tsx` Confirmar entrega | `positive + solid` |
| `pending-deliveries-client.tsx` Abrir mesas link | `neutral + solid` |
| `item-card.tsx` decrement | `neutral + outline`, `className="size-11 p-0"`, label `Diminuir ${produto.nome}` |
| `item-card.tsx` increment | `positive + soft`, `className="size-11 p-0"`, label `Adicionar mais ${produto.nome}` |
| `item-card.tsx` first add | `positive + solid` |
| `observacao-sheet.tsx` Salvar | `positive + solid` |
| `cart-drawer.tsx` Editar observação | `informational + link`, minimum height `44px` |
| `cart-drawer.tsx` decrement | `neutral + outline`, `size-11` |
| `cart-drawer.tsx` increment | `positive + soft`, `size-11` |
| `cart-drawer.tsx` remove item | `destructive + ghost`, `size-11` |
| `cart-drawer.tsx` Confirmar pedido | `positive + solid` |
| `cart-drawer.tsx` dismiss Cancelar | `neutral + outline` |
| `cart-fab.tsx` Abrir carrinho navigation | `neutral + solid` |
| `admin/pedidos/client.tsx` Itens do pedido | `neutral + outline` |
| `admin/pedidos/client.tsx` open/submit payment | `positive + solid` |
| `admin/pedidos/client.tsx` dismiss payment Cancelar | `neutral + outline` |

Use this shape for icon-only actions; substitute the existing handler and object name exactly:

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

For pending buttons, expose both states without changing the handler:

```tsx
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
```

- [ ] **Step 4: Verify GREEN and remove operational legacy aliases**

```powershell
npm test -- tests/unit/design/button-semantics.test.ts tests/unit/business/table-orders-panel.test.ts tests/unit/business/cashier-orders.test.ts
rg -n "variant=|buttonVariants\(\{ variant" app/garcom components/garcom app/admin/pedidos/client.tsx
```

Expected: tests PASS. `rg` finds no legacy Button aliases in the migrated operational files; exit `1` is the expected no-match result.

- [ ] **Step 5: Commit the operational migration**

```powershell
git add -- "app/garcom/mesa/[id]/client.tsx" components/garcom/table-orders-panel.tsx components/garcom/pending-deliveries-client.tsx components/garcom/item-card.tsx components/garcom/observacao-sheet.tsx components/garcom/cart-drawer.tsx components/garcom/cart-fab.tsx app/admin/pedidos/client.tsx tests/unit/design/button-semantics.test.ts tests/unit/business/table-orders-panel.test.ts tests/unit/business/cashier-orders.test.ts
git commit -m "refactor(operations): apply semantic action intents"
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

### Task 5: Enforce category-name normalization at the server boundary

**Files:**
- Modify: `lib/actions/produtos.ts:115-145`
- Modify: `tests/unit/actions/produtos.test.ts`

**Interfaces:**
- `criarCategoria(nome: string): Promise<CreatedCategory>` where `CreatedCategory` is `{ id: string; nome: string }`.
- Authorization and tenant filtering remain first-class. Validation runs after `requireAccess('admin')` and before any insert.

- [ ] **Step 1: Write failing action tests for trim, response identity, and blank rejection**

Replace the existing one-case `criarCategoria` describe block in `tests/unit/actions/produtos.test.ts`; keep its current module mocks and `beforeEach(() => vi.clearAllMocks())`:

```ts
it('normalizes the category name and returns its server identity', async () => {
  const values = vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([
      { id: 'cat-1', nome: 'Pizzas' },
    ]),
  })
  ;(db.insert as any).mockReturnValue({ values })

  await expect(criarCategoria('  Pizzas  ')).resolves.toEqual({
    id: 'cat-1',
    nome: 'Pizzas',
  })

  expect(values).toHaveBeenCalledWith({
    id: expect.any(String),
    tenantId: 'tenant-1',
    nome: 'Pizzas',
    ordem: 0,
  })
})

it('rejects a blank category name before inserting', async () => {
  await expect(criarCategoria('   ')).rejects.toThrow(
    'Informe o nome da categoria'
  )

  expect(db.insert).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the action tests to verify RED**

```powershell
npm test -- tests/unit/actions/produtos.test.ts
```

Expected: FAIL because the current action inserts whitespace unchanged, accepts an empty normalized name, and returns only the old response shape.

- [ ] **Step 3: Normalize once, reject blank, and return the inserted row**

In `lib/actions/produtos.ts`, export the response type and replace only `criarCategoria`:

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

  const [created] = await db
    .insert(categoria)
    .values({
      id: createId(),
      tenantId,
      nome: normalizedName,
      ordem: 0,
    })
    .returning({
      id: categoria.id,
      nome: categoria.nome,
    })

  revalidatePath('/admin/menu')
  return created
}
```

Keep the current `createId()` and default order behavior; the required change is the normalized `nome`, blank guard, and explicit `{ id, nome }` return projection. Do not add uniqueness validation or leak another tenant's rows.

- [ ] **Step 4: Verify GREEN and retain the existing authorization tests**

```powershell
npm test -- tests/unit/actions/produtos.test.ts
```

Expected: PASS, including the pre-existing access/tenant tests and the two new boundary cases.

- [ ] **Step 5: Commit the server-boundary fix**

```powershell
git add -- lib/actions/produtos.ts tests/unit/actions/produtos.test.ts
git commit -m "fix(categories): validate category names at server boundary"
```

---

### Task 6: Build inline category creation and pencil editing

**Files:**
- Modify: `components/admin/admin-page.tsx:70-115`
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

Task 6 wires `onDeleted` into the public type but does not show deletion until Task 7. This prevents an interface-breaking rewrite between the two work units.

- [ ] **Step 1: Write failing interaction tests before creating the component**

Create `tests/unit/business/category-manager.test.ts` with hoisted action spies and render helpers:

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
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import {
  CategoryManager,
  type CategoryManagerProps,
} from '@/components/admin/category-manager'

const categorias = [
  { id: 'cat-1', nome: 'Pizzas', ordem: 0 },
  { id: 'cat-2', nome: 'Bebidas', ordem: 1 },
]

function renderManager(overrides: Partial<CategoryManagerProps> = {}) {
  const props: CategoryManagerProps = {
    categorias,
    selectedId: 'cat-1',
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
afterEach(cleanup)
```

Add these behavior cases to the same file:

```ts
it('creates inline, forwards the returned identity once, and restores Add focus', async () => {
  actions.criarCategoria.mockResolvedValueOnce({ id: 'cat-3', nome: 'Doces' })
  const props = renderManager()

  const add = screen.getByRole('button', { name: 'Adicionar categoria' })
  fireEvent.click(add)
  const input = await screen.findByRole('textbox', { name: 'Nome da nova categoria' })
  expect(input).toHaveFocus()

  fireEvent.change(input, { target: { value: '  Doces  ' } })
  fireEvent.submit(input.closest('form')!)

  await waitFor(() => {
    expect(actions.criarCategoria).toHaveBeenCalledTimes(1)
    expect(actions.criarCategoria).toHaveBeenCalledWith('Doces')
    expect(props.onCreated).toHaveBeenCalledWith({ id: 'cat-3', nome: 'Doces' })
  })
  expect(props.onRefresh).toHaveBeenCalledTimes(1)
  expect(add).toHaveFocus()
})

it('opens only one pencil editor and Escape cancels without a mutation', async () => {
  renderManager()
  fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))

  const input = await screen.findByRole('textbox', { name: 'Nome da categoria Pizzas' })
  expect(input).toHaveFocus()
  expect(input).toHaveValue('Pizzas')
  expect(screen.queryByRole('textbox', { name: 'Nome da categoria Bebidas' })).toBeNull()

  fireEvent.keyDown(input, { key: 'Escape' })
  expect(actions.editarCategoria).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Editar categoria Pizzas' })).toHaveFocus()
})

it('keeps a failed draft inline and exposes the error as an alert', async () => {
  actions.editarCategoria.mockRejectedValueOnce(new Error('Nome indisponível'))
  renderManager()

  fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Bebidas' }))
  const input = await screen.findByRole('textbox', { name: 'Nome da categoria Bebidas' })
  fireEvent.change(input, { target: { value: 'Bebidas geladas' } })
  fireEvent.submit(input.closest('form')!)

  expect(await screen.findByRole('alert')).toHaveTextContent('Nome indisponível')
  expect(input).toHaveValue('Bebidas geladas')
})

it('rejects a blank client draft and blocks a duplicate pending submit', async () => {
  let resolveRename!: () => void
  actions.editarCategoria.mockImplementationOnce(
    () => new Promise<void>((resolve) => { resolveRename = resolve })
  )
  renderManager()

  fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
  const input = await screen.findByRole('textbox', { name: 'Nome da categoria Pizzas' })
  fireEvent.change(input, { target: { value: '   ' } })
  fireEvent.submit(input.closest('form')!)
  expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome da categoria')
  expect(actions.editarCategoria).not.toHaveBeenCalled()

  fireEvent.change(input, { target: { value: 'Massas' } })
  fireEvent.submit(input.closest('form')!)
  fireEvent.submit(input.closest('form')!)
  expect(actions.editarCategoria).toHaveBeenCalledTimes(1)
  expect(input.closest('form')).toHaveAttribute('aria-busy', 'true')

  await act(async () => resolveRename())
})

it('keeps Add and guidance visible when the category list is empty', () => {
  renderManager({ categorias: [], selectedId: '' })

  expect(screen.getByRole('button', { name: 'Adicionar categoria' })).toBeEnabled()
  expect(
    screen.getByText('Nenhuma categoria criada. Use Adicionar para começar.')
  ).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the category-manager test to verify RED**

```powershell
npm test -- tests/unit/business/category-manager.test.ts
```

Expected: FAIL with a missing `@/components/admin/category-manager` module.

- [ ] **Step 3: Give `AdminPanel` a compact header action slot**

Extend its props in `components/admin/admin-page.tsx` without changing current callers:

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

Import `type ReactNode` from `react`. Preserve the existing section/card classes not shown above if they differ; only the optional header action and flex layout are new behavior.

- [ ] **Step 4: Implement one exclusive create/edit state machine**

Create `components/admin/category-manager.tsx`. Use this state and focus skeleton exactly:

```tsx
'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Check, Pencil, Plus, X } from 'lucide-react'
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
  type CreatedCategory,
} from '@/lib/actions/produtos'
import { cn } from '@/lib/utils'

export type CategoryListItem = { id: string; nome: string; ordem: number }
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

const messageFrom = (error: unknown) =>
  error instanceof Error ? error.message : 'Não foi possível salvar a categoria'

export function CategoryManager(props: CategoryManagerProps) {
  const [editor, setEditor] = useState<EditorState>({ mode: 'idle' })
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<PendingMutation>(null)
  const pendingRef = useRef<PendingMutation>(null)
  const returnFocusRef = useRef<'add' | string | null>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editButtonRefs = useRef(new Map<string, HTMLButtonElement>())

  const focusSoon = (resolve: () => HTMLElement | null | undefined) => {
    queueMicrotask(() => resolve()?.focus())
  }

  useEffect(() => {
    if (editor.mode !== 'idle') {
      inputRef.current?.focus()
      inputRef.current?.select()
      return
    }

    const returnTo = returnFocusRef.current
    if (!returnTo) return
    returnFocusRef.current = null
    focusSoon(() =>
      returnTo === 'add'
        ? addButtonRef.current
        : editButtonRefs.current.get(returnTo)
    )
  }, [editor])

  const beginMutation = (kind: Exclude<PendingMutation, null>) => {
    if (pendingRef.current) return false
    pendingRef.current = kind
    setPending(kind)
    return true
  }

  const finishMutation = () => {
    pendingRef.current = null
    setPending(null)
  }

  const closeEditor = (returnTo: 'add' | string) => {
    returnFocusRef.current = returnTo
    setEditor({ mode: 'idle' })
    setDraft('')
    setError('')
  }

  const onEscape = (event: KeyboardEvent<HTMLInputElement>, returnTo: 'add' | string) => {
    if (event.key === 'Escape' && !pendingRef.current) {
      event.preventDefault()
      closeEditor(returnTo)
    }
  }
```

Add exact submit handlers after that skeleton:

```tsx
  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
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
      props.onCreated(created)
      props.onRefresh()
      toast.success('Categoria criada')
      closeEditor('add')
    } catch (caught) {
      setError(messageFrom(caught))
      toast.error('Não foi possível criar a categoria')
    } finally {
      finishMutation()
    }
  }

  const submitRename = async (
    event: FormEvent<HTMLFormElement>,
    categoryId: string
  ) => {
    event.preventDefault()
    const nome = draft.trim()
    if (!nome) {
      setError('Informe o nome da categoria')
      return
    }
    if (!beginMutation('rename')) return

    setError('')
    try {
      await editarCategoria(categoryId, nome)
      props.onRefresh()
      toast.success('Categoria atualizada')
      closeEditor(categoryId)
    } catch (caught) {
      setError(messageFrom(caught))
      toast.error('Não foi possível renomear a categoria')
    } finally {
      finishMutation()
    }
  }
```

Render one `AdminPanel` titled `Categorias`. Its `action` is a 44px positive ghost detail, not another card:

```tsx
<Button
  ref={addButtonRef}
  type="button"
  intent="positive"
  appearance="ghost"
  size="sm"
  className="min-h-11"
  aria-label="Adicionar categoria"
  disabled={pending !== null}
  onClick={() => {
    setEditor({ mode: 'create' })
    setDraft('')
    setError('')
  }}
>
  <Plus aria-hidden="true" />
  Adicionar
</Button>
```

The create row is a real form with `className="mb-3 flex flex-wrap items-end gap-2 border-b pb-3"`, `aria-busy={pending === 'create'}`, `Input` label `Nome da nova categoria`, `disabled={pending !== null}`, neutral ghost cancel, positive solid submit, and an inline `<p className="basis-full" role="alert">{error}</p>` when needed. Because it is a form, `Enter` saves without a custom key handler; `onKeyDown={(event) => onEscape(event, 'add')}` handles only Escape.

For every ordered category row:

1. Render its name as a neutral ghost selection button with `className="min-h-11 min-w-0 flex-1 justify-start whitespace-normal break-words text-left"`, `aria-pressed={selectedId === categoria.id}`, and `onClick={() => props.onSelect(categoria.id)}`. Keep the pencil in a shrink-free sibling so a long name wraps rather than causing horizontal overflow.
2. When that row is not being edited, render only a 44px pencil action, not a large Rename control:

```tsx
<Tooltip>
  <TooltipTrigger
    render={
      <Button
        ref={(node) => {
          if (node) editButtonRefs.current.set(categoria.id, node)
          else editButtonRefs.current.delete(categoria.id)
        }}
        type="button"
        intent="informational"
        appearance="ghost"
        size="icon"
        className="size-11"
        aria-label={`Editar categoria ${categoria.nome}`}
        disabled={pending !== null}
        onClick={() => {
          setEditor({ mode: 'edit', categoryId: categoria.id })
          setDraft(categoria.nome)
          setError('')
        }}
      >
        <Pencil aria-hidden="true" />
      </Button>
    }
  />
  <TooltipContent>Editar categoria</TooltipContent>
</Tooltip>
```

3. When `editor` targets that row, replace its static controls with one real form using `className="flex min-w-0 flex-wrap items-end gap-2 border-t pt-3"`. The input label is `Nome da categoria ${categoria.nome}`; neutral ghost cancel uses `X`; positive solid save uses `Check`; the input and related controls are disabled while pending; the form receives `aria-busy={pending === 'rename'}`; error text remains directly below the same input with `className="basis-full" role="alert"`.
4. Sorting is `const ordered = [...props.categorias].sort((a, b) => a.ordem - b.ordem)`. Never open create and edit simultaneously because `editor` is one discriminated union.
5. When `ordered.length === 0`, keep the panel and Add action visible and render `Nenhuma categoria criada. Use Adicionar para começar.` as muted inline text. Do not wrap either inline form in another card.

- [ ] **Step 5: Verify GREEN and the minimum interaction contract**

```powershell
npm test -- tests/unit/business/category-manager.test.ts tests/unit/ui/tooltip.test.ts
```

Expected: PASS for focus on open, native Enter submit, Escape cancellation, single-editor exclusivity, client blank validation, retained server error/draft, returned identity callback, pending double-submit protection, tooltip portal, and focus restoration.

- [ ] **Step 6: Commit inline create/edit**

```powershell
git add -- components/admin/admin-page.tsx components/admin/category-manager.tsx tests/unit/business/category-manager.test.ts
git commit -m "feat(admin): add inline category creation and editing"
```

---

### Task 7: Add guarded inline category deletion

**Files:**
- Modify: `components/admin/category-manager.tsx`
- Modify: `tests/unit/business/category-manager.test.ts`

**Interfaces:**
- Reuses the `onDeleted(id)` callback already present in `CategoryManagerProps`.
- A delete attempt is possible only from the active pencil editor. Success closes the editor and restores focus to the next row, previous row, or Add button. Failure keeps the same editor and draft open.

- [ ] **Step 1: Add failing deletion visibility, confirmation, focus, error, and pending tests**

Append to `tests/unit/business/category-manager.test.ts`:

```ts
it('reveals delete only inside the pencil editor and respects confirmation', async () => {
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

it('deletes once and restores focus to the next category pencil', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  actions.removerCategoria.mockResolvedValueOnce(undefined)
  const props = renderManager()

  fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
  fireEvent.click(
    await screen.findByRole('button', { name: 'Excluir categoria Pizzas' })
  )

  await waitFor(() => {
    expect(actions.removerCategoria).toHaveBeenCalledWith('cat-1')
    expect(props.onDeleted).toHaveBeenCalledWith('cat-1')
  })
  expect(props.onRefresh).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Editar categoria Bebidas' })).toHaveFocus()
})

it('keeps the editor and exact server error when products block deletion', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  actions.removerCategoria.mockRejectedValueOnce(
    new Error('Remova os produtos antes de excluir a categoria')
  )
  renderManager()

  fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
  fireEvent.click(
    await screen.findByRole('button', { name: 'Excluir categoria Pizzas' })
  )

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Remova os produtos antes de excluir a categoria'
  )
  expect(screen.getByRole('textbox', { name: 'Nome da categoria Pizzas' })).toHaveValue('Pizzas')
})

it('disables editor actions while deletion is pending', async () => {
  let resolveDelete!: () => void
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  actions.removerCategoria.mockImplementationOnce(
    () => new Promise<void>((resolve) => { resolveDelete = resolve })
  )
  renderManager()

  fireEvent.click(screen.getByRole('button', { name: 'Editar categoria Pizzas' }))
  const remove = await screen.findByRole('button', { name: 'Excluir categoria Pizzas' })
  fireEvent.click(remove)
  fireEvent.click(remove)

  expect(actions.removerCategoria).toHaveBeenCalledTimes(1)
  expect(remove.closest('form')).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByRole('button', { name: 'Salvar categoria Pizzas' })).toBeDisabled()

  await act(async () => resolveDelete())
})
```

Restore each `confirm` spy through the existing `vi.restoreAllMocks()` in `afterEach`; change `afterEach(cleanup)` to:

```ts
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
```

- [ ] **Step 2: Run the component tests to verify RED**

```powershell
npm test -- tests/unit/business/category-manager.test.ts
```

Expected: FAIL because no delete control is rendered and `removerCategoria` is not called.

- [ ] **Step 3: Implement the guarded deletion transition**

Import `Trash2` and `removerCategoria`, then add this handler inside `CategoryManager`:

```tsx
  const deleteCategory = async (category: CategoryListItem) => {
    if (pendingRef.current) return
    if (!window.confirm(`Excluir a categoria "${category.nome}"?`)) return

    const index = ordered.findIndex((item) => item.id === category.id)
    const nextFocus = ordered[index + 1] ?? ordered[index - 1]

    if (!beginMutation('delete')) return
    setError('')
    try {
      await removerCategoria(category.id)
      props.onDeleted(category.id)
      props.onRefresh()
      toast.success('Categoria excluída')
      closeEditor(nextFocus?.id ?? 'add')
    } catch (caught) {
      setError(messageFrom(caught))
      toast.error('Não foi possível excluir a categoria')
    } finally {
      finishMutation()
    }
  }
```

Define `ordered` before the handler so it is shared by the render and focus fallback. Inside the active edit form, add this control after the neutral Cancel button and before Save:

```tsx
<Button
  type="button"
  intent="destructive"
  appearance="ghost"
  size="icon"
  className="size-11"
  aria-label={`Excluir categoria ${categoria.nome}`}
  disabled={pending !== null}
  onClick={() => void deleteCategory(categoria)}
>
  <Trash2 aria-hidden="true" />
</Button>
```

Set the active edit form to `aria-busy={pending !== null}` and give its Save button `aria-label={`Salvar categoria ${categoria.nome}`}`. Do not expose deletion in the static list, page header, or a second management card. Do not navigate away on a failed delete.

- [ ] **Step 4: Verify GREEN**

```powershell
npm test -- tests/unit/business/category-manager.test.ts
```

Expected: PASS for hidden-by-default deletion, confirmation cancellation, exactly-once mutation, next/previous/Add focus fallback, retained editor on failure, exact inline business error, and pending protection.

- [ ] **Step 5: Commit guarded deletion**

```powershell
git add -- components/admin/category-manager.tsx tests/unit/business/category-manager.test.ts
git commit -m "feat(admin): add guarded inline category deletion"
```

---

### Task 8: Integrate progressive categories and semantic product actions

**Files:**
- Modify: `app/admin/menu/client.tsx`
- Create: `tests/unit/business/admin-menu-client.test.ts`
- Modify: `tests/unit/business/admin-management.test.ts`

**Interfaces:**
- `MenuAdminClient` remains the owner of selected category and product-form visibility.
- `CategoryManager` owns only category editing. The parent receives the exact created `{ id, nome }`, keeps that temporary identity valid until refreshed props contain it, and computes deletion selection fallback.
- Existing product action handlers and confirmation behavior remain unchanged; only hierarchy, labels, semantic button props, and empty-state treatment change.

- [ ] **Step 1: Write failing rendered integration tests**

Create `tests/unit/business/admin-menu-client.test.ts`. Mock the child manager at its contract boundary so these tests exercise parent state rather than repeating Task 6–7 interactions:

```ts
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategoryManagerProps } from '@/components/admin/category-manager'

const state = vi.hoisted(() => ({
  categoryProps: undefined as CategoryManagerProps | undefined,
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: state.refresh }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/components/admin/category-manager', () => ({
  CategoryManager: (props: CategoryManagerProps) => {
    state.categoryProps = props
    return createElement('div', { 'data-testid': 'category-manager' })
  },
}))
vi.mock('@/components/admin/produto-form', () => ({
  ProdutoForm: ({ categoriaId }: { categoriaId: string }) =>
    createElement('div', {
      'data-testid': 'product-form',
      'data-category-id': categoriaId,
    }),
}))

import { MenuAdminClient } from '@/app/admin/menu/client'

const lanches = { id: 'cat-1', nome: 'Lanches', ordem: 0, produtos: [] }
const bebidas = { id: 'cat-2', nome: 'Bebidas', ordem: 1, produtos: [] }

beforeEach(() => {
  state.categoryProps = undefined
  vi.clearAllMocks()
})
afterEach(cleanup)
```

Add the parent-state cases:

```ts
it('starts empty with Novo produto disabled and an explicit reason', () => {
  render(createElement(MenuAdminClient, { categorias: [] }))

  expect(screen.getByRole('button', { name: 'Novo produto' })).toBeDisabled()
  expect(screen.getByText('Crie uma categoria antes de adicionar produtos.')).toBeInTheDocument()
})

it('selects the first category from the create response before refreshed props arrive', () => {
  render(createElement(MenuAdminClient, { categorias: [] }))

  act(() => state.categoryProps!.onCreated({ id: 'cat-3', nome: 'Doces' }))
  const createProduct = screen.getByRole('button', { name: 'Novo produto' })
  expect(createProduct).toBeEnabled()
  fireEvent.click(createProduct)
  expect(screen.getByTestId('product-form')).toHaveAttribute('data-category-id', 'cat-3')
})

it('keeps the selected identity when refreshed props contain the created category', () => {
  const view = render(createElement(MenuAdminClient, { categorias: [] }))
  act(() => state.categoryProps!.onCreated({ id: 'cat-3', nome: 'Doces' }))

  view.rerender(
    createElement(MenuAdminClient, {
      categorias: [{ id: 'cat-3', nome: 'Doces', ordem: 0, produtos: [] }],
    })
  )

  expect(state.categoryProps!.selectedId).toBe('cat-3')
})

it('falls forward, then backward, then empty when the selected category is deleted', () => {
  const view = render(createElement(MenuAdminClient, { categorias: [lanches, bebidas] }))
  expect(state.categoryProps!.selectedId).toBe('cat-1')

  act(() => state.categoryProps!.onDeleted('cat-1'))
  expect(state.categoryProps!.selectedId).toBe('cat-2')

  view.rerender(createElement(MenuAdminClient, { categorias: [bebidas] }))
  act(() => state.categoryProps!.onDeleted('cat-2'))
  expect(state.categoryProps!.selectedId).toBe('')
  expect(screen.getByRole('button', { name: 'Novo produto' })).toBeDisabled()
})

it('shows a selected-category product empty state instead of a blank panel', () => {
  render(createElement(MenuAdminClient, { categorias: [lanches] }))
  expect(screen.getByText('Nenhum produto nesta categoria')).toBeInTheDocument()
})
```

Add a product fixture to the same file and assert semantic labels rather than colors alone:

```ts
it('names product edit, delete, and reversible availability actions', () => {
  render(
    createElement(MenuAdminClient, {
      categorias: [{
        ...lanches,
        produtos: [{
          id: 'prod-1',
          nome: 'X-Salada',
          descricao: null,
          preco: '25.00',
          imagemUrl: null,
          disponivel: true,
        }],
      }],
    })
  )

  expect(screen.getByRole('button', { name: 'Editar produto X-Salada' })).toHaveClass(
    '[--button-outline:var(--action-informational)]'
  )
  expect(screen.getByRole('button', { name: 'Excluir produto X-Salada' })).toHaveClass(
    '[--button-outline:var(--action-destructive)]'
  )
  expect(screen.getByRole('button', { name: 'Tornar X-Salada indisponível' })).toHaveTextContent(
    'Tornar indisponível'
  )
})
```

If the product fixture has a schema-required field already used by `MenuAdminClient`, add that concrete field to this fixture with its neutral default; do not weaken the production prop type or cast the whole fixture to `any`.

- [ ] **Step 2: Tighten the source-structure regression before implementation**

Update the menu assertions in `tests/unit/business/admin-management.test.ts`:

```ts
expect(menu).toContain('<CategoryManager')
expect(menu).toContain('intent="positive"')
expect(menu).toContain('aria-describedby=')
expect(menu).not.toContain('title="Adicionar categoria"')
expect(menu).not.toContain('title="Gerenciar categoria"')
expect(menu).not.toContain('Renomear categoria</Button>')
expect(menu).toContain('Tornar indisponível')
expect(menu).toContain('Disponibilizar')
```

- [ ] **Step 3: Run the integration tests to verify RED**

```powershell
npm test -- tests/unit/business/admin-menu-client.test.ts tests/unit/business/admin-management.test.ts
```

Expected: FAIL because the page still owns separate add/manage panels, ignores the create response, lacks the new empty-state reason, and uses legacy product variants.

- [ ] **Step 4: Replace scattered category state with selection continuity**

In `app/admin/menu/client.tsx`, import `useEffect`, `CategoryManager`, and `type CreatedCategory`; remove the old new-category, rename-category, and category-delete form state. Add:

```tsx
const [selectedCategoryId, setSelectedCategoryId] = useState(
  categorias[0]?.id ?? ''
)
const [pendingCategory, setPendingCategory] = useState<CreatedCategory | null>(null)

const displayedCategories = pendingCategory &&
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

useEffect(() => {
  if (
    pendingCategory &&
    categorias.some((category) => category.id === pendingCategory.id)
  ) {
    setPendingCategory(null)
  }

  setSelectedCategoryId((current) => {
    const stillExists = categorias.some((category) => category.id === current)
    const isPending = pendingCategory?.id === current
    return stillExists || isPending ? current : (categorias[0]?.id ?? '')
  })
}, [categorias, pendingCategory])

const handleCreated = (created: CreatedCategory) => {
  setPendingCategory(created)
  setSelectedCategoryId(created.id)
}

const handleDeleted = (deletedId: string) => {
  setPendingCategory((current) =>
    current?.id === deletedId ? null : current
  )
  setSelectedCategoryId((current) => {
    if (current !== deletedId) return current
    const index = displayedCategories.findIndex(
      (category) => category.id === deletedId
    )
    return (
      displayedCategories[index + 1]?.id ??
      displayedCategories[index - 1]?.id ??
      ''
    )
  })
}
```

Pass only ordered category fields to the manager and use the existing `router.refresh`:

```tsx
<CategoryManager
  categorias={displayedCategories.map(({ id, nome, ordem }) => ({ id, nome, ordem }))}
  selectedId={selectedCategoryId}
  onSelect={setSelectedCategoryId}
  onCreated={handleCreated}
  onDeleted={handleDeleted}
  onRefresh={router.refresh}
/>
```

Remove the old standalone `Adicionar categoria` and `Gerenciar categoria` `AdminPanel`s completely. Do not retain hidden duplicate inputs or mutation handlers.

- [ ] **Step 5: Keep Novo produto prominent but valid**

Keep the action in `AdminPageHeader`, not inside `Categorias`:

```tsx
<Button
  type="button"
  intent="positive"
  appearance="solid"
  className="min-h-11"
  aria-describedby={selectedCategory ? undefined : 'novo-produto-sem-categoria'}
  disabled={!selectedCategory}
  onClick={() => setFormOpen(true)}
>
  <Plus aria-hidden="true" />
  Novo produto
</Button>
<span id="novo-produto-sem-categoria" className="sr-only">
  Crie uma categoria antes de adicionar produtos.
</span>
```

Render `ProdutoForm` only with `categoriaId={selectedCategory.id}`. The pending created object counts as a selected category immediately, so the first category unlocks this action before router refresh completes.

When there is no selected category, show `AdminEmptyState` with heading `Crie sua primeira categoria` and body `Crie uma categoria antes de adicionar produtos.` When a selected category has no products, show heading `Nenhum produto nesta categoria` and an action that opens the same new-product form.

- [ ] **Step 6: Apply semantic product actions without changing business handlers**

Use these exact controls in each product row/card:

| Action | Accessible label / visible text | Intent / appearance / target |
| --- | --- | --- |
| Edit | `Editar produto ${produto.nome}` | `informational + ghost`, `size-11` pencil |
| Delete | `Excluir produto ${produto.nome}` | `destructive + soft`, keep confirmation |
| Available → unavailable | aria-label `Tornar ${produto.nome} indisponível`; text `Tornar indisponível` | `warning + soft` |
| Unavailable → available | aria-label `Disponibilizar ${produto.nome}`; text `Disponibilizar` | `positive + soft` |

Do not use generic text such as `Alterar status`; wording and icon/state must make the meaning available without color. Preserve the current `editarProduto`, `removerProduto`, and `alternarDisponibilidade` calls and their current pending/error behavior.

- [ ] **Step 7: Verify GREEN and focused regressions**

```powershell
npm test -- tests/unit/business/admin-menu-client.test.ts tests/unit/business/category-manager.test.ts tests/unit/business/admin-management.test.ts tests/unit/actions/produtos.test.ts
```

Expected: PASS for zero-category state, immediate server-ID selection, refresh continuity, forward/back/empty deletion fallback, product empty state, semantic labels, progressive editor behavior, and action boundary validation.

- [ ] **Step 8: Commit the page integration**

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
npm test -- tests/unit/ui/button.test.ts tests/unit/ui/tooltip.test.ts tests/unit/actions/produtos.test.ts tests/unit/design/design-system.test.ts tests/unit/design/button-semantics.test.ts tests/unit/business/admin-management.test.ts tests/unit/business/admin-menu-client.test.ts tests/unit/business/category-manager.test.ts tests/unit/business/table-orders-panel.test.ts tests/unit/business/cashier-orders.test.ts tests/unit/auth/logout-button.test.ts tests/unit/routing/access-navigation.test.ts
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

- [ ] **Step 8: Verify the real UI at desktop and mobile widths**

Seed and start the existing local app in separate PowerShell terminals:

```powershell
$env:DATABASE_URL='file:./dev.db'; npm run db:seed
$env:DATABASE_URL='file:./dev.db'; npm run dev
```

Use Playwright or the in-app browser against the printed localhost URL and sign in with the existing local admin fixture `admin@local.com` / `dev123456`. Do not modify authentication or make admin pages public for verification.

At `/admin/menu`, verify at `1440 × 900` and `390 × 844`:

1. `Novo produto` stays in the page header; with zero categories it is disabled and the screen-reader reason exists.
2. `Adicionar` is a compact detail inside `Categorias`, opens one focused inline input, Enter saves, Escape cancels, and focus returns to Add.
3. Each static category shows only its name and discreet pencil; tooltip escapes the clipped panel; keyboard focus remains visible.
4. Rename keeps a failed draft and inline `role="alert"`; Save/Delete controls expose busy and disabled states.
5. Deleting a category with products leaves the editor open with `Remova os produtos antes de excluir a categoria`.
6. Creating the first category selects the returned identity immediately and enables `Novo produto` for it.
7. Long category/product names wrap without horizontal overflow; zero-category and zero-product states remain explicit.
8. Semantic actions remain understandable with color ignored: wording, icon, label, confirmation, and disabled/busy state carry the meaning.
9. Inspect computed colors/contrast for representative positive, informational, warning, destructive, and focus-ring states against their actual surfaces.

In Chromium DevTools Rendering, repeat the representative action check with `Emulate vision deficiencies` set to protanopia and then deuteranopia; labels, icons, confirmations, and selected/busy states must still distinguish every action without relying on hue.

Then spot-check one representative screen in admin tables/users, waiter cart/order, cashier payments, sign-in/profile/logout, and no-access/company selection. The kitchen screen has no shared action-button surface in the recorded base, so there is no fabricated kitchen migration. Preserve its existing order-state behavior.

Do not use the full Chromium E2E suite as the acceptance gate for this feature: the recorded base already has five stale kitchen tests that assume unauthenticated public access and three passing waiter tests. If the suite is run for extra evidence, report that baseline split honestly and do not alter auth to satisfy stale fixtures.

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
