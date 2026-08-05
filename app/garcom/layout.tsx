import { ProfileMenu } from '@/components/auth/profile-menu'
import { GarcomProfileSlot } from '@/components/garcom/garcom-profile-slot'
import { MobileBottomNavigation } from '@/components/shell/mobile-bottom-navigation'
import { getCurrentAccesses, requireAccess } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function GarcomLayout({ children }: { children: React.ReactNode }) {
  await requireAccess('garcom')
  const accesses = await getCurrentAccesses()
  return (
    <div className="min-h-screen bg-[var(--canvas)] pb-20">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div>
          <p className="text-lg font-bold tracking-[-0.03em] text-[var(--primary-active)]">Agiliza Fluxo</p>
          <p className="text-xs text-[var(--muted)]">Atendimento sem papel.</p>
        </div>
        <GarcomProfileSlot showOnOperationalPages={accesses.length > 1}><ProfileMenu currentAccess="garcom" /></GarcomProfileSlot>
      </header>
      {children}
      <MobileBottomNavigation />
    </div>
  )
}
