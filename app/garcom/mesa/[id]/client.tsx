'use client'
import { useLayoutEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, MoreVertical } from 'lucide-react'
import { MenuGrid } from '@/components/garcom/menu-grid'
import { CartFab } from '@/components/garcom/cart-fab'
import { CartDrawer } from '@/components/garcom/cart-drawer'
import { TableOrdersPanel } from '@/components/garcom/table-orders-panel'
import { ScrollToTopButton } from '@/components/operational/scroll-to-top'
import type { TableOrder } from '@/lib/orders/queries'
import { useCart } from '@/lib/store/cart'
import { MesaAtendimentoGate } from '@/components/garcom/mesa-atendimento-gate'
import type { AtendimentoResumo } from '@/lib/attendance/queries'
import type { ReceitaDisponibilidade, SaldoDisponibilidade } from '@/lib/stock/availability'

type Produto = {
  id: string
  nome: string
  descricao: string | null
  preco: string
  imagemUrl: string | null
  disponivel: boolean
  estoqueInsuficiente: boolean
}

type CategoriaComProdutos = {
  id: string
  nome: string
  produtos: Produto[]
}

type Props = {
  mesaNumero: number
  mesaId: string
  atendimentoId?: string
  attendances?: AtendimentoResumo[]
  categorias: CategoriaComProdutos[]
  recipes?: ReceitaDisponibilidade[]
  balances?: SaldoDisponibilidade[]
  initialPedidos: TableOrder[]
}

export function MesaPageClient({ mesaNumero, mesaId, atendimentoId = '', attendances = [], categorias, recipes = [], balances = [], initialPedidos }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const activeMesaId = useCart((state) => state.mesaId)
  const selectMesa = useCart((state) => state.selectMesa)
  const cartReady = activeMesaId === mesaId

  useLayoutEffect(() => {
    selectMesa(mesaId)
  }, [mesaId, selectMesa])

  return (
    <div className="mx-auto flex h-[100dvh] max-w-4xl flex-col overflow-hidden p-4 pb-28 sm:p-6">
      <div className="-mx-4 -mt-4 mb-3 flex shrink-0 items-center justify-between border-b border-white/10 bg-black px-4 py-4 text-white shadow-lg sm:-mx-6 sm:-mt-6 sm:px-6">
        <Link
          href="/garcom/mesas"
          aria-label="Voltar"
          className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft aria-hidden="true" className="size-7" />
        </Link>
        <h1 className="text-2xl font-bold">Mesa {mesaNumero}</h1>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Notificações" className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
            <Bell aria-hidden="true" className="size-6" />
          </button>
          <button type="button" aria-label="Mais opções" className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
            <MoreVertical aria-hidden="true" className="size-6" />
          </button>
        </div>
      </div>
      <div className="shrink-0">
        <TableOrdersPanel mesaId={mesaId} atendimentoId={atendimentoId} initialPedidos={initialPedidos} />
      </div>
      {!atendimentoId ? <MesaAtendimentoGate mesaId={mesaId} mesaNumero={mesaNumero} attendances={attendances} /> : <section className="mt-3 flex min-h-0 flex-1 flex-col" aria-labelledby="garcom-cardapio-heading">
        <div className="mb-3 shrink-0">
          <h2 id="garcom-cardapio-heading" className="text-lg font-bold text-[var(--ink)]">Cardápio</h2>
          <p className="text-sm text-[var(--muted)]">Escolha os itens para adicionar à comanda.</p>
        </div>
        <MenuGrid categorias={categorias} recipes={recipes} balances={balances} />
      </section>}
      {cartReady && atendimentoId && (
        <>
          <CartFab onClick={() => setDrawerOpen(true)} />
          <CartDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            mesaId={mesaId}
            mesaNumero={mesaNumero}
            atendimentoId={atendimentoId}
            recipes={recipes}
            balances={balances}
          />
        </>
      )}
      <ScrollToTopButton />
    </div>
  )
}
