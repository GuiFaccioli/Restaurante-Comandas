'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  alternarItemEstoqueAtivo,
  criarItemEstoque,
  editarItemEstoque,
  realizarContagemEstoque,
  registrarEntradaEstoque,
  registrarPerdaEstoque,
  removerItemEstoque,
  salvarFichaTecnica,
} from '@/lib/actions/estoque'
import { getReplenishmentItems, getStockStatus } from '@/lib/stock/replenishment'

type Item = {
  id: string
  nome: string
  categoriaId: string | null
  unidadeBase: string
  unidadeCompra: string
  fatorCompraParaBase: string
  estoqueAtual: string
  estoqueMinimo: string | null
  estoqueIdeal: string | null
  custoUnitario: string | null
  ativo: boolean
}
type Category = { id: string; nome: string }
type Product = { id: string; nome: string; categoriaNome: string }
type Recipe = { produtoId: string; itemEstoqueId: string; quantidade: string }
type Movement = { id: string; itemEstoqueId: string; tipo: string; quantidade: string; saldoResultante: string; criadoEm: Date; observacao: string | null; motivo: string | null }
export type InventoryView = 'itens' | 'compras' | 'movimentacoes' | 'ficha'

const baseUnits = ['g', 'ml', 'unidade'] as const
const purchaseUnits = ['g', 'kg', 'ml', 'l', 'unidade'] as const

function money(value: string | null) {
  if (value === null) return '—'
  return `R$ ${Number(value).toFixed(4).replace('.', ',')}`
}

function quantity(value: string | number | null, unit: string) {
  if (value === null) return 'Configure o estoque ideal'
  return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${unit}`
}

function statusLabel(status: ReturnType<typeof getStockStatus>) {
  return ({ sem_estoque: 'Sem estoque', estoque_baixo: 'Estoque baixo', estoque_normal: 'Estoque normal', sem_controle: 'Sem controle de reposição', inativo: 'Inativo' })[status]
}

export function EstoqueAdminClient({
  itensEstoque,
  categorias,
  produtos,
  fichas,
  movimentos,
  initialProdutoId,
  view,
}: {
  itensEstoque: Item[]
  categorias: Category[]
  produtos: Product[]
  fichas: Recipe[]
  movimentos: Movement[]
  initialProdutoId: string
  view: InventoryView
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Item | null>(null)
  const [busy, setBusy] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(initialProdutoId || produtos[0]?.id || '')
  const [recipeRows, setRecipeRows] = useState(() => fichas.filter((item) => item.produtoId === (initialProdutoId || produtos[0]?.id)).map(({ itemEstoqueId, quantidade }) => ({ itemEstoqueId, quantidade })))
  const [newItem, setNewItem] = useState({ nome: '', categoriaId: '', unidadeBase: 'g', unidadeCompra: 'kg', estoqueMinimo: '', estoqueIdeal: '' })

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return term ? itensEstoque.filter((item) => item.nome.toLocaleLowerCase('pt-BR').includes(term)) : itensEstoque
  }, [itensEstoque, search])
  const shopping = useMemo(() => getReplenishmentItems(itensEstoque), [itensEstoque])
  const activeItems = itensEstoque.filter((item) => item.ativo)

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true)
    try { await action(); toast.success(success); router.refresh() } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a operação.') } finally { setBusy(false) }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(async () => { await criarItemEstoque({ ...newItem, categoriaId: newItem.categoriaId || null }); setNewItem({ nome: '', categoriaId: '', unidadeBase: 'g', unidadeCompra: 'kg', estoqueMinimo: '', estoqueIdeal: '' }) }, 'Item de estoque cadastrado.')
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    await run(async () => { await editarItemEstoque(editing.id, { nome: editing.nome, categoriaId: editing.categoriaId, unidadeBase: editing.unidadeBase, unidadeCompra: editing.unidadeCompra, estoqueMinimo: editing.estoqueMinimo ?? undefined, estoqueIdeal: editing.estoqueIdeal ?? undefined }); setEditing(null) }, 'Item de estoque atualizado.')
  }

  async function handleMovement(item: Pick<Item, 'id' | 'unidadeCompra' | 'ativo'>, type: 'entrada' | 'perda' | 'contagem') {
    const quantityValue = window.prompt(`Quantidade em ${item.unidadeCompra}`)
    if (!quantityValue) return
    const key = crypto.randomUUID()
    if (type === 'entrada') {
      const cost = window.prompt('Custo total da compra (opcional)') ?? undefined
      await run(() => registrarEntradaEstoque(item.id, quantityValue, key, cost), 'Entrada registrada.')
    } else if (type === 'perda') {
      const reason = window.prompt('Motivo da perda')
      if (!reason) return
      await run(() => registrarPerdaEstoque(item.id, quantityValue, reason, key), 'Perda registrada.')
    } else {
      await run(() => realizarContagemEstoque(item.id, quantityValue, key), 'Contagem registrada.')
    }
  }

  async function handleRemove(item: Item) {
    const confirmation = window.prompt(`Digite exatamente "${item.nome}" para remover ou inativar`)
    if (confirmation === null) return
    await run(() => removerItemEstoque(item.id, confirmation), 'Item processado.')
  }

  async function handleRecipeSave() {
    await run(() => salvarFichaTecnica(selectedProduct, recipeRows), 'Ficha técnica salva.')
  }

  const title = view === 'itens' ? 'Itens de estoque' : view === 'compras' ? 'Lista de compras' : view === 'movimentacoes' ? 'Movimentações' : 'Ficha técnica'

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{view === 'compras' ? 'Veja somente o que precisa ser reposto.' : 'Controle o cadastro, saldo e composição do restaurante.'}</p></div>

    {view === 'itens' && <>
      <form onSubmit={handleCreate} className="grid gap-3 rounded-[var(--radius)] border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm sm:col-span-2">Nome<input required value={newItem.nome} onChange={(event) => setNewItem({ ...newItem, nome: event.target.value })} className="min-h-11 rounded-[var(--radius)] border bg-background px-3" placeholder="Ex.: Farinha" /></label>
        <label className="grid gap-1 text-sm">Categoria<select value={newItem.categoriaId} onChange={(event) => setNewItem({ ...newItem, categoriaId: event.target.value })} className="min-h-11 rounded-[var(--radius)] border bg-background px-3"><option value="">Sem categoria</option>{categorias.map((category) => <option key={category.id} value={category.id}>{category.nome}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Unidade base<select value={newItem.unidadeBase} onChange={(event) => setNewItem({ ...newItem, unidadeBase: event.target.value })} className="min-h-11 rounded-[var(--radius)] border bg-background px-3">{baseUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Unidade de compra<select value={newItem.unidadeCompra} onChange={(event) => setNewItem({ ...newItem, unidadeCompra: event.target.value })} className="min-h-11 rounded-[var(--radius)] border bg-background px-3">{purchaseUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Estoque mínimo<input inputMode="decimal" value={newItem.estoqueMinimo} onChange={(event) => setNewItem({ ...newItem, estoqueMinimo: event.target.value })} className="min-h-11 rounded-[var(--radius)] border bg-background px-3" placeholder="Opcional" /></label>
        <label className="grid gap-1 text-sm">Estoque ideal<input inputMode="decimal" value={newItem.estoqueIdeal} onChange={(event) => setNewItem({ ...newItem, estoqueIdeal: event.target.value })} className="min-h-11 rounded-[var(--radius)] border bg-background px-3" placeholder="Opcional" /></label>
        <button disabled={busy} className="min-h-11 self-end rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Novo item</button>
      </form>
      <label className="grid max-w-md gap-1 text-sm">Buscar item<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 rounded-[var(--radius)] border bg-background px-3" placeholder="Nome do item" /></label>
      <div className="space-y-3">{filtered.map((item) => { const status = getStockStatus(item); return <article key={item.id} className="grid gap-3 rounded-[var(--radius)] border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_repeat(4,minmax(7rem,auto))_auto] lg:items-center"><div><div className="flex items-center gap-2"><h2 className="font-semibold">{item.nome}</h2><span className="rounded-full bg-muted px-2 py-1 text-xs">{statusLabel(status)}</span></div><p className="mt-1 text-sm text-muted-foreground">Atual: {quantity(item.estoqueAtual, item.unidadeBase)} · Compra: {item.unidadeCompra}</p></div><div><p className="text-xs text-muted-foreground">Mínimo</p><p>{quantity(item.estoqueMinimo, item.unidadeBase)}</p></div><div><p className="text-xs text-muted-foreground">Ideal</p><p>{quantity(item.estoqueIdeal, item.unidadeBase)}</p></div><div><p className="text-xs text-muted-foreground">Custo médio</p><p>{money(item.custoUnitario)} / {item.unidadeBase}</p></div><div><p className="text-xs text-muted-foreground">Status</p><p>{item.ativo ? 'Ativo' : 'Inativo'}</p></div><div className="flex flex-wrap gap-2 lg:justify-end"><button onClick={() => handleMovement(item, 'entrada')} disabled={!item.ativo || busy} className="rounded-[var(--radius)] border px-3 py-2 text-sm">Entrada</button><button onClick={() => handleMovement(item, 'perda')} disabled={!item.ativo || busy} className="rounded-[var(--radius)] border px-3 py-2 text-sm">Registrar perda</button><button onClick={() => handleMovement(item, 'contagem')} disabled={!item.ativo || busy} className="rounded-[var(--radius)] border px-3 py-2 text-sm">Contagem</button><button onClick={() => setEditing(item)} disabled={busy} className="rounded-[var(--radius)] border px-3 py-2 text-sm">Editar</button><button onClick={() => handleRemove(item)} disabled={busy || !item.ativo} className="rounded-[var(--radius)] border px-3 py-2 text-sm">Remover</button><button onClick={() => run(() => alternarItemEstoqueAtivo(item.id), item.ativo ? 'Item inativado.' : 'Item ativado.')} disabled={busy} className="rounded-[var(--radius)] border px-3 py-2 text-sm">{item.ativo ? 'Inativar' : 'Ativar'}</button></div></article> })}</div>
      {editing && <form onSubmit={handleEdit} className="space-y-3 rounded-[var(--radius)] border border-primary bg-card p-4"><h2 className="font-semibold">Editar item: {editing.nome}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input required value={editing.nome} onChange={(event) => setEditing({ ...editing, nome: event.target.value })} className="min-h-11 rounded-[var(--radius)] border bg-background px-3" /><select value={editing.unidadeBase} onChange={(event) => setEditing({ ...editing, unidadeBase: event.target.value })} className="min-h-11 rounded-[var(--radius)] border bg-background px-3">{baseUnits.map((unit) => <option key={unit}>{unit}</option>)}</select><select value={editing.unidadeCompra} onChange={(event) => setEditing({ ...editing, unidadeCompra: event.target.value })} className="min-h-11 rounded-[var(--radius)] border bg-background px-3">{purchaseUnits.map((unit) => <option key={unit}>{unit}</option>)}</select><input value={editing.estoqueMinimo ?? ''} onChange={(event) => setEditing({ ...editing, estoqueMinimo: event.target.value || null })} className="min-h-11 rounded-[var(--radius)] border bg-background px-3" placeholder="Mínimo" /><input value={editing.estoqueIdeal ?? ''} onChange={(event) => setEditing({ ...editing, estoqueIdeal: event.target.value || null })} className="min-h-11 rounded-[var(--radius)] border bg-background px-3" placeholder="Ideal" /></div><div className="flex gap-2"><button disabled={busy} className="rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Salvar</button><button type="button" onClick={() => setEditing(null)} className="rounded-[var(--radius)] border px-4 py-2 text-sm">Cancelar</button></div></form>}
    </>}

    {view === 'compras' && <div className="space-y-3">{shopping.length === 0 ? <div className="rounded-[var(--radius)] border border-dashed p-8 text-center"><h2 className="font-semibold">Nenhum item precisa de reposição.</h2><p className="mt-1 text-sm text-muted-foreground">Os itens configurados estão acima do estoque mínimo.</p></div> : shopping.map((item) => <article key={item.id} className="grid gap-3 rounded-[var(--radius)] border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div><h2 className="font-semibold">{item.nome}</h2><p className="text-sm text-muted-foreground">Atual: {quantity(item.estoqueAtual, item.unidadeBase)} · Mínimo: {quantity(item.estoqueMinimo, item.unidadeBase)} · Ideal: {quantity(item.estoqueIdeal, item.unidadeBase)}</p></div><div className="text-sm"><span className="font-semibold">{item.quantidadeSugeridaCompra === null ? 'Configure o estoque ideal' : `Comprar: ${item.quantidadeSugeridaCompra.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${item.unidadeCompra}`}</span></div><button onClick={() => handleMovement(item, 'entrada')} disabled={busy} className="rounded-[var(--radius)] bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Registrar entrada</button></article>)}</div>}

    {view === 'movimentacoes' && <div className="divide-y rounded-[var(--radius)] border bg-card">{movimentos.map((movement) => { const item = itensEstoque.find((candidate) => candidate.id === movement.itemEstoqueId); return <div key={movement.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_12rem]"><div><p className="font-medium">{item?.nome ?? 'Item removido'}</p><p className="text-xs text-muted-foreground">{movement.observacao ?? movement.motivo ?? 'Movimentação registrada'}</p></div><span className="text-sm">{movement.tipo}</span><span className="text-sm">{Number(movement.quantidade).toLocaleString('pt-BR')} · saldo {Number(movement.saldoResultante).toLocaleString('pt-BR')}</span><time className="text-sm text-muted-foreground">{new Date(movement.criadoEm).toLocaleString('pt-BR')}</time></div> })}</div>}

    {view === 'ficha' && <div className="space-y-4"><label className="grid max-w-lg gap-1 text-sm">Produto<select value={selectedProduct} onChange={(event) => { setSelectedProduct(event.target.value); setRecipeRows(fichas.filter((item) => item.produtoId === event.target.value).map(({ itemEstoqueId, quantidade }) => ({ itemEstoqueId, quantidade }))) }} className="min-h-11 rounded-[var(--radius)] border bg-background px-3">{produtos.map((product) => <option key={product.id} value={product.id}>{product.nome}</option>)}</select></label><div className="space-y-3">{recipeRows.map((row, index) => <div key={`${row.itemEstoqueId}-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"><select value={row.itemEstoqueId} onChange={(event) => setRecipeRows(recipeRows.map((current, currentIndex) => currentIndex === index ? { ...current, itemEstoqueId: event.target.value } : current))} className="min-h-11 rounded-[var(--radius)] border bg-background px-3">{activeItems.map((item) => <option key={item.id} value={item.id}>{item.nome} ({item.unidadeBase})</option>)}</select><input value={row.quantidade} onChange={(event) => setRecipeRows(recipeRows.map((current, currentIndex) => currentIndex === index ? { ...current, quantidade: event.target.value } : current))} className="min-h-11 rounded-[var(--radius)] border bg-background px-3" placeholder="Quantidade base" /><button type="button" onClick={() => setRecipeRows(recipeRows.filter((_, currentIndex) => currentIndex !== index))} className="rounded-[var(--radius)] border px-3 py-2 text-sm">Remover</button></div>)}</div><div className="flex gap-2"><button type="button" onClick={() => setRecipeRows([...recipeRows, { itemEstoqueId: activeItems.find((item) => !recipeRows.some((row) => row.itemEstoqueId === item.id))?.id ?? '', quantidade: '' }])} className="rounded-[var(--radius)] border px-4 py-2 text-sm">Adicionar item</button><button type="button" onClick={handleRecipeSave} disabled={busy || !selectedProduct} className="rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Salvar ficha</button></div></div>}
  </div>
}
