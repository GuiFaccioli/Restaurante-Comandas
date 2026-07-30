import { ProfileMenu } from '@/components/auth/profile-menu'
import { requireAccess } from '@/lib/auth/access'

export default async function CozinhaLayout({ children }: { children: React.ReactNode }) {
  await requireAccess('cozinha')
  return (
    <div className="min-h-screen bg-[var(--canvas)] font-sans">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-6">
        <div>
          <p className="text-lg font-bold text-[var(--primary-active)]">Cozinha</p>
          <p className="text-sm text-[var(--muted)]">Pedidos no ritmo certo.</p>
        </div>
        <ProfileMenu currentAccess="cozinha" />
      </header>
      {children}
    </div>
  )
}
