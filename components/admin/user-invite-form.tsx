'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { cadastrarUsuarioAdmin } from '@/lib/actions/usuarios'
import { ActionSubmit } from '@/components/ui/action-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const ACCESS_OPTIONS = [
  { value: 'admin', label: 'Administração' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'cozinha', label: 'Cozinha' },
  { value: 'garcom', label: 'Garçom' },
] as const

export function UserInviteForm() {
  const [isPending, startTransition] = useTransition()
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await cadastrarUsuarioAdmin(formData)
        setInviteUrl(result.inviteUrl)
        toast.success('Convite criado. Copie o link e envie ao usuário.')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível criar o convite.')
      }
    })
  }

  async function copyInvite() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    toast.success('Convite copiado. Este link é válido por 24 horas.')
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form action={submit} className="contents">
        <div className="grid gap-2">
          <Label htmlFor="novo-usuario-nome">Nome</Label>
          <Input id="novo-usuario-nome" name="nome" required maxLength={120} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="novo-usuario-email">E-mail</Label>
          <Input id="novo-usuario-email" name="email" type="email" required />
        </div>
        <fieldset className="grid gap-2 lg:col-span-2">
          <legend className="text-sm font-medium">Permissões</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ACCESS_OPTIONS.map((access) => (
              <label key={access.value} className="flex min-h-11 items-center gap-3 rounded-[var(--radius)] border bg-card px-3 text-sm">
                <input type="checkbox" name="acessos" value={access.value} className="size-4 rounded border-input" />
                <span>{access.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="lg:col-span-2">
          <ActionSubmit pendingLabel="Criando convite…" intent="positive" appearance="solid" className="min-h-11" disabled={isPending}>
            Criar convite
          </ActionSubmit>
        </div>
      </form>
      {inviteUrl ? (
        <div className="rounded-[var(--radius)] border border-[var(--primary)]/30 bg-[var(--primary-soft)] p-4 lg:col-span-2">
          <p className="font-semibold">Convite pronto para enviar</p>
          <p className="mt-1 text-sm text-muted-foreground">Este link expira em 24 horas.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input aria-label="Link do convite" readOnly value={inviteUrl} />
            <Button type="button" intent="positive" appearance="solid" onClick={copyInvite}>Copiar convite</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
