'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const LAST_LOGIN_EMAIL_KEY = 'restaurante:last-login-email'

type SignInClientFormProps = {
  action: (formData: FormData) => void | Promise<void>
}

export function SignInClientForm({ action }: SignInClientFormProps) {
  const [email, setEmail] = useState('')
  const [rememberEmail, setRememberEmail] = useState(false)

  useEffect(() => {
    const savedEmail = localStorage.getItem(LAST_LOGIN_EMAIL_KEY)

    if (savedEmail) {
      setEmail(savedEmail)
      setRememberEmail(true)
    }
  }, [])

  function handleSubmit() {
    const normalizedEmail = email.trim()

    if (rememberEmail && normalizedEmail) {
      localStorage.setItem(LAST_LOGIN_EMAIL_KEY, normalizedEmail)
      return
    }

    localStorage.removeItem(LAST_LOGIN_EMAIL_KEY)
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          name="rememberEmail"
          type="checkbox"
          checked={rememberEmail}
          onChange={(event) => setRememberEmail(event.target.checked)}
          className="size-4 rounded border-input"
        />
        Lembrar e-mail neste aparelho
      </label>
      <Button type="submit" intent="neutral" appearance="solid" className="min-h-11 w-full">
        Entrar
      </Button>
    </form>
  )
}
