import { asc, eq } from 'drizzle-orm'

import { atualizarUsuarioAdmin, removerUsuarioDoRestaurante } from '@/lib/actions/usuarios'
import { requireAccess } from '@/lib/auth/access'
import { db } from '@/lib/db/index'
import { tenantUser, usuario, usuarioAcesso } from '@/lib/db/schema'
import type { AcessoUsuario } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

const ACCESS_OPTIONS: Array<{ value: AcessoUsuario; label: string }> = [
  { value: 'admin', label: 'Administração' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'cozinha', label: 'Cozinha' },
  { value: 'garcom', label: 'Garçom' },
]

export default async function UsuariosAdminPage() {
  const { tenantId, usuarioId: currentUserId } = await requireAccess('admin')

  const usuarios = await db
    .select({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tenantUserId: tenantUser.id,
    })
    .from(tenantUser)
    .innerJoin(usuario, eq(tenantUser.usuarioId, usuario.id))
    .where(eq(tenantUser.tenantId, tenantId))
    .orderBy(asc(usuario.nome))

  const acessos = await db
    .select({
      usuarioId: usuarioAcesso.usuarioId,
      acesso: usuarioAcesso.acesso,
    })
    .from(usuarioAcesso)
    .innerJoin(tenantUser, eq(usuarioAcesso.tenantUserId, tenantUser.id))
    .where(eq(tenantUser.tenantId, tenantId))

  const accessesByUser = new Map<string, string[]>()
  for (const row of acessos) {
    accessesByUser.set(row.usuarioId, [...(accessesByUser.get(row.usuarioId) ?? []), row.acesso])
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuários cadastrados</h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Gerencie quais áreas cada usuário pode acessar neste restaurante.
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {usuarios.map((user) => {
          const userAccesses = accessesByUser.get(user.id) ?? []
          const isCurrentUser = user.id === currentUserId

          return (
            <article key={user.tenantUserId} className="rounded-[var(--radius)] border bg-card p-4">
              <form action={atualizarUsuarioAdmin} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                <input type="hidden" name="usuarioId" value={user.id} />

                <div className="min-w-0">
                  <p className="break-words font-medium">{user.nome}</p>
                  <p className="break-words text-sm text-muted-foreground">{user.email}</p>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Acessos</legend>
                  <div className="flex flex-wrap gap-3">
                    {ACCESS_OPTIONS.map((access) => (
                      <label key={access.value} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          name="acessos"
                          value={access.value}
                          defaultChecked={userAccesses.includes(access.value)}
                          className="size-4 rounded border-input"
                        />
                        {access.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <button className="min-h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Salvar usuário
                </button>
              </form>

              <form action={removerUsuarioDoRestaurante} className="mt-3">
                <input type="hidden" name="usuarioId" value={user.id} />
                <button
                  className="min-h-11 rounded-full bg-destructive/10 px-4 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:pointer-events-none disabled:opacity-50"
                  disabled={isCurrentUser}
                >
                  Remover usuário
                </button>
              </form>
            </article>
          )
        })}
      </div>
    </div>
  )
}
