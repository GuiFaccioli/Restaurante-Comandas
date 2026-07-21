'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminEmptyState, AdminPage, AdminPageHeader, AdminPanel, AdminStatsGrid, AdminStatCard } from '@/components/admin/admin-page'
import {
  criarInsumo,
  salvarFichaTecnica,
} from '@/lib/actions/estoque'
import { UNIDADES_BASE, UNIDADES_COMPRA, type UnidadeBase } from '@/lib/stock/units'

type Insumo = {
  id: string
  nome: string
  unidadeBase: string
  unidadeCompra: string
  estoqueAtual: string
  estoqueIdeal: string
  estoqueMinimo: string
}
type Produto = { id: string; nome: string; categoriaNome: string }
type Ficha = { produtoId: string; insumoId: string; quantidade: string }
type RecipeRow = { insumoId: string; quantidade: string }

function formatQuantity(value: string, unit: string) {
  const number = Number(value)
  return `${Number.isInteger(number) ? number : number.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} ${unit}`
}

export function EstoqueAdminClient({
  insumos,
  produtos,
  fichas,
  initialProdutoId,
}: {
  insumos: Insumo[]
  produtos: Produto[]
  fichas: Ficha[]
  initialProdutoId: string
}) {
  const router = useRouter()
  const [selectedProdutoId, setSelectedProdutoId] = useState(initialProdutoId || produtos[0]?.id || '')
  const [rows, setRows] = useState<RecipeRow[]>(() => {
    const selected = initialProdutoId || produtos[0]?.id
    return fichas.filter((item) => item.produtoId === selected).map(({ insumoId, quantidade }) => ({ insumoId, quantidade }))
  })
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newIngredient, setNewIngredient] = useState({ nome: '', unidadeBase: 'g' as UnidadeBase, unidadeCompra: 'kg', estoqueAtual: '', estoqueIdeal: '', estoqueMinimo: '' })

  const lowStock = insumos.filter((item) => Number(item.estoqueAtual) <= Number(item.estoqueMinimo)).length
  const configuredProducts = new Set(fichas.map((item) => item.produtoId)).size
  const selectedProduct = produtos.find((item) => item.id === selectedProdutoId)

  const availableIngredients = useMemo(
    () => insumos.filter((item) => !rows.some((row) => row.insumoId === item.id)),
    [insumos, rows]
  )

  function selectProduct(id: string) {
    setSelectedProdutoId(id)
    setRows(fichas.filter((item) => item.produtoId === id).map(({ insumoId, quantidade }) => ({ insumoId, quantidade })))
  }

  async function handleCreateIngredient() {
    setCreating(true)
    try {
      await criarInsumo(newIngredient)
      setNewIngredient({ nome: '', unidadeBase: 'g', unidadeCompra: 'kg', estoqueAtual: '', estoqueIdeal: '', estoqueMinimo: '' })
      router.refresh()
      toast.success('Insumo criado. Agora você pode adicioná-lo à ficha técnica.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar o insumo.')
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveRecipe() {
    if (!selectedProdutoId) return
    setSavingRecipe(true)
    try {
      await salvarFichaTecnica(selectedProdutoId, rows)
      router.refresh()
      toast.success('Ficha técnica salva.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a ficha técnica.')
    } finally {
      setSavingRecipe(false)
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Estoque"
        description="Cadastre insumos, acompanhe alertas e configure o consumo de cada produto sem complicar o cadastro do cardápio."
      />

      <AdminStatsGrid className="xl:grid-cols-3">
        <AdminStatCard label="Insumos" value={insumos.length} detail="Itens controlados no estoque." />
        <AdminStatCard label="Fichas técnicas" value={configuredProducts} detail="Produtos ligados a uma receita." />
        <AdminStatCard label="Atenção" value={lowStock} detail="Insumos no mínimo ou abaixo dele." tone={lowStock > 0 ? 'warning' : 'success'} />
      </AdminStatsGrid>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AdminPanel title="Novo insumo" description="Use a unidade de compra que sua equipe já conhece; o sistema converte internamente.">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="insumo-nome">Nome</Label>
              <Input id="insumo-nome" value={newIngredient.nome} onChange={(e) => setNewIngredient({ ...newIngredient, nome: e.target.value })} placeholder="Ex.: Muçarela" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="insumo-unidade-base">Unidade de estoque</Label>
                <select id="insumo-unidade-base" className="min-h-11 w-full rounded-[var(--radius)] border bg-background px-3 text-sm" value={newIngredient.unidadeBase} onChange={(e) => setNewIngredient({ ...newIngredient, unidadeBase: e.target.value as UnidadeBase })}>
                  {UNIDADES_BASE.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="insumo-unidade-compra">Compro em</Label>
                <select id="insumo-unidade-compra" className="min-h-11 w-full rounded-[var(--radius)] border bg-background px-3 text-sm" value={newIngredient.unidadeCompra} onChange={(e) => setNewIngredient({ ...newIngredient, unidadeCompra: e.target.value })}>
                  {UNIDADES_COMPRA.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {([['estoqueAtual', 'Estoque atual'], ['estoqueIdeal', 'Estoque ideal'], ['estoqueMinimo', 'Estoque mínimo']] as const).map(([field, label]) => (
                <div className="space-y-1" key={field}>
                  <Label htmlFor={`insumo-${field}`}>{label}</Label>
                  <Input id={`insumo-${field}`} inputMode="decimal" value={newIngredient[field]} onChange={(e) => setNewIngredient({ ...newIngredient, [field]: e.target.value })} placeholder="0" />
                </div>
              ))}
            </div>
            <Button type="button" intent="positive" appearance="solid" className="min-h-11 w-full" aria-busy={creating} disabled={creating || !newIngredient.nome.trim()} onClick={handleCreateIngredient}>
              <Plus aria-hidden="true" /> Criar insumo
            </Button>
          </div>
        </AdminPanel>

        <AdminPanel title="Ficha técnica" description="Defina quanto de cada insumo é usado em uma unidade do produto.">
          {!produtos.length ? <AdminEmptyState title="Cadastre um produto primeiro" description="A ficha técnica será ligada a um produto do cardápio." /> : (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="ficha-produto">Produto</Label>
                <select id="ficha-produto" className="min-h-11 w-full rounded-[var(--radius)] border bg-background px-3 text-sm" value={selectedProdutoId} onChange={(e) => selectProduct(e.target.value)}>
                  {produtos.map((product) => <option key={product.id} value={product.id}>{product.nome} · {product.categoriaNome}</option>)}
                </select>
              </div>
              {selectedProduct ? <p className="rounded-[var(--radius)] border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">Cada quantidade abaixo representa o consumo para uma unidade de <strong className="text-foreground">{selectedProduct.nome}</strong>.</p> : null}
              {rows.map((row, index) => {
                const ingredient = insumos.find((item) => item.id === row.insumoId)
                return <div className="grid grid-cols-[minmax(0,1fr)_110px_auto] items-end gap-2" key={`${row.insumoId}-${index}`}>
                  <div className="space-y-1"><Label htmlFor={`ficha-insumo-${index}`}>Insumo</Label><select id={`ficha-insumo-${index}`} className="min-h-11 w-full rounded-[var(--radius)] border bg-background px-3 text-sm" value={row.insumoId} onChange={(e) => setRows(rows.map((current, currentIndex) => currentIndex === index ? { ...current, insumoId: e.target.value } : current))}><option value="">Selecione</option>{insumos.map((item) => <option key={item.id} value={item.id} disabled={rows.some((other, otherIndex) => otherIndex !== index && other.insumoId === item.id)}>{item.nome}</option>)}</select></div>
                  <div className="space-y-1"><Label htmlFor={`ficha-quantidade-${index}`}>Quantidade</Label><Input id={`ficha-quantidade-${index}`} inputMode="decimal" value={row.quantidade} onChange={(e) => setRows(rows.map((current, currentIndex) => currentIndex === index ? { ...current, quantidade: e.target.value } : current))} placeholder="0" /></div>
                  <Button type="button" intent="destructive" appearance="ghost" size="icon" className="size-11" aria-label={`Remover ${ingredient?.nome ?? 'insumo'}`} onClick={() => setRows(rows.filter((_, currentIndex) => currentIndex !== index))}><Trash2 aria-hidden="true" /></Button>
                </div>
              })}
              <div className="flex flex-wrap gap-2">
                <Button type="button" intent="neutral" appearance="outline" className="min-h-11" disabled={!availableIngredients.length} onClick={() => setRows([...rows, { insumoId: availableIngredients[0]?.id ?? '', quantidade: '' }])}><Plus aria-hidden="true" /> Adicionar insumo</Button>
                <Button type="button" intent="positive" appearance="solid" className="min-h-11" aria-busy={savingRecipe} disabled={savingRecipe || rows.some((row) => !row.insumoId || !row.quantidade)} onClick={handleSaveRecipe}><Save aria-hidden="true" /> Salvar ficha</Button>
              </div>
            </div>
          )}
        </AdminPanel>
      </div>

      <AdminPanel title="Estoque atual" description="As quantidades são exibidas na unidade base para evitar conversões manuais.">
        {insumos.length === 0 ? <AdminEmptyState title="Nenhum insumo cadastrado" description="Comece pelo cadastro de um ingrediente usado nas suas receitas." /> : <div className="divide-y rounded-[var(--radius)] border">{insumos.map((item) => <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" key={item.id}><div><p className="font-medium">{item.nome}</p><p className="text-sm text-muted-foreground">Compra em {item.unidadeCompra} · base em {item.unidadeBase}</p></div><div className="text-left sm:text-right"><p className="font-semibold">{formatQuantity(item.estoqueAtual, item.unidadeBase)}</p><p className={`text-xs ${Number(item.estoqueAtual) <= Number(item.estoqueMinimo) ? 'text-[var(--action-warning-outline)]' : 'text-muted-foreground'}`}>{Number(item.estoqueAtual) <= Number(item.estoqueMinimo) ? 'Atenção: abaixo do mínimo' : `Ideal: ${formatQuantity(item.estoqueIdeal, item.unidadeBase)}`}</p></div></div>)}</div>}
      </AdminPanel>
    </AdminPage>
  )
}
