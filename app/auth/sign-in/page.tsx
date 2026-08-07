import { signIn } from '@/lib/actions/auth'
import { AgilizaFluxoBrand } from '@/components/brand/agiliza-fluxo-brand'
import { SignInClientForm } from './client'

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--canvas)] p-4 sm:p-6">
      <section className="af-surface w-full max-w-sm p-6 sm:p-8">
        <AgilizaFluxoBrand tagline="Do pedido ao estoque, tudo conectado." />
        <div className="mt-8">
          <h1 className="text-3xl font-black tracking-[-0.04em] text-[var(--ink)]">Entrar</h1>
          <p className="mt-1 text-pretty text-sm leading-6 text-[var(--muted)]">
            Acesse sua operação e veja o que precisa da sua atenção agora.
          </p>
        </div>
        <SignInClientForm action={signIn} />
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Não tem conta?{' '}
          <a href="/auth/sign-up" className="font-semibold text-[var(--primary)] underline underline-offset-2">
            Criar conta
          </a>
        </p>
      </section>
    </main>
  )
}
