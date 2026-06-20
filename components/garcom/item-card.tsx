'use client'
import { Button } from '@/components/ui/button'
import { Plus, Minus } from 'lucide-react'
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
    <div className="border rounded-[var(--radius)] p-3 flex flex-col gap-2">
      {produto.imagemUrl && (
        <img
          src={produto.imagemUrl}
          alt={produto.nome}
          className="w-full h-32 object-cover rounded-[var(--radius)]"
          loading="lazy"
        />
      )}
      <div>
        <p className="font-semibold text-sm">{produto.nome}</p>
        {produto.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{produto.descricao}</p>
        )}
        <p className="text-sm font-medium mt-1">R$ {preco.toFixed(2)}</p>
      </div>
      {!produto.disponivel ? (
        <p className="text-xs text-muted-foreground">Indisponível</p>
      ) : cartItem ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => decrementItem(produto.id)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-6 text-center">{cartItem.quantidade}</span>
          <Button
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => addItem({ produtoId: produto.id, nome: produto.nome, preco })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          className="h-12 w-full"
          onClick={() => addItem({ produtoId: produto.id, nome: produto.nome, preco })}
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      )}
    </div>
  )
}
