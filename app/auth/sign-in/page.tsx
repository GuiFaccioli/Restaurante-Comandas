import { signIn } from '@/lib/actions/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm border rounded-[12px] p-6 space-y-4">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <form action={signIn} className="space-y-3">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button type="submit" className="w-full h-12">
            Entrar
          </Button>
        </form>
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
