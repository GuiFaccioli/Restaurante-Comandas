'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AdminEmptyState, AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { Plus, Pencil } from 'lucide-react'
import Link from 'next/link'
import { CategoryManager } from '@/components/admin/category-manager'
import { ProdutoForm } from '@/components/admin/produto-form'
import {
  removerProduto,
  toggleDisponivel,
  type CreatedCategory,
} from '@/lib/actions/produtos'
import { nextCategoryIdAfterDeletion } from '@/lib/admin/category-selection'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Produto = { id: string; nome: string; descricao: string | null; preco: string; imagemUrl: string | null; disponivel: boolean; custo?: { custoTotal: number | null; margemPercentual: number | null; possuiFicha: boolean; possuiIngredienteSemCusto: boolean } }
type Categoria = { id: string; nome: string; ordem: number; produtos: Produto[] }

export function MenuAdminClient({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter()
  const [selectedCategoryId, setSelectedCategoryId] = useState(categorias[0]?.id ?? '')
  const [formOpen, setFormOpen] = useState(false)
  const [editProduto, setEditProduto] = useState<Produto | undefined>()
  const [pendingCategory, setPendingCategory] = useState<CreatedCategory | null>(null)
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({})

  const displayedCategories =
    pendingCategory &&
    !categorias.some((category) => category.id === pendingCategory.id)
      ? [
          ...categorias,
          {
            ...pendingCategory,
            ordem: Number.MAX_SAFE_INTEGER,
            produtos: [],
          },
        ]
      : categorias

  const selectedCategory = displayedCategories.find(
    (category) => category.id === selectedCategoryId
  )
  const produtoCount = selectedCategory?.produtos.length ?? 0

  useEffect(() => {
    if (
      pendingCategory &&
      categorias.some((category) => category.id === pendingCategory.id)
    ) {
      setPendingCategory(null)
    }

    setSelectedCategoryId((current) => {
      const currentStillExists = categorias.some(
        (category) => category.id === current
      )
      const currentIsPending = pendingCategory?.id === current
      return currentStillExists || currentIsPending
        ? current
        : (categorias[0]?.id ?? '')
    })
  }, [categorias, pendingCategory])

  function handleCreated(created: CreatedCategory) {
    setPendingCategory(created)
    setSelectedCategoryId(created.id)
  }

  function handleDeleted(deletedId: string) {
    setPendingCategory((current) =>
      current?.id === deletedId ? null : current
    )
    setSelectedCategoryId((current) =>
      nextCategoryIdAfterDeletion(displayedCategories, deletedId, current)
    )
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
    <AdminPage>
      <AdminPageHeader
        title="Cardápio"
        description="Gerencie os produtos disponíveis para venda."
        action={
          <>
            <Button
              type="button"
              intent="positive"
              appearance="solid"
              className="min-h-11 w-full sm:w-auto"
              aria-describedby={
                selectedCategory ? undefined : 'novo-produto-disabled-reason'
              }
              disabled={!selectedCategory}
              onClick={() => {
                setEditProduto(undefined)
                setFormOpen(true)
              }}
            >
              <Plus aria-hidden="true" />
              Novo produto
            </Button>
            <span id="novo-produto-disabled-reason" className="sr-only">
              Selecione ou crie uma categoria para habilitar Novo produto.
            </span>
          </>
        }
      />


      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <CategoryManager
            categorias={displayedCategories.map(({ id, nome, ordem }) => ({
              id,
              nome,
              ordem,
            }))}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            onCreated={handleCreated}
            onDeleted={handleDeleted}
            onRefresh={router.refresh}
          />
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedCategory?.nome ?? 'Categorias'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {produtoCount} produtos
              </p>
            </div>
          </div>

          {!selectedCategory ? (
            <AdminEmptyState
              title="Crie sua primeira categoria"
              description="Crie uma categoria para começar a cadastrar produtos."
            />
          ) : produtoCount === 0 ? (
            <AdminEmptyState
              title="Nenhum produto nesta categoria"
              description="Use Novo produto para cadastrar o primeiro item desta categoria."
              action={
                <Button
                  type="button"
                  intent="positive"
                  appearance="soft"
                  className="min-h-11"
                  onClick={() => {
                    setEditProduto(undefined)
                    setFormOpen(true)
                  }}
                >
                  <Plus aria-hidden="true" />
                  Adicionar primeiro produto
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {selectedCategory.produtos.map((p) => (
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
                      <p className="text-sm text-muted-foreground">Venda R$ {parseFloat(p.preco).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.custo?.custoTotal === null || p.custo?.custoTotal === undefined ? 'Ficha incompleta' : `Custo R$ ${p.custo.custoTotal.toFixed(2)}${p.custo.margemPercentual === null ? '' : ` · Margem ${p.custo.margemPercentual.toFixed(1)}%`}`}
                      </p>
                      <span className={`inline-flex min-h-9 items-center gap-2 text-sm ${p.disponivel ? 'text-[var(--action-positive-foreground)]' : 'text-[var(--action-warning-outline)]'}`}><span className={`size-2 rounded-full ${p.disponivel ? 'bg-[var(--action-positive)]' : 'bg-[var(--action-warning-outline)]'}`} aria-hidden="true" />{p.disponivel ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  </div>

                  <details className="relative sm:justify-self-end">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-[var(--radius)] border border-border px-4 text-sm font-medium outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring">Ações</summary>
                    <div className="absolute right-0 z-10 mt-2 grid min-w-44 gap-1 rounded-[var(--radius)] border bg-background p-2 shadow-sm">
                      <Button type="button" intent="informational" appearance="ghost" className="justify-start" aria-label={`Editar produto ${p.nome}`} onClick={() => { setEditProduto(p); setFormOpen(true) }}><Pencil aria-hidden="true" /> Editar</Button>
                      <Link href={`/admin/estoque?produtoId=${p.id}`} className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Estoque</Link>
                      <Button type="button" intent={p.disponivel ? 'warning' : 'positive'} appearance="ghost" className="justify-start" onClick={() => handleToggleProduto(p)}>{p.disponivel ? 'Desativar' : 'Ativar'}</Button>
                      <Button type="button" intent="destructive" appearance="ghost" className="justify-start" aria-label={`Excluir produto ${p.nome}`} onClick={() => handleRemoveProduto(p)}>Excluir</Button>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedCategory ? (
        <ProdutoForm
          key={editProduto?.id ?? 'new'}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          categoriaId={selectedCategory.id}
          produto={editProduto}
        />
      ) : null}
    </AdminPage>
  )
}
