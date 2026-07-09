import { signIn } from '@/lib/actions/auth'
import { SignInClientForm } from './client'

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-[var(--radius)] border bg-card p-6">
        <div>
          <h1 className="text-2xl font-bold">Entrar</h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Acesse sua área de trabalho no restaurante.
          </p>
        </div>
        <SignInClientForm action={signIn} />
        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <a href="/auth/sign-up" className="underline underline-offset-2">
            Criar conta
          </a>
        </p>
      </div>
    </div>
  )
}
