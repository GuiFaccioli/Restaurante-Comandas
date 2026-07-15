import Link from 'next/link'
import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { mesa } from '@/lib/db/schema'
import { requireAccess } from '@/lib/auth/access'
import { ProfileMenu } from '@/components/auth/profile-menu'

export const dynamic = 'force-dynamic'

export default async function MesasGarcomPage() {
  const { tenantId } = await requireAccess('garcom')
  const mesas = await db
    .select({
      id: mesa.id,
      numero: mesa.numero,
      ativa: mesa.ativa,
    })
    .from(mesa)
    .where(and(eq(mesa.tenantId, tenantId), sql`${mesa.ativa} = 1`))
    .orderBy(asc(mesa.numero))

  return (
    <section className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Selecionar mesa</h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Escolha a mesa para montar e confirmar o pedido.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {mesas.map((m) => (
          <Link
            key={m.id}
            href={`/garcom/mesa/${m.id}`}
            className="rounded-[var(--radius)] border bg-card p-4 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Mesa {m.numero}</span>
              <span className="text-xs text-muted-foreground">Ativa</span>
            </div>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">
              Abrir mesa e confirmar pedidos vinculados a ela.
            </p>
          </Link>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <ProfileMenu currentAccess="garcom" />
      </div>
    </section>
  )
}
