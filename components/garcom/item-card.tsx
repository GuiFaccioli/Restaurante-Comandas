'use client'

import { Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/store/cart'

type Produto = {
  id: string
  nome: string
  descricao: string | null
  preco: string
  disponivel: boolean
  estoqueInsuficiente: boolean
}

export function ItemCard({ produto }: { produto: Produto }) {
  const { items, addItem, decrementItem } = useCart()
  const cartItem = items.find((item) => item.produtoId === produto.id)
  const preco = parseFloat(produto.preco)

  return (
    <article className="flex h-full min-w-0 flex-col gap-3 rounded-[var(--radius-card)] border bg-card p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold">{produto.nome}</p>
        {produto.descricao ? <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">{produto.descricao}</p> : null}
        <p className="mt-2 text-sm font-medium">R$ {preco.toFixed(2)}</p>
      </div>
      {!produto.disponivel ? <p className="text-xs text-muted-foreground">Indisponível</p> : produto.estoqueInsuficiente ? <p className="text-xs font-medium text-[var(--action-warning-outline)]">Falta estoque</p> : cartItem ? (
        <div className="flex items-center gap-2">
          <Button type="button" intent="neutral" appearance="outline" size="icon" className="size-11 p-0" aria-label={`Diminuir ${produto.nome}`} onClick={() => decrementItem(produto.id)}><Minus aria-hidden="true" /></Button>
          <span className="w-8 text-center text-sm font-medium">{cartItem.quantidade}</span>
          <Button type="button" intent="positive" appearance="soft" size="icon" className="size-11" aria-label={`Adicionar mais ${produto.nome}`} onClick={() => addItem({ produtoId: produto.id, nome: produto.nome, preco })}><Plus aria-hidden="true" /></Button>
        </div>
      ) : <Button type="button" intent="positive" appearance="solid" size="sm" className="min-h-11 w-full" onClick={() => addItem({ produtoId: produto.id, nome: produto.nome, preco })}><Plus aria-hidden="true" /> Adicionar</Button>}
    </article>
  )
}
