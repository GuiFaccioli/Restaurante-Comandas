import { NextResponse } from 'next/server'

import { requireAccess } from '@/lib/auth/access'
import { getCashierAccounts } from '@/lib/attendance/queries'

export async function GET() {
  const { tenantId } = await requireAccess('caixa')
  const contas = await getCashierAccounts({ tenantId })

  return NextResponse.json({ contas })
}
