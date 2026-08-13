'use client'

import {
  type ComponentProps,
  type ReactNode,
  useActionState,
  useEffect,
} from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'

import { Button, type ButtonProps } from '@/components/ui/button'
import { userFacingErrorMessage } from '@/lib/ui/error-messages'

type Action = (formData: FormData) => void | Promise<void>
type ActionState = { status: 'idle' | 'success' | 'error'; message?: string }

function isRedirectError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_REDIRECT')
  )
}

function errorMessage(error: unknown) {
  return userFacingErrorMessage(error, 'Não foi possível concluir a ação por um erro inesperado.')
}

export function ActionForm({
  action,
  successMessage,
  children,
  ...props
}: Omit<ComponentProps<'form'>, 'action'> & {
  action: Action
  successMessage: string
  children: ReactNode
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      try {
        await action(formData)
        return { status: 'success', message: successMessage }
      } catch (error) {
        if (isRedirectError(error)) throw error
        return { status: 'error', message: errorMessage(error) }
      }
    },
    { status: 'idle' }
  )

  useEffect(() => {
    if (state.status === 'success' && state.message) toast.success(state.message)
    if (state.status === 'error' && state.message) toast.error(state.message)
  }, [state])

  return (
    <form {...props} action={formAction}>
      {children}
    </form>
  )
}

export function ActionSubmit({
  pendingLabel = 'Processando…',
  children,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus()

  return (
    <Button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </Button>
  )
}
