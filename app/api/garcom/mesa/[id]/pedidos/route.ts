import { NextResponse } from 'next/server'

import { requireAccess } from '@/lib/auth/access'
import { getTenantMesaOrders } from '@/lib/orders/queries'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = await requireAccess('garcom')
  const { id } = await params
  const atendimentoId = new URL(_request.url).searchParams.get('atendimentoId') ?? undefined
  const pedidos = await getTenantMesaOrders({ tenantId, mesaId: id, atendimentoId })

  return NextResponse.json({ pedidos })
}
