export default function SemAcessoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md border rounded-[12px] p-6 space-y-2">
        <h1 className="text-xl font-semibold">Sem acesso</h1>
        <p className="text-sm text-muted-foreground">
          Seu usuário não tem permissão para acessar esta área.
        </p>
      </div>
    </main>
  )
}
