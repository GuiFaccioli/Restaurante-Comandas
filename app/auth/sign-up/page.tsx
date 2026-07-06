import { signUpOwner } from '@/lib/actions/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm border rounded-[12px] p-6 space-y-4">
        <h1 className="text-xl font-semibold">Criar Conta</h1>
        <form action={signUpOwner} className="space-y-3">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required />
          </div>
          <div>
            <Label htmlFor="tenantNome">Restaurante</Label>
            <Input id="tenantNome" name="tenantNome" required />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          <Button type="submit" className="w-full h-12">
            Criar Conta
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          Já tem conta?{' '}
          <a href="/auth/sign-in" className="underline">
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}
