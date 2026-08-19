import { and, asc, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'

import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { DeliveryOrderComposer } from '@/components/admin/delivery-order-composer'
import { requireAnyAccess } from '@/lib/auth/access'
import { buscarClientePorId } from '@/lib/customer/queries'
import { db } from '@/lib/db/index'
import { categoria, fichaTecnicaItem, insumo, produto } from '@/lib/db/schema'
import { produtoTemEstoque } from '@/lib/stock/availability'

export const dynamic = 'force-dynamic'

export default async function DeliveryOrderPage({ searchParams }: { searchParams: Promise<{ clienteId?: string }> }) {
  const { tenantId } = await requireAnyAccess(['admin', 'caixa'])
  const { clienteId } = await searchParams
  if (!clienteId) notFound()

  const customer = await buscarClientePorId(clienteId)
  if (!customer?.active || !customer.addressId || !customer.street || !customer.number) notFound()

  const [categories, products, recipes, balances] = await Promise.all([
    db.select().from(categoria).where(eq(categoria.tenantId, tenantId)).orderBy(asc(categoria.ordem)),
    db.select().from(produto).where(and(eq(produto.tenantId, tenantId), eq(produto.disponivel, true))).orderBy(asc(produto.nome)),
    db.select({ produtoId: fichaTecnicaItem.produtoId, insumoId: fichaTecnicaItem.insumoId, quantidade: fichaTecnicaItem.quantidade }).from(fichaTecnicaItem).where(eq(fichaTecnicaItem.tenantId, tenantId)),
    db.select({ id: insumo.id, nome: insumo.nome, estoqueAtual: insumo.estoqueAtual }).from(insumo).where(eq(insumo.tenantId, tenantId)),
  ])

  const categoriesWithProducts = categories.map((category) => ({
    ...category,
    produtos: products.filter((product) => product.categoriaId === category.id).map((product) => ({
      ...product,
      estoqueInsuficiente: product.controleEstoque && !produtoTemEstoque(product.id, recipes, balances),
    })),
  }))

  return <AdminPage>
    <AdminPageHeader eyebrow="Novo pedido" title="Pedido DELIVERY" description="Os produtos, o cliente e a taxa ficam reunidos antes da confirmação." />
    <DeliveryOrderComposer
      customer={{
        id: customer.id,
        name: customer.name,
        addressId: customer.addressId,
        addressLabel: [customer.street, customer.number, customer.neighborhood, customer.city].filter(Boolean).join(', '),
        deliveryFee: customer.deliveryFee,
      }}
      categorias={categoriesWithProducts}
      recipes={recipes}
      balances={balances}
    />
  </AdminPage>
}
