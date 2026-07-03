import { getCurrentAccesses, redirectForAccesses } from '@/lib/auth/access'
import { getCurrentSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getCurrentSession()
  if (!session) redirect('/auth/sign-in')

  redirect(redirectForAccesses(await getCurrentAccesses()))
}
