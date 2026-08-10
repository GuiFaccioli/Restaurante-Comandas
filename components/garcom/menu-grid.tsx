'use client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ItemCard } from './item-card'
import type { ReceitaDisponibilidade, SaldoDisponibilidade, ProdutoControleEstoque } from '@/lib/stock/availability'

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
  categorias: Categoria[]
  recipes: ReceitaDisponibilidade[]
  balances: SaldoDisponibilidade[]
  productStockControls: ProdutoControleEstoque[]
}

export function MenuGrid({ categorias, recipes, balances, productStockControls }: Props) {
  const categoriasOrdenadas = categorias.map((categoria) => ({
    ...categoria,
    produtos: [...categoria.produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  }))

  return (
    <Tabs defaultValue={categoriasOrdenadas[0]?.id} className="min-h-0 flex-1">
      <TabsList className="mb-4 grid !h-auto min-h-0 w-full shrink-0 grid-cols-3 gap-1 overflow-visible bg-background py-1 sm:grid-cols-3 lg:grid-cols-4">
        {categoriasOrdenadas.map((c) => (
          <TabsTrigger
            key={c.id}
            value={c.id}
            className="min-h-11 w-full px-2 text-center text-sm data-active:border-[var(--success)] data-active:text-[var(--success)]"
          >
            {c.nome}
          </TabsTrigger>
        ))}
      </TabsList>
      {categoriasOrdenadas.map((c) => (
        <TabsContent key={c.id} value={c.id} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {c.produtos.map((p) => (
              <ItemCard key={p.id} produto={p} recipes={recipes} balances={balances} productStockControls={productStockControls} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
