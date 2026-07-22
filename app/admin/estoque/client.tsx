'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminEmptyState, AdminPage } from '@/components/admin/admin-page'
import { ajustarEstoqueAtual, criarInsumo, registrarEntradaEstoque, salvarFichaTecnica } from '@/lib/actions/estoque'
import { UNIDADES_BASE, UNIDADES_COMPRA, type UnidadeBase } from '@/lib/stock/units'

type Insumo = { id: string; nome: string; unidadeBase: string; unidadeCompra: string; estoqueAtual: string; estoqueIdeal: string; estoqueMinimo: string }
type Produto = { id: string; nome: string; categoriaNome: string }
type Ficha = { produtoId: string; insumoId: string; quantidade: string }
type RecipeRow = { insumoId: string; quantidade: string }
type Section = 'insumos' | 'ficha'

function formatQuantity(value: string, unit: string) {
  const number = Number(value)
  return `${Number.isInteger(number) ? number : number.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} ${unit}`
}

export function EstoqueAdminClient({ insumos, produtos, fichas, initialProdutoId }: { insumos: Insumo[]; produtos: Produto[]; fichas: Ficha[]; initialProdutoId: string }) {
  const router = useRouter()
  const [section, setSection] = useState<Section>('insumos')
  const [selectedProdutoId, setSelectedProdutoId] = useState(initialProdutoId || produtos[0]?.id || '')
  const [rows, setRows] = useState<RecipeRow[]>(() => fichas.filter((item) => item.produtoId === (initialProdutoId || produtos[0]?.id)).map(({ insumoId, quantidade }) => ({ insumoId, quantidade })))
  const [creating, setCreating] = useState(false)
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [entryId, setEntryId] = useState<string | null>(null)
  const [entryValues, setEntryValues] = useState<Record<string, string>>({})
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [stockValue, setStockValue] = useState('')
  const [newIngredient, setNewIngredient] = useState({ nome: '', unidadeBase: 'g' as UnidadeBase, unidadeCompra: 'kg', estoqueAtual: '', estoqueIdeal: '', estoqueMinimo: '' })
  const selectedProduct = produtos.find((item) => item.id === selectedProdutoId)
  const availableIngredients = useMemo(() => insumos.filter((item) => !rows.some((row) => row.insumoId === item.id)), [insumos, rows])

  function selectProduct(id: string) {
    setSelectedProdutoId(id)
    setRows(fichas.filter((item) => item.produtoId === id).map(({ insumoId, quantidade }) => ({ insumoId, quantidade })))
  }

  async function handleCreateIngredient() {
    setCreating(true)
    try { await criarInsumo(newIngredient); setNewIngredient({ nome: '', unidadeBase: 'g', unidadeCompra: 'kg', estoqueAtual: '', estoqueIdeal: '', estoqueMinimo: '' }); router.refresh(); toast.success('Insumo criado.') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível criar o insumo.') }
    finally { setCreating(false) }
  }

  async function handleSaveRecipe() {
    if (!selectedProdutoId) return
    setSavingRecipe(true)
    try { await salvarFichaTecnica(selectedProdutoId, rows); router.refresh(); toast.success('Ficha técnica salva.') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a ficha técnica.') }
    finally { setSavingRecipe(false) }
  }

  async function handleEntry(item: Insumo) {
    setEntryId(item.id)
    try { await registrarEntradaEstoque(item.id, entryValues[item.id] ?? ''); setEntryValues((current) => ({ ...current, [item.id]: '' })); router.refresh(); toast.success(`Entrada registrada para ${item.nome}.`) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível registrar a entrada.') }
    finally { setEntryId(null) }
  }

  function startStockEdit(item: Insumo) {
    setEditingStockId(item.id)
    setStockValue(item.estoqueAtual)
  }

  async function handleStockEdit(item: Insumo) {
    setEntryId(item.id)
    try { await ajustarEstoqueAtual(item.id, stockValue); setEditingStockId(null); router.refresh(); toast.success('Estoque atualizado.') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o estoque.') }
    finally { setEntryId(null) }
  }

  return (
    <AdminPage>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Estoque</h1>
        <div className="flex gap-1" role="tablist" aria-label="Estoque">
          {([['insumos', 'Insumos'], ['ficha', 'Ficha técnica']] as const).map(([value, label]) => (
            <Button key={value} type="button" size="sm" intent={section === value ? 'informational' : 'neutral'} appearance={section === value ? 'solid' : 'ghost'} role="tab" aria-selected={section === value} onClick={() => setSection(value)}>{label}</Button>
          ))}
        </div>
      </div>

      {section === 'insumos' ? (
        <div className="mt-5 space-y-6">
          <div className="grid gap-4 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto] lg:items-end">
            <div className="space-y-1"><Label htmlFor="insumo-nome">Nome</Label><Input id="insumo-nome" value={newIngredient.nome} onChange={(e) => setNewIngredient({ ...newIngredient, nome: e.target.value })} placeholder="Ex.: Muçarela" /></div>
            <div className="space-y-1"><Label htmlFor="insumo-unidade-base">Base</Label><select id="insumo-unidade-base" className="min-h-11 rounded-[var(--radius)] border bg-background px-3 text-sm" value={newIngredient.unidadeBase} onChange={(e) => setNewIngredient({ ...newIngredient, unidadeBase: e.target.value as UnidadeBase })}>{UNIDADES_BASE.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></div>
            <div className="space-y-1"><Label htmlFor="insumo-unidade-compra">Compra</Label><select id="insumo-unidade-compra" className="min-h-11 rounded-[var(--radius)] border bg-background px-3 text-sm" value={newIngredient.unidadeCompra} onChange={(e) => setNewIngredient({ ...newIngredient, unidadeCompra: e.target.value })}>{UNIDADES_COMPRA.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></div>
            {([['estoqueAtual', 'Atual'], ['estoqueIdeal', 'Ideal'], ['estoqueMinimo', 'Mínimo']] as const).map(([field, label]) => <div className="space-y-1" key={field}><Label htmlFor={`insumo-${field}`}>{label}</Label><Input id={`insumo-${field}`} inputMode="decimal" value={newIngredient[field]} onChange={(e) => setNewIngredient({ ...newIngredient, [field]: e.target.value })} placeholder="0" /></div>)}
            <Button type="button" intent="positive" appearance="solid" className="min-h-11" aria-busy={creating} disabled={creating || !newIngredient.nome.trim()} onClick={handleCreateIngredient}><Plus aria-hidden="true" /> Adicionar</Button>
          </div>
          {insumos.length === 0 ? <AdminEmptyState title="Nenhum insumo" description="Adicione o primeiro insumo acima." /> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-2 py-3 font-medium">Insumo</th><th className="px-2 py-3 font-medium">Estoque</th><th className="px-2 py-3 font-medium">Mínimo</th><th className="px-2 py-3 font-medium">Entrada</th></tr></thead><tbody className="divide-y">{insumos.map((item) => { const low = Number(item.estoqueAtual) <= Number(item.estoqueMinimo); const editing = editingStockId === item.id; return <tr key={item.id}><td className="px-2 py-3"><p className="font-medium">{item.nome}</p><p className="text-xs text-muted-foreground">{item.unidadeCompra} → {item.unidadeBase}</p></td><td className={`px-2 py-3 font-medium ${low ? 'text-[var(--action-warning-outline)]' : ''}`}>{editing ? <div className="flex items-center gap-1"><Input aria-label={`Quantidade total de ${item.nome}`} className="w-28" inputMode="decimal" value={stockValue} onChange={(e) => setStockValue(e.target.value)} autoFocus /><Button type="button" size="sm" intent="positive" appearance="ghost" aria-busy={entryId === item.id} disabled={entryId === item.id} onClick={() => handleStockEdit(item)}>Confirmar</Button><Button type="button" size="sm" intent="destructive" appearance="ghost" disabled={entryId === item.id} onClick={() => setEditingStockId(null)}>Cancelar</Button></div> : <div className="flex items-center gap-1"><span>{formatQuantity(item.estoqueAtual, item.unidadeBase)}</span><Button type="button" size="icon-sm" intent="informational" appearance="ghost" aria-label={`Editar estoque de ${item.nome}`} onClick={() => startStockEdit(item)}><Pencil aria-hidden="true" /></Button></div>}</td><td className="px-2 py-3 text-muted-foreground">{formatQuantity(item.estoqueMinimo, item.unidadeBase)}</td><td className="px-2 py-3"><div className="flex items-center gap-2"><Input aria-label={`Entrada para ${item.nome}`} className="w-28" inputMode="decimal" value={entryValues[item.id] ?? ''} onChange={(e) => setEntryValues((current) => ({ ...current, [item.id]: e.target.value }))} placeholder="0" /><Button type="button" size="sm" intent="neutral" appearance="outline" aria-busy={entryId === item.id} disabled={entryId === item.id || !entryValues[item.id]} onClick={() => handleEntry(item)}>Registrar</Button></div></td></tr> })}</tbody></table></div>}
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {!produtos.length ? <AdminEmptyState title="Nenhum produto" description="Cadastre um produto antes de criar a ficha técnica." /> : <>
            <div className="flex flex-wrap items-end gap-3 border-b pb-5"><div className="min-w-[260px] flex-1 space-y-1"><Label htmlFor="ficha-produto">Produto</Label><select id="ficha-produto" className="min-h-11 w-full rounded-[var(--radius)] border bg-background px-3 text-sm" value={selectedProdutoId} onChange={(e) => selectProduct(e.target.value)}>{produtos.map((product) => <option key={product.id} value={product.id}>{product.nome} · {product.categoriaNome}</option>)}</select></div><Button type="button" intent="neutral" appearance="outline" className="min-h-11" disabled={!availableIngredients.length} onClick={() => setRows([...rows, { insumoId: availableIngredients[0]?.id ?? '', quantidade: '' }])}><Plus aria-hidden="true" /> Insumo</Button><Button type="button" intent="positive" appearance="solid" className="min-h-11" aria-busy={savingRecipe} disabled={savingRecipe || rows.some((row) => !row.insumoId || !row.quantidade)} onClick={handleSaveRecipe}><Save aria-hidden="true" /> Salvar</Button></div>
            {rows.length === 0 ? <AdminEmptyState title={`Ficha vazia${selectedProduct ? ` · ${selectedProduct.nome}` : ''}`} description="Adicione os insumos consumidos por unidade." /> : <div className="space-y-2">{rows.map((row, index) => { const ingredient = insumos.find((item) => item.id === row.insumoId); return <div className="grid grid-cols-[minmax(0,1fr)_120px_auto] items-end gap-2" key={`${row.insumoId}-${index}`}><div className="space-y-1"><Label htmlFor={`ficha-insumo-${index}`}>Insumo</Label><select id={`ficha-insumo-${index}`} className="min-h-11 w-full rounded-[var(--radius)] border bg-background px-3 text-sm" value={row.insumoId} onChange={(e) => setRows(rows.map((current, currentIndex) => currentIndex === index ? { ...current, insumoId: e.target.value } : current))}><option value="">Selecione</option>{insumos.map((item) => <option key={item.id} value={item.id} disabled={rows.some((other, otherIndex) => otherIndex !== index && other.insumoId === item.id)}>{item.nome}</option>)}</select></div><div className="space-y-1"><Label htmlFor={`ficha-quantidade-${index}`}>Qtd.</Label><Input id={`ficha-quantidade-${index}`} inputMode="decimal" value={row.quantidade} onChange={(e) => setRows(rows.map((current, currentIndex) => currentIndex === index ? { ...current, quantidade: e.target.value } : current))} placeholder="0" /></div><Button type="button" intent="destructive" appearance="ghost" size="icon" className="size-11" aria-label={`Remover ${ingredient?.nome ?? 'insumo'}`} onClick={() => setRows(rows.filter((_, currentIndex) => currentIndex !== index))}><Trash2 aria-hidden="true" /></Button></div> })}</div>}
          </>}
        </div>
      )}
    </AdminPage>
  )
}
