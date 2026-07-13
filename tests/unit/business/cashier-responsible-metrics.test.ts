import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AdminStatCard } from '@/components/admin/admin-page'

afterEach(() => {
  cleanup()
})

describe('AdminStatCard', () => {
  it('keeps existing usages static when no activation callback is provided', () => {
    const { container } = render(
      createElement(AdminStatCard, {
        label: 'Pedidos registrados',
        value: 12,
        detail: 'Resumo estático',
      })
    )

    expect(container.querySelector('button')).toBeNull()
    expect(screen.getByText('Pedidos registrados').closest('div')).toBeInTheDocument()
  })

  it('renders an accessible real button with explicit expanded state', () => {
    const onClick = vi.fn()
    render(
      createElement(AdminStatCard, {
        label: 'Pagos',
        value: 3,
        detail: 'Pedidos baixados',
        onClick,
        expanded: true,
        controls: 'cashier-responsibility-panel',
      })
    )

    const button = screen.getByRole('button', { name: /Pagos/ })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('aria-controls', 'cashier-responsibility-panel')
    expect(screen.getByText('Ocultar responsáveis')).toBeInTheDocument()

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
