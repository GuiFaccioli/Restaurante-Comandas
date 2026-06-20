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
      <TabsList className="w-full overflow-x-auto flex justify-start gap-1 mb-4">
        {categorias.map((c) => (
          <TabsTrigger key={c.id} value={c.id} className="shrink-0">{c.nome}</TabsTrigger>
        ))}
      </TabsList>
      {categorias.map((c) => (
        <TabsContent key={c.id} value={c.id}>
          <div className="grid grid-cols-2 gap-3">
            {c.produtos.map((p) => <ItemCard key={p.id} produto={p} />)}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
