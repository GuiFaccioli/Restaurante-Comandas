'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil } from 'lucide-react'
import { ProdutoForm } from '@/components/admin/produto-form'
import { criarCategoria, toggleDisponivel } from '@/lib/actions/produtos'
import { useRouter } from 'next/navigation'

type Produto = { id: string; nome: string; descricao: string | null; preco: string; imagemUrl: string | null; disponivel: boolean }
type Categoria = { id: string; nome: string; ordem: number; produtos: Produto[] }

export function MenuAdminClient({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState(categorias[0]?.id ?? '')
  const [formOpen, setFormOpen] = useState(false)
  const [editProduto, setEditProduto] = useState<Produto | undefined>()
  const [newCat, setNewCat] = useState('')

  const catAtual = categorias.find((c) => c.id === selected)

  async function handleNewCategoria() {
    if (!newCat.trim()) return
    await criarCategoria(newCat.trim())
    setNewCat('')
    router.refresh()
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-48 space-y-1 shrink-0">
        <p className="text-xs uppercase text-muted-foreground font-medium mb-2">Categorias</p>
        {categorias.map((c) => (
          <button
            key={c.id}
            className={`w-full text-left px-3 py-2 rounded-[var(--radius)] text-sm ${selected === c.id ? 'bg-muted font-semibold' : 'hover:bg-muted/50'}`}
            onClick={() => setSelected(c.id)}
          >
            {c.nome}
          </button>
        ))}
        <div className="flex gap-1 mt-3">
          <input
            className="border rounded-[var(--radius)] px-2 py-1 text-xs w-full"
            placeholder="Nova categoria"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNewCategoria()}
          />
        </div>
      </div>

      {/* Products list */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">{catAtual?.nome}</h2>
          <Button size="sm" onClick={() => { setEditProduto(undefined); setFormOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Novo Produto
          </Button>
        </div>
        <div className="space-y-2">
          {catAtual?.produtos.map((p) => (
            <div key={p.id} className="border rounded-[var(--radius)] px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{p.nome}</span>
                <span className="text-muted-foreground text-sm ml-2">R$ {parseFloat(p.preco).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className="cursor-pointer"
                  variant={p.disponivel ? 'default' : 'secondary'}
                  onClick={async () => { await toggleDisponivel(p.id); router.refresh() }}
                >
                  {p.disponivel ? 'Disponível' : 'Indisponível'}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => { setEditProduto(p); setFormOpen(true) }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <ProdutoForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          categoriaId={selected}
          produto={editProduto}
        />
      )}
    </div>
  )
}
