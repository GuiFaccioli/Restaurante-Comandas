'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, ChevronDown, Pencil, Plus, Save, Search, Trash2 } from 'lucide-react'

import { AdminEmptyState, AdminPage } from '@/components/admin/admin-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrencyInput } from '@/lib/money'
import { adicionarItemManualListaCompra, ajustarEstoqueAtual, confirmarItemListaCompra, criarInsumo, editarInsumo, realizarContagemEstoque, registrarEntradaEstoque, registrarPerdaEstoque, removerInsumo, salvarFichaTecnica } from '@/lib/actions/estoque'
import { movementUnitsFor, quantidadeBaseParaUnidade } from '@/lib/stock/units'

type Insumo = { id: string; nome: string; unidadeBase: string; unidadeCompra: string; fatorCompraParaBase: string; estoqueAtual: string; estoqueIdeal: string; estoqueMinimo: string; custoUnitario: string | null }

type Produto = { id: string; nome: string; categoriaNome: string }
type Ficha = { produtoId: string; insumoId: string; quantidade: string }
type RecipeRow = { insumoId: string; quantidade: string }
type InventoryView = 'estoque' | 'ficha' | 'lista'
type ShoppingListItem = { id: string; kind: string; nome: string; unidade: string; quantidadeSugerida: string }
type ManualOperationIntent = { key: string; fingerprint: string }
type ManualOperationPayload = {
  tipo: 'entrada' | 'perda' | 'contagem'
  insumoId: string
  quantidade: string
  custo: string
  motivo: string
  observacao: string
  unidade?: string
}

function manualOperationFingerprint(payload: ManualOperationPayload) {
  return JSON.stringify([
    payload.tipo,
    payload.insumoId,
    payload.quantidade,
    payload.custo,
    payload.motivo,
    payload.observacao,
    payload.unidade ?? '',
  ])
}

function intentForFingerprint(
  current: ManualOperationIntent | null | undefined,
  fingerprint: string,
): ManualOperationIntent {
  if (current?.fingerprint === fingerprint) return current
  return { key: crypto.randomUUID(), fingerprint }
}

function formatQuantity(value: string, unit: string) {
  const number = Number(value)
  return `${Number.isInteger(number) ? number : number.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} ${unit}`
}

function formatIngredientCost(item: Insumo) {
  if (item.custoUnitario === null) return '—'
  const cost = Number(item.custoUnitario) * Number(item.fatorCompraParaBase)
  return cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function IngredientPicker({
  id,
  value,
  ingredients,
  excludedIds,
  onChange,
}: {
  id: string
  value: string
  ingredients: Insumo[]
  excludedIds: string[]
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = ingredients.find((item) => item.id === value)
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const options = ingredients.filter((item) => {
    if (excludedIds.includes(item.id) && item.id !== value) return false
    return !normalizedQuery || item.nome.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
  })

  function selectIngredient(id: string) {
    onChange(id)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <Button
        type="button"
        id={id}
        intent="neutral"
        appearance="outline"
        className="min-h-11 w-full justify-between font-normal"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selected ? `${selected.nome} · ${selected.unidadeBase}` : 'Selecione'}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
      </Button>
      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-[var(--radius)] border bg-background p-2 shadow-sm">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              aria-label="Buscar insumo"
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar insumo"
            />
          </div>
        <div className="mt-2 max-h-52 overflow-y-auto" role="listbox" aria-label="Insumos disponíveis">
            {options.length === 0 ? <p className="px-2 py-3 text-sm text-muted-foreground">Nenhum insumo encontrado.</p> : options.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === value}
                className="flex min-h-10 w-full items-center justify-between rounded-md px-2 text-left text-sm hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => selectIngredient(item.id)}
              >
                <span>{item.nome} · {item.unidadeBase}</span>
                {item.id === value ? <Check aria-hidden="true" className="size-4" /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ShoppingListView({ shoppingListItems }: { shoppingListItems: ShoppingListItem[] }) {
  const router = useRouter()
  const [confirmingItem, setConfirmingItem] = useState<ShoppingListItem | null>(null)
  const [receivedQuantity, setReceivedQuantity] = useState('')
  const [receivedUnit, setReceivedUnit] = useState('')
  const [manualItem, setManualItem] = useState({ nome: '', quantidade: '', unidade: 'kg' })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const intentsRef = useRef<Record<string, ManualOperationIntent>>({})
  const manualItemIntentRef = useRef<ManualOperationIntent | null>(null)
  const orderedItems = useMemo(
    () => [...shoppingListItems].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [shoppingListItems],
  )
  const shoppingListText = orderedItems
    .map((item) => `${item.nome} - ${formatQuantity(item.quantidadeSugerida, item.unidade)}`)
    .join('\n')

  function receiptUnitsFor(item: ShoppingListItem) {
    const baseUnit = item.unidade === 'kg' ? 'g' : item.unidade === 'l' ? 'ml' : item.unidade
    return movementUnitsFor(baseUnit)
  }

  function openConfirmation(item: ShoppingListItem) {
    if (busy) return
    setActionError('')
    setConfirmingItem(item)
    setReceivedQuantity(item.quantidadeSugerida)
    setReceivedUnit(item.unidade)
  }

  async function completeItem(item: ShoppingListItem, quantity?: string, unit?: string) {
    if (busy) return
    const fingerprint = JSON.stringify([item.id, quantity ?? 'manual', unit ?? ''])
    const intent = intentForFingerprint(intentsRef.current[item.id], fingerprint)
    intentsRef.current[item.id] = intent
    setBusy(true)
    setActionError('')
    try {
      await confirmarItemListaCompra({
        itemId: item.id,
        ...(item.kind === 'automatic' ? { receivedQuantity: quantity, receivedUnit: unit } : {}),
        idempotencyKey: intent.key,
      })
      delete intentsRef.current[item.id]
      setConfirmingItem(null)
      router.refresh()
      toast.success('Item concluído.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível concluir o item.'
      setActionError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function addManualItem() {
    if (busy) return
    const fingerprint = JSON.stringify([manualItem.nome, manualItem.quantidade, manualItem.unidade])
    const intent = intentForFingerprint(manualItemIntentRef.current, fingerprint)
    manualItemIntentRef.current = intent
    setBusy(true)
    setActionError('')
    try {
      await adicionarItemManualListaCompra({ ...manualItem, idempotencyKey: intent.key })
      manualItemIntentRef.current = null
      setManualItem({ nome: '', quantidade: '', unidade: 'kg' })
      router.refresh()
      toast.success('Item adicionado à lista.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível adicionar o item.'
      setActionError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function copyShoppingList() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível')
      await navigator.clipboard.writeText(shoppingListText)
      toast.success('Lista copiada.')
    } catch {
      const message = 'Não foi possível copiar a lista.'
      setActionError(message)
      toast.error(message)
    }
  }

  return <div className="mt-5 space-y-6">
    {actionError ? <p role="alert" className="rounded-[var(--radius)] border border-[var(--action-destructive-outline)] p-3 text-sm text-[var(--action-destructive-foreground)]">{actionError}</p> : null}
    <section className="space-y-3">
      <div><h2 className="text-base font-semibold">Adicionar item manual</h2><p className="text-sm text-muted-foreground">Adicione compras que não dependem do saldo em estoque.</p></div>
      <div className="grid gap-3 rounded-[var(--radius)] border bg-card p-4 sm:grid-cols-4 sm:items-end"><div className="space-y-1"><Label htmlFor="lista-manual-nome">Nome</Label><Input id="lista-manual-nome" value={manualItem.nome} disabled={busy} onChange={(event) => setManualItem({ ...manualItem, nome: event.target.value })} /></div><div className="space-y-1"><Label htmlFor="lista-manual-quantidade">Quantidade</Label><Input id="lista-manual-quantidade" inputMode="decimal" value={manualItem.quantidade} disabled={busy} onChange={(event) => setManualItem({ ...manualItem, quantidade: event.target.value })} /></div><div className="space-y-1"><Label htmlFor="lista-manual-unidade">Unidade</Label><select id="lista-manual-unidade" className="min-h-11 w-full rounded-[var(--radius)] border bg-background px-3 text-sm" value={manualItem.unidade} disabled={busy} onChange={(event) => setManualItem({ ...manualItem, unidade: event.target.value })}><option value="kg">Quilo</option><option value="g">Gramas</option><option value="unidade">Unidade</option><option value="ml">Mililitros</option><option value="l">Litros</option></select></div><Button type="button" intent="positive" appearance="solid" disabled={busy || !manualItem.nome.trim() || !manualItem.quantidade} onClick={addManualItem}>Adicionar item</Button></div>
    </section>
    <section className="space-y-3" aria-label="Itens da lista de compras">
      <div><h2 className="text-base font-semibold">Itens para comprar</h2><p className="text-sm text-muted-foreground">Reposições automáticas e itens manuais em uma única lista.</p></div>
      {orderedItems.length === 0 ? <AdminEmptyState title="Nenhum item pendente" description="Os itens abaixo do mínimo e as compras manuais aparecerão aqui." /> : <div className="divide-y rounded-[var(--radius)] border bg-card">{orderedItems.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="font-medium">{item.nome}</p><p className="text-sm text-muted-foreground">{item.kind === 'automatic' ? 'Sugestão: ' : ''}{formatQuantity(item.quantidadeSugerida, item.unidade)}</p></div><Button type="button" intent={item.kind === 'automatic' ? 'positive' : 'neutral'} appearance={item.kind === 'automatic' ? 'solid' : 'outline'} disabled={busy} onClick={() => item.kind === 'automatic' ? openConfirmation(item) : void completeItem(item)}>{item.kind === 'automatic' ? 'Confirmar entrada' : 'Concluir'}</Button></div>)}</div>}
    </section>
    <Dialog open={confirmingItem !== null} onOpenChange={(open) => { if (!open && !busy) setConfirmingItem(null) }}><DialogContent><DialogHeader><DialogTitle>Confirmar entrada</DialogTitle><DialogDescription>Revise a quantidade recebida antes de atualizar o saldo.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor="lista-quantidade-recebida">Quantidade recebida</Label><Input id="lista-quantidade-recebida" inputMode="decimal" value={receivedQuantity} disabled={busy} onChange={(event) => setReceivedQuantity(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="lista-unidade-recebida">Unidade recebida</Label><select id="lista-unidade-recebida" className="min-h-11 w-full rounded-[var(--radius)] border bg-background px-3 text-sm" value={receivedUnit} disabled={busy} onChange={(event) => setReceivedUnit(event.target.value)}>{confirmingItem ? receiptUnitsFor(confirmingItem).map((unit) => <option key={unit} value={unit}>{unit}</option>) : null}</select></div></div><DialogFooter><Button type="button" intent="destructive" appearance="outline" disabled={busy} onClick={() => setConfirmingItem(null)}>Cancelar</Button><Button type="button" intent="positive" appearance="solid" aria-busy={busy} disabled={busy || !receivedQuantity || !receivedUnit} onClick={() => { if (confirmingItem) void completeItem(confirmingItem, receivedQuantity, receivedUnit) }}>Confirmar</Button></DialogFooter></DialogContent></Dialog>
    <section className="space-y-2"><div><h2 className="text-base font-semibold">Texto da lista</h2><p className="text-sm text-muted-foreground">Copie e cole onde preferir.</p></div><textarea aria-label="Texto da lista de compras" readOnly value={shoppingListText} className="min-h-32 w-full rounded-[var(--radius)] border bg-muted/30 p-3 font-mono text-sm" /><Button type="button" intent="neutral" appearance="outline" disabled={!shoppingListText} onClick={() => void copyShoppingList()}>Copiar lista</Button></section>
  </div>
}

export function EstoqueAdminClient({ insumos, produtos, fichas, shoppingListItems, initialProdutoId, view }: { insumos: Insumo[]; produtos: Produto[]; fichas: Ficha[]; shoppingListItems: ShoppingListItem[]; initialProdutoId: string; view: InventoryView }) {
  const router = useRouter()
  const [selectedProdutoId, setSelectedProdutoId] = useState(initialProdutoId || produtos[0]?.id || '')
  const selectedProdutoIdRef = useRef(selectedProdutoId)
  const [rows, setRows] = useState<RecipeRow[]>(() => fichas.filter((item) => item.produtoId === (initialProdutoId || produtos[0]?.id)).map(({ insumoId, quantidade }) => ({ insumoId, quantidade })))
  const [creating, setCreating] = useState(false)
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [entryId, setEntryId] = useState<string | null>(null)
  const [entryValues, setEntryValues] = useState<Record<string, string>>({})
  const [entryUnits, setEntryUnits] = useState<Record<string, string>>({})
  const entryOperationIntentsRef = useRef<Record<string, ManualOperationIntent>>({})
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [stockValue, setStockValue] = useState('')
  const stockAdjustmentIntentRef = useRef<ManualOperationIntent | null>(null)
  const [movementType, setMovementType] = useState<'entrada' | 'perda' | 'contagem'>('entrada')
  const [movementIngredientId, setMovementIngredientId] = useState(insumos[0]?.id ?? '')
  const [movementUnit, setMovementUnit] = useState(insumos[0]?.unidadeCompra ?? 'unidade')
  const [movementQuantity, setMovementQuantity] = useState('')
  const [movementCost, setMovementCost] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [movementBusy, setMovementBusy] = useState(false)
  const movementOperationIntentRef = useRef<ManualOperationIntent | null>(null)
  const manualStockPendingRef = useRef(false)
  const movementPendingRef = useRef(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [newIngredient, setNewIngredient] = useState({ nome: '', unidade: 'kg', custoPorUnidade: '', estoqueMinimo: '', estoqueIdeal: '' })
  const [editingIngredient, setEditingIngredient] = useState<Insumo | null>(null)
  const [editIngredientValues, setEditIngredientValues] = useState({ nome: '', unidade: 'kg', custoPorUnidade: '', estoqueMinimo: '', estoqueIdeal: '' })
  const [deletingIngredient, setDeletingIngredient] = useState<Insumo | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [ingredientActionBusy, setIngredientActionBusy] = useState(false)
  const selectedProduct = produtos.find((item) => item.id === selectedProdutoId)
  const deletingIngredientUsage = deletingIngredient ? [...new Set(fichas.filter((item) => item.insumoId === deletingIngredient.id).map((item) => produtos.find((product) => product.id === item.produtoId)?.nome).filter(Boolean))] as string[] : []
  const availableIngredients = useMemo(() => insumos.filter((item) => !rows.some((row) => row.insumoId === item.id)), [insumos, rows])
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR')
  const filteredInsumos = useMemo(() => normalizedSearch ? insumos.filter((item) => item.nome.toLocaleLowerCase('pt-BR').includes(normalizedSearch)) : insumos, [insumos, normalizedSearch])
  const manualStockBusy = entryId !== null || movementBusy

  function openStockAdjustment(item: Insumo) {
    if (manualStockBusy) return
    stockAdjustmentIntentRef.current = null
    setEditingStockId(item.id)
    setStockValue(quantidadeBaseParaUnidade(
      item.estoqueAtual,
      item.unidadeCompra,
      item.unidadeBase,
    ))
  }

  function cancelStockAdjustment() {
    if (manualStockBusy) return
    stockAdjustmentIntentRef.current = null
    setEditingStockId(null)
  }

  function selectProduct(id: string) {
    if (savingRecipe) return
    selectedProdutoIdRef.current = id
    setSelectedProdutoId(id)
    setRows(fichas.filter((item) => item.produtoId === id).map(({ insumoId, quantidade }) => ({ insumoId, quantidade })))
  }

  async function handleCreateIngredient() {
    setCreating(true)
    try { await criarInsumo({ nome: newIngredient.nome, unidade: newIngredient.unidade, custoPorUnidade: newIngredient.custoPorUnidade, estoqueMinimo: newIngredient.estoqueMinimo, estoqueIdeal: newIngredient.estoqueIdeal }); setNewIngredient({ nome: '', unidade: 'kg', custoPorUnidade: '', estoqueMinimo: '', estoqueIdeal: '' }); router.refresh(); toast.success('Insumo cadastrado.') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível criar o insumo.') }
    finally { setCreating(false) }
  }

  function openIngredientEdit(item: Insumo) {
    const cost = Number(item.custoUnitario) * Number(item.fatorCompraParaBase)
    setEditingIngredient(item)
    setEditIngredientValues({
      nome: item.nome,
      unidade: item.unidadeCompra,
      custoPorUnidade: item.custoUnitario === null ? '' : cost.toFixed(2).replace('.', ','),
      estoqueMinimo: quantidadeBaseParaUnidade(item.estoqueMinimo, item.unidadeCompra, item.unidadeBase),
      estoqueIdeal: quantidadeBaseParaUnidade(item.estoqueIdeal, item.unidadeCompra, item.unidadeBase),
    })
  }

  async function handleEditIngredient() {
    if (!editingIngredient) return
    setIngredientActionBusy(true)
    try {
      await editarInsumo(editingIngredient.id, editIngredientValues)
      setEditingIngredient(null)
      router.refresh()
      toast.success('Insumo atualizado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o insumo.')
    } finally {
      setIngredientActionBusy(false)
    }
  }

  async function handleDeleteIngredient() {
    if (!deletingIngredient) return
    setIngredientActionBusy(true)
    try {
      await removerInsumo(deletingIngredient.id, deleteConfirmation)
      setDeletingIngredient(null)
      setDeleteConfirmation('')
      router.refresh()
      toast.success('Insumo removido.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir o insumo.')
    } finally {
      setIngredientActionBusy(false)
    }
  }

  async function handleSaveRecipe() {
    if (!selectedProdutoId) return
    const produtoId = selectedProdutoId
    setSavingRecipe(true)
    try { await salvarFichaTecnica(produtoId, rows); router.refresh(); toast.success('Ficha técnica salva.') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a ficha técnica.') }
    finally { setSavingRecipe(false) }
  }

  async function handleRemoveRecipeRow(index: number) {
    if (!selectedProdutoId) return
    const produtoId = selectedProdutoId
    const nextRows = rows.filter((_, currentIndex) => currentIndex !== index)
    const ingredientIds = nextRows.map((row) => row.insumoId)
    const hasInvalidRow = new Set(ingredientIds).size !== ingredientIds.length || nextRows.some((row) => {
      const quantity = Number(row.quantidade.replace(',', '.'))
      return !row.insumoId || !Number.isFinite(quantity) || quantity <= 0
    })
    if (hasInvalidRow) {
      toast.error('Conclua ou corrija os outros insumos antes de remover.')
      return
    }

    setSavingRecipe(true)
    try {
      await salvarFichaTecnica(produtoId, nextRows)
      if (selectedProdutoIdRef.current === produtoId) setRows(nextRows)
      router.refresh()
      toast.success('Insumo removido da ficha técnica.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover o insumo da ficha técnica.')
    } finally {
      setSavingRecipe(false)
    }
  }

  async function handleEntry(item: Insumo) {
    if (manualStockPendingRef.current) return
    const quantidade = entryValues[item.id] ?? ''
    const unidade = entryUnits[item.id] ?? item.unidadeCompra
    const fingerprint = manualOperationFingerprint({
      tipo: 'entrada',
      insumoId: item.id,
      quantidade,
      custo: '',
      motivo: '',
      observacao: 'Entrada manual de estoque',
      unidade,
    })
    const intent = intentForFingerprint(
      entryOperationIntentsRef.current[item.id],
      fingerprint,
    )
    entryOperationIntentsRef.current[item.id] = intent
    manualStockPendingRef.current = true
    setEntryId(item.id)
    try { await registrarEntradaEstoque(item.id, quantidade, intent.key, undefined, unidade); delete entryOperationIntentsRef.current[item.id]; setEntryValues((current) => ({ ...current, [item.id]: '' })); setEntryUnits((current) => ({ ...current, [item.id]: item.unidadeCompra })); router.refresh(); toast.success(`Entrada registrada para ${item.nome}.`) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível registrar a entrada.') }
    finally { manualStockPendingRef.current = false; setEntryId(null) }
  }

  async function handleStockEdit(item: Insumo) {
    if (manualStockPendingRef.current) return
    const fingerprint = manualOperationFingerprint({
      tipo: 'contagem',
      insumoId: item.id,
      quantidade: stockValue,
      custo: '',
      motivo: 'Contagem física',
      observacao: 'Contagem manual do estoque',
      unidade: item.unidadeCompra,
    })
    const intent = intentForFingerprint(
      stockAdjustmentIntentRef.current,
      fingerprint,
    )
    stockAdjustmentIntentRef.current = intent
    manualStockPendingRef.current = true
    setEntryId(item.id)
    try { await ajustarEstoqueAtual(item.id, stockValue, intent.key, item.unidadeCompra); stockAdjustmentIntentRef.current = null; setEditingStockId(null); router.refresh(); toast.success('Estoque atualizado.') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o estoque.') }
    finally { manualStockPendingRef.current = false; setEntryId(null) }
  }

  async function handleMovement() {
    if (!movementIngredientId || !movementQuantity || manualStockPendingRef.current) return
    const movementIngredient = insumos.find((item) => item.id === movementIngredientId)
    if (!movementIngredient) {
      setMovementIngredientId(insumos[0]?.id ?? '')
      setMovementUnit(insumos[0]?.unidadeCompra ?? 'unidade')
      router.refresh()
      toast.error('O item selecionado não está mais disponível. Atualize e selecione outro item.')
      return
    }
    const fingerprint = manualOperationFingerprint({
      tipo: movementType,
      insumoId: movementIngredientId,
      quantidade: movementQuantity,
      custo: movementType === 'entrada' ? movementCost : '',
      motivo: movementType === 'perda' ? movementReason : movementType === 'contagem' ? 'Contagem física' : '',
      observacao: movementType === 'entrada' ? 'Entrada manual de estoque' : '',
      unidade: movementUnit,
    })
    const intent = intentForFingerprint(
      movementOperationIntentRef.current,
      fingerprint,
    )
    movementOperationIntentRef.current = intent
    manualStockPendingRef.current = true
    movementPendingRef.current = true
    setMovementBusy(true)
    try {
      if (movementType === 'entrada') await registrarEntradaEstoque(movementIngredientId, movementQuantity, intent.key, movementCost, movementUnit)
      if (movementType === 'perda') await registrarPerdaEstoque(movementIngredientId, movementQuantity, movementReason, intent.key, undefined, movementUnit)
      if (movementType === 'contagem') await realizarContagemEstoque(movementIngredientId, movementQuantity, intent.key, undefined, movementUnit)
      movementOperationIntentRef.current = null
      setMovementQuantity(''); setMovementCost(''); setMovementReason(''); router.refresh(); toast.success('Movimentação registrada.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível registrar a movimentação.') }
    finally { movementPendingRef.current = false; manualStockPendingRef.current = false; setMovementBusy(false) }
  }

  const recipeProducts = produtos.filter((product) => fichas.some((recipe) => recipe.produtoId === product.id))
  const movementIngredient = insumos.find((item) => item.id === movementIngredientId)
  const movementUnits = movementIngredient ? movementUnitsFor(movementIngredient.unidadeBase) : []

  return (
    <AdminPage>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div>
          <h1 className="text-xl font-semibold tracking-tight">{view === 'estoque' ? 'Estoque' : view === 'lista' ? 'Lista de compras' : 'Ficha técnica'}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{view === 'estoque' ? 'Cadastre itens, acompanhe saldos e registre movimentações.' : view === 'lista' ? 'Organize as reposições sugeridas e compras avulsas.' : 'Defina os itens de estoque consumidos por cada produto.'}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
          {view === 'estoque' && insumos.length > 0 ? <details className="relative" onToggle={(event) => { if (movementPendingRef.current && !event.currentTarget.open) { event.currentTarget.open = true; return } if (event.currentTarget.open && !movementIngredient) { setMovementIngredientId(insumos[0]?.id ?? ''); setMovementUnit(insumos[0]?.unidadeCompra ?? 'unidade'); router.refresh(); toast.error('O item selecionado não está mais disponível. Atualize e selecione outro item.'); return } if (!event.currentTarget.open) movementOperationIntentRef.current = null }}><summary aria-disabled={manualStockBusy} onClick={(event) => { if (manualStockPendingRef.current) event.preventDefault() }} className="flex min-h-9 cursor-pointer list-none items-center rounded-[var(--radius)] bg-[var(--action-positive)] px-3 text-sm font-medium text-[var(--action-positive-foreground)]">Registrar movimentação</summary><div className="absolute right-0 z-10 mt-2 grid w-[min(22rem,calc(100vw-2rem))] gap-3 rounded-[var(--radius)] border bg-background p-4 shadow-sm"><Label htmlFor="movimento-tipo">Tipo</Label><select id="movimento-tipo" className="min-h-10 rounded-[var(--radius)] border bg-background px-3 text-sm" value={movementType} disabled={manualStockBusy} onChange={(event) => setMovementType(event.target.value as typeof movementType)}><option value="entrada">Entrada</option><option value="perda">Perda</option><option value="contagem">Contagem</option></select><Label htmlFor="movimento-insumo">Insumo</Label><select id="movimento-insumo" className="min-h-10 rounded-[var(--radius)] border bg-background px-3 text-sm" value={movementIngredientId} disabled={manualStockBusy} onChange={(event) => { const next = insumos.find((item) => item.id === event.target.value); setMovementIngredientId(next?.id ?? ''); setMovementUnit(next?.unidadeCompra ?? 'unidade') }}>{insumos.map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.unidadeBase}</option>)}</select><Label htmlFor="movimento-unidade">Unidade</Label><select id="movimento-unidade" className="min-h-10 rounded-[var(--radius)] border bg-background px-3 text-sm" value={movementUnit} disabled={manualStockBusy || !movementIngredient} onChange={(event) => setMovementUnit(event.target.value)}>{movementUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select><Label htmlFor="movimento-quantidade">Quantidade</Label><Input id="movimento-quantidade" inputMode="decimal" value={movementQuantity} disabled={manualStockBusy} onChange={(event) => setMovementQuantity(event.target.value)} placeholder="0" />{movementType === 'entrada' ? <><Label htmlFor="movimento-custo">Custo total (opcional)</Label><Input id="movimento-custo" inputMode="decimal" value={movementCost} disabled={manualStockBusy} onChange={(event) => setMovementCost(event.target.value)} placeholder="R$ 0,00" /></> : null}{movementType === 'perda' ? <><Label htmlFor="movimento-motivo">Motivo da perda</Label><Input id="movimento-motivo" value={movementReason} disabled={manualStockBusy} onChange={(event) => setMovementReason(event.target.value)} placeholder="Ex.: Vencimento" /></> : null}<Button type="button" intent="positive" appearance="solid" aria-busy={movementBusy} disabled={manualStockBusy || !movementIngredient || !movementQuantity || (movementType === 'perda' && !movementReason.trim())} onClick={handleMovement}>Confirmar</Button></div></details> : null}
          </div>
        </div>

        {view === 'estoque' ? <><div className="mt-5 max-w-5xl space-y-5"><div className="grid gap-4 rounded-[var(--radius)] border bg-card p-4 sm:grid-cols-[minmax(0,3fr)_12rem_12rem_auto] sm:items-end"><div className="space-y-1"><Label htmlFor="insumo-nome">Nome</Label><Input id="insumo-nome" value={newIngredient.nome} onChange={(event) => setNewIngredient({ ...newIngredient, nome: event.target.value })} placeholder="Ex.: Bacon" /></div><div className="space-y-1"><Label htmlFor="insumo-unidade">Unidade</Label><select id="insumo-unidade" className="min-h-11 w-full rounded-[var(--radius)] border bg-background px-3 text-sm" value={newIngredient.unidade} onChange={(event) => setNewIngredient({ ...newIngredient, unidade: event.target.value })}><option value="kg">Quilo</option><option value="g">Gramas</option><option value="unidade">Unidade</option><option value="ml">Mililitros</option><option value="l">Litros</option></select></div><div className="space-y-1"><Label htmlFor="insumo-custo">Custo por unidade</Label><Input id="insumo-custo" inputMode="decimal" value={newIngredient.custoPorUnidade} onChange={(event) => setNewIngredient({ ...newIngredient, custoPorUnidade: formatCurrencyInput(event.target.value) })} placeholder="R$ 0,00" /></div><div className="space-y-1"><Label htmlFor="insumo-minimo">Estoque minimo</Label><Input id="insumo-minimo" inputMode="decimal" value={newIngredient.estoqueMinimo} onChange={(event) => setNewIngredient({ ...newIngredient, estoqueMinimo: event.target.value })} placeholder="0" /></div><div className="space-y-1"><Label htmlFor="insumo-ideal">Estoque ideal</Label><Input id="insumo-ideal" inputMode="decimal" value={newIngredient.estoqueIdeal} onChange={(event) => setNewIngredient({ ...newIngredient, estoqueIdeal: event.target.value })} placeholder="Opcional" /></div><Button type="button" intent="positive" appearance="solid" className="min-h-11" aria-busy={creating} disabled={creating || !newIngredient.nome.trim() || !newIngredient.custoPorUnidade} onClick={handleCreateIngredient}>Salvar insumo</Button></div></div><div className="mt-5 space-y-6">
          <div className="max-w-md space-y-1"><Label htmlFor="buscar-insumo">Buscar insumo</Label><Input id="buscar-insumo" type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Nome do insumo" /></div>
          {insumos.length === 0 ? <AdminEmptyState title="Nenhum insumo" description="Cadastre o primeiro insumo nesta página." /> : filteredInsumos.length === 0 ? <AdminEmptyState title="Nenhum resultado" description="Tente buscar por outro nome." /> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-2 py-3 font-medium">Item</th><th className="px-2 py-3 font-medium">Saldo atual</th><th className="px-2 py-3 font-medium">Mínimo</th><th className="px-2 py-3 font-medium">Ideal</th>{view === 'estoque' ? <th className="px-2 py-3 font-medium">Entrada</th> : null}</tr></thead><tbody className="divide-y">{filteredInsumos.map((item) => { const low = Number(item.estoqueAtual) <= Number(item.estoqueMinimo); const editing = editingStockId === item.id; const entryUnit = entryUnits[item.id] ?? item.unidadeCompra; return <tr key={item.id}><td className="px-2 py-3"><div className="flex items-center gap-1"><p className="font-medium">{item.nome}</p><Button type="button" size="icon-sm" intent="informational" appearance="ghost" aria-label={`Editar item ${item.nome}`} onClick={() => openIngredientEdit(item)}><Pencil aria-hidden="true" /></Button><Button type="button" size="icon-sm" intent="destructive" appearance="ghost" aria-label={`Excluir item ${item.nome}`} onClick={() => { setDeletingIngredient(item); setDeleteConfirmation('') }}><Trash2 aria-hidden="true" /></Button></div><p className="text-xs text-muted-foreground">{item.unidadeCompra} · {item.unidadeBase}</p></td><td className={`px-2 py-3 font-medium ${low ? 'text-[var(--action-warning-outline)]' : ''}`}>{view === 'estoque' && editing ? <div className="flex items-center gap-1"><Input aria-label={`Quantidade total de ${item.nome}`} className="w-28" inputMode="decimal" value={stockValue} disabled={manualStockBusy} onChange={(e) => setStockValue(e.target.value)} autoFocus /><Button type="button" size="sm" intent="positive" appearance="ghost" aria-busy={entryId === item.id} disabled={manualStockBusy} onClick={() => handleStockEdit(item)}>Confirmar</Button><Button type="button" size="sm" intent="destructive" appearance="ghost" disabled={manualStockBusy} onClick={cancelStockAdjustment}>Cancelar</Button></div> : <div className="flex items-center gap-1"><span>{formatQuantity(item.estoqueAtual, item.unidadeBase)}</span>{view === 'estoque' ? <Button type="button" size="icon-sm" intent="informational" appearance="ghost" aria-label={`Editar estoque de ${item.nome}`} disabled={manualStockBusy} onClick={() => openStockAdjustment(item)}><Pencil aria-hidden="true" /></Button> : null}</div>}</td><td className="px-2 py-3 text-muted-foreground">{formatQuantity(item.estoqueMinimo, item.unidadeBase)}</td><td className="px-2 py-3 text-muted-foreground">{formatQuantity(item.estoqueIdeal, item.unidadeBase)}</td>{view === 'estoque' ? <td className="px-2 py-3"><div className="flex items-center gap-2"><Input aria-label={`Entrada para ${item.nome}`} className="w-28" inputMode="decimal" value={entryValues[item.id] ?? ''} disabled={manualStockBusy} onChange={(e) => setEntryValues((current) => ({ ...current, [item.id]: e.target.value }))} placeholder="0" /><select aria-label={`Unidade de entrada para ${item.nome}`} className="min-h-10 rounded-[var(--radius)] border bg-background px-2 text-sm" value={entryUnit} disabled={manualStockBusy} onChange={(e) => setEntryUnits((current) => ({ ...current, [item.id]: e.target.value }))}>{movementUnitsFor(item.unidadeBase).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select><Button type="button" size="sm" intent="neutral" appearance="outline" aria-busy={entryId === item.id} disabled={manualStockBusy || !entryValues[item.id]} onClick={() => handleEntry(item)}>Registrar</Button></div></td> : null}</tr> })}</tbody></table></div>}
        </div></> : view === 'lista' ? <ShoppingListView shoppingListItems={shoppingListItems} /> : <div className="mt-5 space-y-5">
          {!produtos.length ? <AdminEmptyState title="Nenhum produto" description="Cadastre um produto antes de criar a ficha técnica." /> : <>
          <section className="space-y-3 rounded-[var(--radius)] border bg-card p-4">
            <div><h2 className="text-base font-semibold">Fichas registradas</h2><p className="text-sm text-muted-foreground">Selecione um produto para editar ou acompanhar os insumos definidos.</p></div>
            {recipeProducts.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma ficha técnica foi registrada ainda.</p> : <div className="grid gap-2 sm:grid-cols-2">{recipeProducts.map((product) => <button key={product.id} type="button" className="min-h-11 rounded-[var(--radius)] border px-3 py-2 text-left text-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]" aria-pressed={selectedProdutoId === product.id} onClick={() => selectProduct(product.id)}><span className="font-medium">{product.nome}</span><span className="mt-1 block text-xs text-muted-foreground">{fichas.filter((recipe) => recipe.produtoId === product.id).length} insumo(s)</span></button>)}</div>}
          </section>
          <div className="flex flex-wrap items-end gap-3 border-b pb-5"><div className="min-w-[260px] flex-1 space-y-1"><Label htmlFor="ficha-produto">Produto</Label><select id="ficha-produto" className="min-h-11 w-full rounded-[var(--radius)] border bg-background px-3 text-sm" value={selectedProdutoId} disabled={savingRecipe} aria-busy={savingRecipe} onChange={(e) => selectProduct(e.target.value)}>{produtos.map((product) => <option key={product.id} value={product.id}>{product.nome} · {product.categoriaNome}</option>)}</select></div></div><div className="flex flex-wrap gap-2"><Button type="button" intent="positive" appearance="solid" className="min-h-11" disabled={savingRecipe || !availableIngredients.length} onClick={() => setRows([...rows, { insumoId: availableIngredients[0]?.id ?? '', quantidade: '' }])}><Plus aria-hidden="true" /> Adicionar insumo</Button><Button type="button" intent="positive" appearance="solid" className="min-h-11" aria-busy={savingRecipe} disabled={savingRecipe || rows.some((row) => !row.insumoId || !row.quantidade)} onClick={handleSaveRecipe}><Save aria-hidden="true" /> Salvar</Button></div>
          {rows.length === 0 ? <AdminEmptyState title={`Ficha vazia${selectedProduct ? ` · ${selectedProduct.nome}` : ''}`} description="Adicione os insumos consumidos por unidade." /> : <div className="space-y-2">{rows.map((row, index) => { const ingredient = insumos.find((item) => item.id === row.insumoId); const unit = ingredient?.unidadeBase ?? '—'; return <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end" key={`${row.insumoId}-${index}`}><div className="space-y-1"><Label htmlFor={`ficha-insumo-${index}`}>Item de estoque</Label><IngredientPicker id={`ficha-insumo-${index}`} value={row.insumoId} ingredients={insumos} excludedIds={rows.map((current) => current.insumoId)} onChange={(insumoId) => setRows(rows.map((current, currentIndex) => currentIndex === index ? { ...current, insumoId } : current))} /></div><div className="space-y-1"><Label htmlFor={`ficha-quantidade-${index}`}>Quantidade ({unit})</Label><div className="flex items-center gap-2"><Input id={`ficha-quantidade-${index}`} inputMode="decimal" value={row.quantidade} onChange={(e) => setRows(rows.map((current, currentIndex) => currentIndex === index ? { ...current, quantidade: e.target.value } : current))} placeholder="0" /><span className="min-w-9 text-sm text-muted-foreground">{unit}</span></div></div><Button type="button" intent="destructive" appearance="ghost" size="icon" className="size-11" aria-label={`Remover ${ingredient?.nome ?? 'insumo'}`} aria-busy={savingRecipe} disabled={savingRecipe} onClick={() => handleRemoveRecipeRow(index)}><Trash2 aria-hidden="true" /></Button></div> })}</div>}
          </>}
        </div>}
      <Dialog open={editingIngredient !== null} onOpenChange={(open) => { if (!open) setEditingIngredient(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar insumo</DialogTitle>
            <DialogDescription>Atualize os dados cadastrais do insumo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label htmlFor="editar-insumo-nome">Nome</Label><Input id="editar-insumo-nome" value={editIngredientValues.nome} onChange={(event) => setEditIngredientValues({ ...editIngredientValues, nome: event.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="editar-insumo-unidade">Unidade</Label><select id="editar-insumo-unidade" className="min-h-11 w-full rounded-[var(--radius)] border bg-background px-3 text-sm" value={editIngredientValues.unidade} onChange={(event) => setEditIngredientValues({ ...editIngredientValues, unidade: event.target.value })}><option value="kg">Quilo</option><option value="g">Gramas</option><option value="unidade">Unidade</option><option value="ml">Mililitros</option><option value="l">Litros</option></select></div>
            <div className="space-y-1"><Label htmlFor="editar-insumo-custo">Custo por unidade</Label><Input id="editar-insumo-custo" inputMode="decimal" value={editIngredientValues.custoPorUnidade} onChange={(event) => setEditIngredientValues({ ...editIngredientValues, custoPorUnidade: formatCurrencyInput(event.target.value) })} /></div><div className="space-y-1"><Label htmlFor="editar-insumo-minimo">Estoque mínimo</Label><Input id="editar-insumo-minimo" inputMode="decimal" value={editIngredientValues.estoqueMinimo} onChange={(event) => setEditIngredientValues({ ...editIngredientValues, estoqueMinimo: event.target.value })} /></div><div className="space-y-1"><Label htmlFor="editar-insumo-ideal">Estoque ideal</Label><Input id="editar-insumo-ideal" inputMode="decimal" value={editIngredientValues.estoqueIdeal} onChange={(event) => setEditIngredientValues({ ...editIngredientValues, estoqueIdeal: event.target.value })} /></div>
          </div>
          <DialogFooter><Button type="button" intent="destructive" appearance="outline" onClick={() => setEditingIngredient(null)}>Cancelar</Button><Button type="button" intent="positive" appearance="solid" aria-busy={ingredientActionBusy} disabled={ingredientActionBusy || !editIngredientValues.nome.trim() || !editIngredientValues.custoPorUnidade} onClick={handleEditIngredient}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletingIngredient !== null} onOpenChange={(open) => { if (!open) { setDeletingIngredient(null); setDeleteConfirmation('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir insumo</DialogTitle>
            <DialogDescription>Para confirmar, digite exatamente o nome do insumo.</DialogDescription>
          </DialogHeader>
          {deletingIngredientUsage.length > 0 ? <div className="rounded-[var(--radius)] border border-[var(--action-warning-outline)] bg-[var(--action-warning-soft)] p-3 text-sm text-[var(--action-warning-soft-foreground)]"><p>Este item ainda está sendo usado em:</p><p className="mt-1 font-semibold">{deletingIngredientUsage.join(', ')}</p><p className="mt-2 text-xs">Remova o insumo dessas fichas técnicas antes de excluí-lo.</p></div> : <p className="text-sm text-muted-foreground">Se houver movimentações, o item será removido das telas e o histórico será preservado.</p>}
          <div className="space-y-1"><Label htmlFor="confirmar-exclusao-insumo">Nome do insumo</Label><Input id="confirmar-exclusao-insumo" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder={deletingIngredient?.nome} /></div>
          <DialogFooter><Button type="button" intent="destructive" appearance="outline" onClick={() => { setDeletingIngredient(null); setDeleteConfirmation('') }}>Cancelar</Button><Button type="button" intent="destructive" appearance="solid" aria-busy={ingredientActionBusy} disabled={ingredientActionBusy || deletingIngredientUsage.length > 0 || deleteConfirmation !== deletingIngredient?.nome} onClick={handleDeleteIngredient}>{deletingIngredientUsage.length > 0 ? 'Remova das fichas primeiro' : 'Excluir insumo'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  )
}
