import { db } from '@/lib/db/index'
import { asc } from 'drizzle-orm'
import { mesa } from '@/lib/db/schema'
import { MesasAdminClient } from './client'
import { requireAccess } from '@/lib/auth/access'

export default async function MesasAdminPage() {
  await requireAccess('admin')
  const mesas = await db.select().from(mesa).orderBy(asc(mesa.numero))
  return <MesasAdminClient mesas={mesas} />
}
