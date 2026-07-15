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
    <div className="flex h-full min-w-0 flex-col gap-4 rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
      {produto.imagemUrl ? (
        <img
          src={produto.imagemUrl}
          alt={produto.nome}
          className="h-44 w-full rounded-2xl object-cover sm:h-48"
          loading="lazy"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div className="flex h-44 w-full select-none items-center justify-center rounded-2xl bg-muted text-4xl sm:h-48">
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
            type="button"
            intent="neutral"
            appearance="outline"
            size="icon"
            className="size-11 p-0"
            aria-label={`Diminuir ${produto.nome}`}
            onClick={() => decrementItem(produto.id)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{cartItem.quantidade}</span>
          <Button
            type="button"
            intent="positive"
            appearance="soft"
            size="icon"
            className="size-11"
            aria-label={`Adicionar mais ${produto.nome}`}
            onClick={() => addItem({ produtoId: produto.id, nome: produto.nome, preco })}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          intent="positive"
          appearance="solid"
          size="sm"
          className="min-h-12 w-full rounded-full"
          onClick={() => addItem({ produtoId: produto.id, nome: produto.nome, preco })}
        >
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Adicionar
        </Button>
      )}
    </div>
  )
}
