import { NextResponse } from 'next/server'

import { requireAccess } from '@/lib/auth/access'
import { getTenantMesaOrders } from '@/lib/orders/queries'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = await requireAccess('garcom')
  const { id } = await params
  const pedidos = await getTenantMesaOrders({ tenantId, mesaId: id })

  return NextResponse.json({ pedidos })
}
