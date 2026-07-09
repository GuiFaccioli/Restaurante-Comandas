'use client'
import { Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/store/cart'

type Produto = {
  id: string
  nome: string
  descricao: string | null
  preco: string
  imagemUrl: string | null
  disponivel: boolean
}

export function ItemCard({ produto }: { produto: Produto }) {
  const { items, addItem, decrementItem } = useCart()
  const cartItem = items.find((i) => i.produtoId === produto.id)
  const preco = parseFloat(produto.preco)

  return (
    <div className="flex h-full min-w-0 flex-col gap-3 rounded-[var(--radius)] border bg-card p-4">
      {produto.imagemUrl ? (
        <img
          src={produto.imagemUrl}
          alt={produto.nome}
          className="h-36 w-full rounded-[var(--radius)] object-cover sm:h-32"
          loading="lazy"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div className="flex h-36 w-full select-none items-center justify-center rounded-[var(--radius)] bg-muted text-4xl sm:h-32">
          🍕
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold">{produto.nome}</p>
        {produto.descricao && (
          <p className="line-clamp-2 break-words text-xs text-muted-foreground">
            {produto.descricao}
          </p>
        )}
        <p className="mt-1 text-sm font-medium">R$ {preco.toFixed(2)}</p>
      </div>
      {!produto.disponivel ? (
        <p className="text-xs text-muted-foreground">Indisponível</p>
      ) : cartItem ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-10 w-10 p-0"
            onClick={() => decrementItem(produto.id)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{cartItem.quantidade}</span>
          <Button
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => addItem({ produtoId: produto.id, nome: produto.nome, preco })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          className="min-h-11 w-full"
          onClick={() => addItem({ produtoId: produto.id, nome: produto.nome, preco })}
        >
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      )}
    </div>
  )
}
