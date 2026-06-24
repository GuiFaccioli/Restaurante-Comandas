import Link from 'next/link'
import { asc, sql, eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { mesa } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function MesasGarcomPage() {
  const mesas = await db
    .select({
      id: mesa.id,
      numero: mesa.numero,
      ativa: mesa.ativa,
    })
    .from(mesa)
    .where(sql`${mesa.ativa} = 1`)
    .orderBy(asc(mesa.numero))

  return (
    <section className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Selecionar mesa</h1>
        <p className="text-sm text-muted-foreground">
          Escolha a mesa para montar e confirmar o pedido.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mesas.map((m) => (
          <Link
            key={m.id}
            href={`/garcom/mesa/${m.id}`}
            className="rounded-[var(--radius)] border p-4 transition-colors hover:bg-muted"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Mesa {m.numero}</span>
              <span className="text-xs text-muted-foreground">Ativa</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Abrir mesa e confirmar pedidos vinculados a ela.
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
