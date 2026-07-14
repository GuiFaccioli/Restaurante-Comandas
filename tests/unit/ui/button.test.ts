import { createElement, createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { actionSemantics, Button, buttonVariants } from '@/components/ui/button'

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
      '[--button-outline:var(--action-informational-outline)]'
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

  it('keeps the shared semantic layer free of button geometry', () => {
    const classes = actionSemantics({ intent: 'neutral', appearance: 'ghost' })

    expect(classes).toContain('focus-visible:ring-2')
    for (const geometry of ['inline-flex', 'flex-row', 'gap-', 'h-10', 'rounded-full']) {
      expect(classes).not.toContain(geometry)
    }
  })

  it('composes state classes while preserving render and ref', () => {
    const ref = createRef<HTMLElement>()
    render(
      createElement(
        Button,
        {
          ref,
          nativeButton: false,
          render: createElement('a', { href: '/pedidos' }),
          className: ({ disabled }) => (disabled ? 'state-disabled' : 'state-enabled'),
        },
        'Pedidos'
      )
    )

    const button = screen.getByRole('button', { name: 'Pedidos' })
    expect(button).toHaveClass('state-enabled', '[--button-solid:var(--action-neutral)]')
    expect(button).toHaveAttribute('href', '/pedidos')
    expect(ref.current).toBe(button)
  })

  it('styles native and Base UI disabled states without opacity as the only cue', () => {
    render(
      createElement(
        'div',
        null,
        createElement(Button, { disabled: true }, 'Nativo'),
        createElement(Button, { disabled: true, focusableWhenDisabled: true }, 'Focável')
      )
    )

    const native = screen.getByRole('button', { name: 'Nativo' })
    const focusable = screen.getByRole('button', { name: 'Focável' })
    expect(native).toBeDisabled()
    expect(focusable).toHaveAttribute('aria-disabled', 'true')
    expect(focusable).toHaveClass('disabled:opacity-100')
    expect(focusable).toHaveClass('data-disabled:bg-[var(--action-disabled)]')
    expect(focusable).toHaveClass('aria-disabled:bg-[var(--action-disabled)]')
  })

  it.each([true, 'true'] as const)('announces and disables busy=%s', (busy) => {
    const onClick = vi.fn()
    render(
      createElement(
        Button,
        { 'aria-busy': busy, focusableWhenDisabled: true, onClick },
        'Salvando'
      )
    )

    const button = screen.getByRole('button', { name: 'Salvando' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    expect(button).toHaveClass('aria-busy:pointer-events-none')
  })

  it.each([
    ['icon', 'size-4'],
    ['icon-xs', 'size-3'],
    ['icon-sm', 'size-3.5'],
    ['icon-lg', 'size-5'],
  ] as const)('keeps %s targets at least 44px with %s glyphs', (size, glyphSize) => {
    const classes = buttonVariants({ size })

    expect(classes).toContain('size-11')
    expect(classes).toContain(glyphSize)
  })
})
