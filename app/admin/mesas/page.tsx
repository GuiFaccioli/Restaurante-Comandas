import { db } from '@/lib/db/index'
import { asc, eq } from 'drizzle-orm'
import { mesa } from '@/lib/db/schema'
import { MesasAdminClient } from './client'
import { requireAccess } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function MesasAdminPage() {
  const { tenantId } = await requireAccess('admin')
  const mesas = await db.select().from(mesa).where(eq(mesa.tenantId, tenantId)).orderBy(asc(mesa.numero))
  return <MesasAdminClient mesas={mesas} />
}
