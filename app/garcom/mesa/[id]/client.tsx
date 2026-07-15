'use client'
import { useState } from 'react'
import Link from 'next/link'
import { MenuGrid } from '@/components/garcom/menu-grid'
import { CartFab } from '@/components/garcom/cart-fab'
import { CartDrawer } from '@/components/garcom/cart-drawer'
import { TableOrdersPanel } from '@/components/garcom/table-orders-panel'
import { ScrollToTopButton } from '@/components/operational/scroll-to-top'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
      <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 text-center">
          <h1 className="text-pretty text-2xl font-bold">Mesa {mesaNumero}</h1>
        </div>
        <Link
          href="/garcom/mesas"
          className={cn(
            buttonVariants({
              intent: 'neutral',
              appearance: 'outline',
              size: 'sm',
              className: 'min-h-11',
            }),
            'w-full sm:w-auto justify-center'
          )}
        >
          Voltar
        </Link>
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
