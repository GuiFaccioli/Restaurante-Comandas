import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
          createElement(TooltipTrigger, {
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
          }),
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

  it('opens the portaled popup when its trigger receives keyboard focus', async () => {
    const { container } = render(
      createElement(
        TooltipProvider,
        { delay: 0 },
        createElement(
          'div',
          { 'data-testid': 'clipped-panel', style: { overflow: 'hidden' } },
          createElement(
            Tooltip,
            null,
            createElement(TooltipTrigger, {
              render: createElement(
                Button,
                {
                  type: 'button',
                  intent: 'informational',
                  appearance: 'ghost',
                  size: 'icon',
                  'aria-label': 'Editar categoria Sobremesas',
                },
                '\u270e'
              ),
            }),
            createElement(TooltipContent, null, 'Editar categoria')
          )
        )
      )
    )

    const trigger = screen.getByRole('button', {
      name: 'Editar categoria Sobremesas',
    })
    expect(screen.queryByRole('tooltip')).toBeNull()

    act(() => trigger.focus())

    expect(trigger).toHaveFocus()
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent('Editar categoria')
    })

    expect(container.querySelector('[role="tooltip"]')).toBeNull()
    expect(document.body.querySelector('[role="tooltip"]')).not.toBeNull()
  })
})
