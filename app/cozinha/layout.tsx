import { ProfileMenu } from '@/components/auth/profile-menu'
import { AgilizaFluxoBrand } from '@/components/brand/agiliza-fluxo-brand'
import { requireAccess } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function CozinhaLayout({ children }: { children: React.ReactNode }) {
  await requireAccess('cozinha')
  return (
    <div className="min-h-screen bg-[var(--canvas)] font-sans">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-6">
        <AgilizaFluxoBrand tagline="Pedidos no ritmo certo." />
        <ProfileMenu currentAccess="cozinha" />
      </header>
      {children}
    </div>
  )
}
