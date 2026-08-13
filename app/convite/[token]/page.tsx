import { aceitarConviteUsuario, getConviteUsuarioEmail } from '@/lib/actions/usuarios'
import { ActionForm, ActionSubmit } from '@/components/ui/action-form'
import { AgilizaFluxoBrand } from '@/components/brand/agiliza-fluxo-brand'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const dynamic = 'force-dynamic'

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const email = await getConviteUsuarioEmail(token)

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--canvas)] p-4 sm:p-6">
      <section className="af-surface w-full max-w-md p-6 sm:p-8">
        <AgilizaFluxoBrand tagline="Um acesso simples para cada pessoa da operação." />
        <h1 className="mt-8 text-3xl font-black tracking-[-0.04em] text-[var(--ink)]">Seu convite está esperando por você</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Crie sua senha para começar. Este convite é válido por 24 horas.</p>
        <ActionForm action={aceitarConviteUsuario} successMessage="Acesso ativado." className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-1.5">
            <Label htmlFor="convite-email">E-mail cadastrado pelo administrador</Label>
            <Input id="convite-email" type="email" value={email ?? 'Convite indisponível'} readOnly aria-readonly="true" />
            <p className="text-xs text-[var(--muted)]">Este e-mail está vinculado ao convite e não pode ser alterado.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="convite-password">Senha</Label>
            <Input id="convite-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            <p className="text-xs text-[var(--muted)]">Use pelo menos 8 caracteres.</p>
          </div>
          <ActionSubmit pendingLabel="Ativando acesso…" intent="positive" appearance="solid" className="min-h-11 w-full">Ativar acesso</ActionSubmit>
        </ActionForm>
      </section>
    </main>
  )
}
