'use client'

import { useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { CartDrawer } from '@/components/garcom/cart-drawer'
import { CartFab } from '@/components/garcom/cart-fab'
import { MenuGrid } from '@/components/garcom/menu-grid'
import type { ReceitaDisponibilidade, SaldoDisponibilidade, ProdutoControleEstoque } from '@/lib/stock/availability'
import { useCart } from '@/lib/store/cart'

type Produto = {
  id: string
  nome: string
  descricao: string | null
  preco: string
  imagemUrl: string | null
  disponivel: boolean
  estoqueInsuficiente: boolean
  controleEstoque: boolean
}

type Categoria = { id: string; nome: string; produtos: Produto[] }

type Props = {
  customer: {
    id: string
    name: string
    addressId: string
    addressLabel: string
    deliveryFee: string
  }
  categorias: Categoria[]
  recipes: ReceitaDisponibilidade[]
  balances: SaldoDisponibilidade[]
}

export function DeliveryOrderComposer({ customer, categorias, recipes, balances }: Props) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const selectDelivery = useCart((state) => state.selectDelivery)
  const items = useCart((state) => state.items)
  const productStockControls: ProdutoControleEstoque[] = categorias.flatMap((category) => category.produtos.map(({ id, controleEstoque }) => ({ id, controleEstoque })))

  useLayoutEffect(() => {
    selectDelivery(customer.id)
  }, [customer.id, selectDelivery])

  return <div className="flex min-h-[calc(100dvh-12rem)] flex-col gap-4">
    <section className="rounded-[var(--radius-card)] border border-[var(--primary)]/30 bg-[var(--primary-soft)] p-4" aria-labelledby="delivery-context-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary-active)]">DELIVERY</p>
          <h2 id="delivery-context-heading" className="mt-1 text-lg font-bold text-[var(--ink)]">{customer.name}</h2>
          <p className="mt-1 text-sm text-[var(--body)]">{customer.addressLabel}</p>
        </div>
        <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-bold text-white">Novo pedido</span>
      </div>
    </section>
    <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="delivery-menu-heading">
      <div className="mb-3 shrink-0">
        <h2 id="delivery-menu-heading" className="text-lg font-bold text-[var(--ink)]">Cardápio</h2>
        <p className="text-sm text-[var(--muted)]">Escolha os itens para montar o pedido.</p>
      </div>
      <MenuGrid categorias={categorias} recipes={recipes} balances={balances} productStockControls={productStockControls} />
    </section>
    {items.length > 0 ? <>
      <CartFab onClick={() => setDrawerOpen(true)} />
      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode="delivery"
        delivery={{
          clienteId: customer.id,
          clienteNome: customer.name,
          enderecoId: customer.addressId,
          enderecoLabel: customer.addressLabel,
          taxaEntrega: customer.deliveryFee,
        }}
        onConfirmed={() => router.push('/admin/clientes')}
        recipes={recipes}
        balances={balances}
        productStockControls={productStockControls}
      />
    </> : null}
  </div>
}
