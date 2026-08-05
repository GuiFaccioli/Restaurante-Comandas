import { signUpOwner } from '@/lib/actions/auth'
import { AgilizaFluxoBrand } from '@/components/brand/agiliza-fluxo-brand'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActionForm, ActionSubmit } from '@/components/ui/action-form'

export default function SignUpPage() {
  return <main className="flex min-h-dvh items-center justify-center bg-[var(--canvas)] p-4 sm:p-6">
    <section className="af-surface w-full max-w-md p-6 sm:p-8">
      <AgilizaFluxoBrand tagline="A transparência que sua cozinha precisa." />
      <h1 className="mt-8 text-3xl font-black tracking-[-0.04em] text-[var(--ink)]">Comece pelo fluxo certo</h1>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Mais produtividade, menos papel. Cadastre seu restaurante e crie o primeiro acesso.</p>
      <ActionForm action={signUpOwner} successMessage="Conta criada com sucesso." className="mt-6 space-y-4">
        <div className="space-y-1.5"><Label htmlFor="nome">Seu nome</Label><Input id="nome" name="nome" placeholder="Como podemos chamar você?" required /></div>
        <div className="space-y-1.5"><Label htmlFor="tenantNome">Nome do restaurante</Label><Input id="tenantNome" name="tenantNome" placeholder="Ex.: Pizzaria do Bairro" required /></div>
        <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
        <div className="space-y-1.5"><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /><p className="text-xs text-[var(--muted)]">Use pelo menos 8 caracteres.</p></div>
        <ActionSubmit pendingLabel="Criando conta…" intent="positive" appearance="solid" className="min-h-11 w-full">Criar conta</ActionSubmit>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">Já tem conta? <a href="/auth/sign-in" className="font-semibold text-[var(--primary)] underline underline-offset-2">Entrar</a></p>
    </section>
  </main>
}
