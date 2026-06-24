import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { mesa } from '@/lib/db/schema'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MesaIdAliasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numeroMesa = Number(id)

  if (!Number.isInteger(numeroMesa) || numeroMesa <= 0) notFound()

  const [m] = await db
    .select({ id: mesa.id, ativa: mesa.ativa })
    .from(mesa)
    .where(eq(mesa.numero, numeroMesa))

  if (!m || !m.ativa) notFound()

  redirect(`/garcom/mesa/${m.id}`)
}
