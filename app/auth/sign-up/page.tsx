import { signUpOwner } from '@/lib/actions/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SignUpPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-[var(--radius)] border bg-card p-6">
        <div>
          <h1 className="text-2xl font-bold">Criar conta</h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Cadastre o restaurante e crie o primeiro acesso administrativo.
          </p>
        </div>
        <form action={signUpOwner} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tenantNome">Restaurante</Label>
            <Input id="tenantNome" name="tenantNome" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          <Button type="submit" className="min-h-11 w-full">
            Criar conta
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <a href="/auth/sign-in" className="underline underline-offset-2">
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}
