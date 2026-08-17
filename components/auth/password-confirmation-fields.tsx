'use client'

import { useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PasswordConfirmationFieldsProps = {
  passwordId: string
  confirmationId: string
}

export function PasswordConfirmationFields({ passwordId, confirmationId }: PasswordConfirmationFieldsProps) {
  const confirmationRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const mismatch = confirmation.length > 0 && password !== confirmation

  function updateConfirmationValidity(nextPassword: string, nextConfirmation: string) {
    confirmationRef.current?.setCustomValidity(
      nextConfirmation && nextPassword !== nextConfirmation ? 'As senhas precisam ser iguais.' : '',
    )
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={passwordId}>Senha</Label>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => {
            const nextPassword = event.target.value
            setPassword(nextPassword)
            updateConfirmationValidity(nextPassword, confirmation)
          }}
          aria-describedby={`${passwordId}-hint`}
        />
        <p id={`${passwordId}-hint`} className="text-xs text-[var(--muted)]">Use pelo menos 8 caracteres.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={confirmationId}>Confirme sua senha</Label>
        <Input
          ref={confirmationRef}
          id={confirmationId}
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmation}
          onChange={(event) => {
            const nextConfirmation = event.target.value
            setConfirmation(nextConfirmation)
            updateConfirmationValidity(password, nextConfirmation)
          }}
          aria-invalid={mismatch}
          aria-describedby={mismatch ? `${confirmationId}-error` : undefined}
        />
        {mismatch ? <p id={`${confirmationId}-error`} className="text-sm text-destructive">As senhas não coincidem.</p> : null}
      </div>
    </>
  )
}
