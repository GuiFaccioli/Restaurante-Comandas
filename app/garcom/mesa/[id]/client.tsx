'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, MoreVertical } from 'lucide-react'
import { MenuGrid } from '@/components/garcom/menu-grid'
import { CartFab } from '@/components/garcom/cart-fab'
import { CartDrawer } from '@/components/garcom/cart-drawer'
import { TableOrdersPanel } from '@/components/garcom/table-orders-panel'
import { ScrollToTopButton } from '@/components/operational/scroll-to-top'
import type { TableOrder } from '@/lib/orders/queries'

type Produto = {
  id: string
  nome: string
  descricao: string | null
  preco: string
  imagemUrl: string | null
  disponivel: boolean
}

type CategoriaComProdutos = {
  id: string
  nome: string
  produtos: Produto[]
}

type Props = {
  mesaNumero: number
  mesaId: string
  categorias: CategoriaComProdutos[]
  initialPedidos: TableOrder[]
}

export function MesaPageClient({ mesaNumero, mesaId, categorias, initialPedidos }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="mx-auto flex h-[100dvh] max-w-4xl flex-col overflow-hidden p-4 pb-28 sm:p-6">
      <div className="-mx-4 -mt-4 mb-3 flex shrink-0 items-center justify-between border-b border-white/10 bg-black px-4 py-4 text-white shadow-lg sm:-mx-6 sm:-mt-6 sm:px-6">
        <Link
          href="/garcom/mesas"
          aria-label="Voltar para mesas"
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
        <TableOrdersPanel mesaId={mesaId} initialPedidos={initialPedidos} />
      </div>
      <MenuGrid categorias={categorias} />
      <CartFab onClick={() => setDrawerOpen(true)} />
      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mesaId={mesaId}
        mesaNumero={mesaNumero}
      />
      <ScrollToTopButton />
    </div>
  )
}
