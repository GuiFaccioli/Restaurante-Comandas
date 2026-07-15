'use client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ItemCard } from './item-card'

type Produto = {
  id: string
  nome: string
  descricao: string | null
  preco: string
  imagemUrl: string | null
  disponivel: boolean
}

type Categoria = { id: string; nome: string; produtos: Produto[] }

export function MenuGrid({ categorias }: { categorias: Categoria[] }) {
  return (
    <Tabs defaultValue={categorias[0]?.id}>
      <TabsList className="sticky top-0 z-20 mb-4 grid !h-auto min-h-0 w-full grid-cols-2 gap-2 overflow-visible bg-background py-1 sm:grid-cols-3 lg:grid-cols-4">
        {categorias.map((c) => (
          <TabsTrigger
            key={c.id}
            value={c.id}
            className="min-h-11 w-full px-3 text-center data-active:border-[var(--success)] data-active:text-[var(--success)]"
          >
            {c.nome}
          </TabsTrigger>
        ))}
      </TabsList>
      {categorias.map((c) => (
        <TabsContent key={c.id} value={c.id}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {c.produtos.map((p) => (
              <ItemCard key={p.id} produto={p} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
