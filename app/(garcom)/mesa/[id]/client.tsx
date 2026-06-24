'use client'
import { useState } from 'react'
import { MenuGrid } from '@/components/garcom/menu-grid'
import { CartFab } from '@/components/garcom/cart-fab'
import { CartDrawer } from '@/components/garcom/cart-drawer'

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
  pedidoId: string
  categorias: CategoriaComProdutos[]
}

export function MesaPageClient({ mesaNumero, mesaId, pedidoId, categorias }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-semibold mb-4">Mesa {mesaNumero}</h1>
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
