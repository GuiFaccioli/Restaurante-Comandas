'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({})

  const catAtual = categorias.find((c) => c.id === selected)
  const produtoCount = catAtual?.produtos.length ?? 0

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

  async function handleToggleProduto(produto: Produto) {
    try {
      await toggleDisponivel(produto.id)
      router.refresh()
    } catch (error) {
      console.error('Failed to toggle product availability', error)
      toast.error('Não foi possível atualizar o produto.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cardápio</h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Organize categorias, produtos, preços e disponibilidade para a operação.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 w-full sm:w-auto"
          disabled={!catAtual}
          onClick={() => { setEditProduto(undefined); setFormOpen(true) }}
        >
          <Plus className="h-4 w-4 mr-1" /> Novo Produto
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Categorias</p>
            <div className="grid gap-1">
              {categorias.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={selected === c.id}
                  className={`min-h-11 w-full rounded-[var(--radius)] px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                    selected === c.id ? 'bg-muted font-semibold' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setSelected(c.id)
                    setCategoryName(c.nome)
                  }}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-[var(--radius)] border bg-background p-3">
          <label htmlFor="nova-categoria" className="text-xs font-medium">
            Nome da nova categoria
          </label>
          <Input
            id="nova-categoria"
            className="min-h-11"
            placeholder="Ex.: Sobremesas"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNewCategoria()}
          />
          <Button type="button" size="sm" className="min-h-11 w-full" onClick={handleNewCategoria}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar Categoria
          </Button>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{catAtual?.nome ?? 'Categorias'}</h2>
              <p className="text-sm text-muted-foreground">
                Produtos nesta categoria: {produtoCount}
              </p>
            </div>
          </div>

          {catAtual && (
            <div className="rounded-[var(--radius)] border bg-background p-3">
              <label htmlFor="renomear-categoria" className="text-xs font-medium">
                Renomear categoria
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <Input
                  id="renomear-categoria"
                  className="min-h-11 min-w-0 flex-1"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
                <Button type="button" size="sm" className="min-h-11" variant="outline" onClick={handleRenameCategoria}>
                  Salvar categoria
                </Button>
                <Button type="button" size="sm" className="min-h-11" variant="destructive" onClick={handleRemoveCategoria}>
                  Excluir categoria
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {catAtual && produtoCount === 0 ? (
              <div className="rounded-[var(--radius)] border bg-background p-4 text-sm text-muted-foreground">
                Nenhum produto nesta categoria. Use “Novo Produto” para montar o cardápio desta seção.
              </div>
            ) : (
              catAtual?.produtos.map((p) => (
                <div
                  key={p.id}
                  className="grid gap-3 rounded-[var(--radius)] border bg-card px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="relative flex h-12 w-12 shrink-0 select-none items-center justify-center overflow-hidden rounded-[var(--radius)] bg-muted text-xl">
                      <span aria-hidden="true">🍕</span>
                      {p.imagemUrl && !brokenImages[p.id] ? (
                        <img
                          src={p.imagemUrl}
                          alt=""
                          className={`absolute inset-0 h-full w-full object-cover ${loadedImages[p.id] ? 'block' : 'hidden'}`}
                          onLoad={() => {
                            setLoadedImages((current) => ({ ...current, [p.id]: true }))
                          }}
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                            setBrokenImages((current) => ({ ...current, [p.id]: true }))
                          }}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{p.nome}</p>
                      <p className="text-sm text-muted-foreground">R$ {parseFloat(p.preco).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      aria-pressed={p.disponivel}
                      className={`min-h-11 rounded-full px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                        p.disponivel
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-secondary text-secondary-foreground hover:bg-muted'
                      }`}
                      onClick={() => handleToggleProduto(p)}
                    >
                      {p.disponivel ? 'Disponível' : 'Indisponível'}
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-11"
                      variant="outline"
                      aria-label={`Editar produto ${p.nome}`}
                      onClick={() => { setEditProduto(p); setFormOpen(true) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="sm" className="min-h-11" variant="destructive" onClick={() => handleRemoveProduto(p)}>
                      Excluir produto
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
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
