'use client'
import { useState } from 'react'
import Link from 'next/link'
import { MenuGrid } from '@/components/garcom/menu-grid'
import { CartFab } from '@/components/garcom/cart-fab'
import { CartDrawer } from '@/components/garcom/cart-drawer'
import { TableOrdersPanel } from '@/components/garcom/table-orders-panel'
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
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Mesa {mesaNumero}</h1>
          <p className="text-sm text-muted-foreground">Monte pedidos e acompanhe entregas.</p>
        </div>
        <Link href="/garcom/mesas" className={cn(buttonVariants({ variant: 'destructive', size: 'sm' }))}>
          Voltar
        </Link>
      </div>
      <TableOrdersPanel mesaId={mesaId} initialPedidos={initialPedidos} />
      <MenuGrid categorias={categorias} />
      <CartFab onClick={() => setDrawerOpen(true)} />
      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mesaId={mesaId}
        mesaNumero={mesaNumero}
      />
    </div>
  )
}
