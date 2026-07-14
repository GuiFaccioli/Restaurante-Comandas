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
      <TabsList className="mb-4 flex w-full justify-start gap-1 overflow-x-auto">
        {categorias.map((c) => (
          <TabsTrigger
            key={c.id}
            value={c.id}
            className="min-h-11 min-w-24 px-4 shrink-0 data-active:border-[var(--success)] data-active:text-[var(--success)]"
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
