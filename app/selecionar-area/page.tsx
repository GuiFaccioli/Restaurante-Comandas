import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { ProfileMenu } from '@/components/auth/profile-menu'
import { AgilizaFluxoBrand } from '@/components/brand/agiliza-fluxo-brand'
import { ACCESS_DESCRIPTION, ACCESS_LABEL, getCurrentAccesses, redirectForAccesses } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function SelecionarAreaPage() {
  const accesses = await getCurrentAccesses()
  if (accesses.length !== 1 && accesses.length === 0) redirect('/sem-acesso')
  if (accesses.length === 1) redirect(redirectForAccesses(accesses))

  return <main className="relative flex min-h-dvh items-center justify-center bg-[var(--canvas)] p-4 sm:p-6"><ProfileMenu className="absolute right-4 top-4" /><section className="w-full max-w-lg"><AgilizaFluxoBrand tagline="Escolha o próximo passo da sua operação." /><h1 className="mt-10 text-3xl font-black tracking-[-0.04em] text-[var(--ink)]">Por onde você quer começar?</h1><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Escolha a área para ver o que precisa da sua atenção agora.</p><div className="mt-6 grid gap-3">{accesses.map((access) => <a key={access} href={redirectForAccesses([access])} className="af-surface flex min-h-20 items-center justify-between gap-4 p-4 transition-colors hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"><span><span className="block font-semibold text-[var(--ink)]">{ACCESS_LABEL[access]}</span><span className="mt-1 block text-sm text-[var(--muted)]">{ACCESS_DESCRIPTION[access]}</span></span><ArrowRight aria-hidden="true" className="size-5 shrink-0 text-[var(--primary)]" /></a>)}</div></section></main>
}
