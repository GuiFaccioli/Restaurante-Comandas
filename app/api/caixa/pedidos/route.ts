import { NextResponse } from 'next/server'

import { requireAccess } from '@/lib/auth/access'
import { getCashierOrders } from '@/lib/orders/queries'

export async function GET() {
  const { tenantId } = await requireAccess('caixa')
  const pedidos = await getCashierOrders({ tenantId })

  return NextResponse.json({ pedidos })
}
