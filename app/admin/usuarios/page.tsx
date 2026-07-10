import { asc, eq } from 'drizzle-orm'

import { atualizarUsuarioAdmin, removerUsuarioDoRestaurante } from '@/lib/actions/usuarios'
import { AdminEmptyState, AdminPage, AdminPageHeader, AdminPanel, AdminStatsGrid, AdminStatCard } from '@/components/admin/admin-page'
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

  const usersWithAccesses = usuarios.map((user) => ({
    ...user,
    accesses: accessesByUser.get(user.id) ?? [],
    isCurrentUser: user.id === currentUserId,
  }))
  const adminCount = usersWithAccesses.filter((user) => user.accesses.includes('admin')).length
  const multiAccessCount = usersWithAccesses.filter((user) => user.accesses.length > 1).length

  return (
    <AdminPage>
      <AdminPageHeader
        title="Usuários e acessos"
        description="Controle exatamente quais áreas cada pessoa pode acessar. A fonte de verdade é a lista de acessos."
      />

      <AdminStatsGrid className="xl:grid-cols-3">
        <AdminStatCard label="Usuários no restaurante" value={usuarios.length} detail="Pessoas vinculadas a este tenant." />
        <AdminStatCard label="Com acesso admin" value={adminCount} detail="Podem alterar configurações críticas." />
        <AdminStatCard label="Com múltiplos acessos" value={multiAccessCount} detail="Alternam entre áreas operacionais." />
      </AdminStatsGrid>

      <AdminPanel
        title="Permissões por usuário"
        description="Salve os acessos de uma pessoa por vez. Remoção fica separada para evitar ação perigosa por engano."
      >
        {usersWithAccesses.length === 0 ? (
          <AdminEmptyState
            title="Nenhum usuário cadastrado"
            description="Quando usuários entrarem no restaurante, eles aparecerão aqui para revisão de acessos."
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius)] border">
            <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_220px] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground lg:grid">
              <span>Usuário</span>
              <span>Acessos</span>
              <span>Ações</span>
            </div>

            <div className="divide-y">
              {usersWithAccesses.map((user) => (
                <article
                  key={user.tenantUserId}
                  className="grid gap-4 bg-background p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_220px] lg:items-start"
                >
                  <form action={atualizarUsuarioAdmin} className="contents">
                    <input type="hidden" name="usuarioId" value={user.id} />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words font-medium">{user.nome}</p>
                        {user.isCurrentUser ? (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            Você
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 break-words text-sm text-muted-foreground">{user.email}</p>
                    </div>

                    <fieldset className="space-y-3">
                      <legend className="text-sm font-medium">Acessos</legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {ACCESS_OPTIONS.map((access) => (
                          <label
                            key={access.value}
                            className="flex min-h-11 items-center gap-3 rounded-[var(--radius)] border bg-card px-3 text-sm"
                          >
                            <input
                              type="checkbox"
                              name="acessos"
                              value={access.value}
                              defaultChecked={user.accesses.includes(access.value)}
                              className="size-4 rounded border-input"
                            />
                            <span>{access.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <div className="grid gap-2 lg:pt-7">
                      <button
                        type="submit"
                        className="min-h-11 w-full rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        Salvar acessos
                      </button>
                    </div>
                  </form>

                  <form action={removerUsuarioDoRestaurante} className="lg:col-start-3">
                    <input type="hidden" name="usuarioId" value={user.id} />
                    <button
                      type="submit"
                      className="min-h-11 w-full rounded-full bg-destructive/10 px-4 text-sm font-medium text-destructive hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-destructive/20 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                      disabled={user.isCurrentUser}
                    >
                      Remover usuário
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </div>
        )}
      </AdminPanel>
    </AdminPage>
  )
}
