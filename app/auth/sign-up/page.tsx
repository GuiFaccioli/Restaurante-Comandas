'use client'
import { useState } from 'react'
import { authClient } from '@/lib/auth/client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SignUpPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error: authError } = await authClient.signUp.email({ name: nome, email, password })
      if (authError) {
        setError('Erro ao criar conta. Tente novamente.')
        return
      }
      router.push('/')
    } catch {
      setError('Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm border rounded-[12px] p-6 space-y-4">
        <h1 className="text-xl font-semibold">Criar Conta</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? 'Criando…' : 'Criar Conta'}
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
