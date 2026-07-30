import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('sonner', () => ({ toast }))

import { ActionForm, ActionSubmit } from '@/components/ui/action-form'

describe('ActionForm', () => {
  beforeEach(() => {
    toast.success.mockReset()
    toast.error.mockReset()
  })

  it('shows success feedback and disables the submit while pending', async () => {
    let resolveAction: (() => void) | undefined
    const action = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveAction = resolve
      })
    )
    const view = render(
      React.createElement(
        ActionForm,
        {
          action,
          successMessage: 'Salvo com sucesso.',
          children: React.createElement(ActionSubmit, { pendingLabel: 'Salvando…' }, 'Salvar'),
        }
      )
    )

    const button = view.getByRole('button', { name: 'Salvar' })
    fireEvent.click(button)

    await waitFor(() => expect(view.getByRole('button', { name: 'Salvando…' })).toBeDisabled())
    expect(action).toHaveBeenCalledTimes(1)

    resolveAction?.()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Salvo com sucesso.'))
  })

  it('shows the action error message in red feedback', async () => {
    const action = vi.fn(async () => {
      throw new Error('Permissão inválida')
    })
    const view = render(
      React.createElement(
        ActionForm,
        {
          action,
          successMessage: 'Não deveria aparecer.',
          children: React.createElement(ActionSubmit, null, 'Salvar'),
        }
      )
    )

    fireEvent.click(view.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Permissão inválida'))
    expect(toast.success).not.toHaveBeenCalled()
  })
})
