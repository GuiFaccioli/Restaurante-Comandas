import { db } from '@/lib/db/index'
import { asc, eq } from 'drizzle-orm'
import { usuario, usuarioAcesso } from '@/lib/db/schema'
import { requireAccess } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function UsuariosAdminPage() {
  await requireAccess('admin')

  const usuarios = await db.select().from(usuario).orderBy(asc(usuario.nome))
  const acessos = await db
    .select({
      usuarioId: usuarioAcesso.usuarioId,
      acesso: usuarioAcesso.acesso,
    })
    .from(usuarioAcesso)
    .innerJoin(usuario, eq(usuarioAcesso.usuarioId, usuario.id))

  const accessesByUser = new Map<string, string[]>()
  for (const row of acessos) {
    accessesByUser.set(row.usuarioId, [...(accessesByUser.get(row.usuarioId) ?? []), row.acesso])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuários cadastrados</h1>
        <p className="text-sm text-muted-foreground">
          Lista operacional de usuários e áreas liberadas no sistema.
        </p>
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium">Acessos</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-4 py-3 font-medium">{user.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">
                  {(accessesByUser.get(user.id) ?? []).join(', ') || 'Sem acessos'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
