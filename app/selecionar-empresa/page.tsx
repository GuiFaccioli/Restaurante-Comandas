import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { ProfileMenu } from '@/components/auth/profile-menu'
import { AgilizaFluxoBrand } from '@/components/brand/agiliza-fluxo-brand'
import { listCurrentTenantMemberships, selectTenant } from '@/lib/actions/auth'

export const dynamic = 'force-dynamic'

export default async function SelecionarEmpresaPage() {
  const memberships = await listCurrentTenantMemberships()
  if (memberships.length === 0) redirect('/sem-acesso')
  if (memberships.length === 1) { const formData = new FormData(); formData.set('tenantId', memberships[0].tenantId); await selectTenant(formData) }

  return <main className="relative flex min-h-dvh items-center justify-center bg-[var(--canvas)] p-4 sm:p-6"><ProfileMenu className="absolute right-4 top-4" /><section className="w-full max-w-lg"><AgilizaFluxoBrand tagline="Escolha onde o fluxo acontece." /><h1 className="mt-10 text-3xl font-black tracking-[-0.04em] text-[var(--ink)]">Escolha o restaurante</h1><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Selecione onde você vai trabalhar agora.</p><div className="mt-6 grid gap-3">{memberships.map((membership) => <form key={membership.tenantId} action={selectTenant}><input type="hidden" name="tenantId" value={membership.tenantId} /><button type="submit" className="af-surface flex min-h-20 w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"><span className="font-semibold text-[var(--ink)]">{membership.nome}</span><ArrowRight aria-hidden="true" className="size-5 shrink-0 text-[var(--primary)]" /></button></form>)}</div></section></main>
}
