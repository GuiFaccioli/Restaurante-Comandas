import { db } from '@/lib/db/index'
import { asc } from 'drizzle-orm'
import { mesa } from '@/lib/db/schema'
import { MesasAdminClient } from './client'

export default async function MesasAdminPage() {
  const mesas = await db.select().from(mesa).orderBy(asc(mesa.numero))
  return <MesasAdminClient mesas={mesas} />
}
