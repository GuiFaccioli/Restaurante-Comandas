import { signIn } from '@/lib/actions/auth'
import { SignInClientForm } from './client'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm border rounded-[12px] p-6 space-y-4">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <SignInClientForm action={signIn} />
        <p className="text-sm text-center text-muted-foreground">
          Não tem conta?{' '}
          <a href="/auth/sign-up" className="underline">
            Criar conta
          </a>
        </p>
      </div>
    </div>
  )
}
