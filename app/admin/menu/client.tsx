'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil } from 'lucide-react'
import { ProdutoForm } from '@/components/admin/produto-form'
import { criarCategoria, toggleDisponivel } from '@/lib/actions/produtos'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
    try {
      await criarCategoria(newCat.trim())
      setNewCat('')
      router.refresh()
      toast.success('Categoria criada com sucesso.')
    } catch (error) {
      console.error('Failed to create category', error)
      toast.error('Não foi possível criar a categoria.')
    }
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
            <div key={p.id} className="border rounded-[var(--radius)] px-4 py-3 flex items-center justify-between gap-3">
              {p.imagemUrl ? (
                <img
                  src={p.imagemUrl}
                  alt={p.nome}
                  className="w-12 h-12 object-cover rounded-[var(--radius)] shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-12 h-12 rounded-[var(--radius)] bg-muted flex items-center justify-center text-xl shrink-0 select-none">🍕</div>
              )}
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm">{p.nome}</span>
                <span className="text-muted-foreground text-sm ml-2">R$ {parseFloat(p.preco).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className="cursor-pointer"
                  variant={p.disponivel ? 'default' : 'secondary'}
                  onClick={async () => {
                    try {
                      await toggleDisponivel(p.id)
                      router.refresh()
                    } catch (error) {
                      console.error('Failed to toggle product availability', error)
                      toast.error('Não foi possível atualizar o produto.')
                    }
                  }}
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
          key={editProduto?.id ?? 'new'}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          categoriaId={selected}
          produto={editProduto}
        />
      )}
    </div>
  )
}
