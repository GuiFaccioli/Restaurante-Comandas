'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil } from 'lucide-react'
import { ProdutoForm } from '@/components/admin/produto-form'
import {
  criarCategoria,
  editarCategoria,
  removerCategoria,
  removerProduto,
  toggleDisponivel,
} from '@/lib/actions/produtos'
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
  const [categoryName, setCategoryName] = useState(categorias[0]?.nome ?? '')

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

  async function handleRenameCategoria() {
    if (!catAtual || !categoryName.trim()) return
    try {
      await editarCategoria(catAtual.id, categoryName.trim())
      router.refresh()
      toast.success('Categoria atualizada com sucesso.')
    } catch (error) {
      console.error('Failed to update category', error)
      toast.error('Não foi possível renomear a categoria.')
    }
  }

  async function handleRemoveCategoria() {
    if (!catAtual) return
    if (!window.confirm(`Excluir a categoria "${catAtual.nome}"?`)) return
    try {
      await removerCategoria(catAtual.id)
      const nextCategory = categorias.find((categoria) => categoria.id !== catAtual.id)
      setSelected(nextCategory?.id ?? '')
      setCategoryName(nextCategory?.nome ?? '')
      router.refresh()
      toast.success('Categoria excluída com sucesso.')
    } catch (error) {
      console.error('Failed to remove category', error)
      toast.error('Remova os produtos antes de excluir a categoria.')
    }
  }

  async function handleRemoveProduto(produto: Produto) {
    if (!window.confirm(`Excluir o produto "${produto.nome}"?`)) return
    try {
      await removerProduto(produto.id)
      router.refresh()
      toast.success('Produto excluído com sucesso.')
    } catch (error) {
      console.error('Failed to remove product', error)
      toast.error('Não foi possível excluir o produto.')
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
            onClick={() => {
              setSelected(c.id)
              setCategoryName(c.nome)
            }}
          >
            {c.nome}
          </button>
        ))}
        <div className="mt-4 space-y-2 rounded-[var(--radius)] border p-2">
          <label htmlFor="nova-categoria" className="text-xs font-medium">
            Nome da nova categoria
          </label>
          <input
            id="nova-categoria"
            className="w-full rounded-[var(--radius)] border px-2 py-1 text-xs"
            placeholder="Ex.: Sobremesas"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNewCategoria()}
          />
          <Button size="sm" className="w-full" onClick={handleNewCategoria}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar Categoria
          </Button>
        </div>
      </div>

      {/* Products list */}
      <div className="flex-1">
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{catAtual?.nome ?? 'Categorias'}</h2>
            <Button size="sm" disabled={!catAtual} onClick={() => { setEditProduto(undefined); setFormOpen(true) }}>
              <Plus className="h-4 w-4 mr-1" /> Novo Produto
            </Button>
          </div>

          {catAtual && (
            <div className="rounded-[var(--radius)] border p-3">
              <label htmlFor="renomear-categoria" className="text-xs font-medium">
                Renomear categoria
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  id="renomear-categoria"
                  className="min-w-0 flex-1 rounded-[var(--radius)] border px-3 py-2 text-sm"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
                <Button size="sm" variant="outline" onClick={handleRenameCategoria}>
                  Salvar categoria
                </Button>
                <Button size="sm" variant="destructive" onClick={handleRemoveCategoria}>
                  Excluir categoria
                </Button>
              </div>
            </div>
          )}
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
                <Button size="sm" variant="destructive" onClick={() => handleRemoveProduto(p)}>
                  Excluir produto
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
