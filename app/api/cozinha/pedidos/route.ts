import { NextResponse } from 'next/server'

import { requireAccess } from '@/lib/auth/access'
import { getKitchenOrders } from '@/lib/kitchen/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenantId } = await requireAccess('cozinha')
  const pedidos = await getKitchenOrders({ tenantId })

  return NextResponse.json(
    { pedidos },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
