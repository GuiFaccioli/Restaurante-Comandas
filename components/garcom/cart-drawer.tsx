'use client'
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { confirmarPedido, confirmarPedidoDelivery } from '@/lib/actions/pedidos'
import { useCart } from '@/lib/store/cart'
import { getProductAvailability, type ReceitaDisponibilidade, type SaldoDisponibilidade, type ProdutoControleEstoque } from '@/lib/stock/availability'
import { userFacingErrorMessage } from '@/lib/ui/error-messages'

type Props = {
  open: boolean
  onClose: () => void
  mode?: 'salao' | 'delivery'
  mesaId?: string
  mesaNumero?: number
  atendimentoId?: string
  delivery?: {
    clienteId: string
    clienteNome: string
    enderecoId: string
    enderecoLabel: string
    taxaEntrega: string
  }
  onConfirmed?: () => void
  recipes: ReceitaDisponibilidade[]
  balances: SaldoDisponibilidade[]
  productStockControls: ProdutoControleEstoque[]
}

const ORDER_CONFIRMATION_ERROR =
  'Não foi possível confirmar o pedido por um erro inesperado.'

export function getOrderConfirmationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.startsWith('Não há estoque suficiente para ')) {
    return `Sem estoque: ${error.message.replace('Não há estoque suficiente para ', '')}`
  }

  return userFacingErrorMessage(error, ORDER_CONFIRMATION_ERROR)
}

export function CartDrawer({ open, onClose, mode = 'salao', mesaId, mesaNumero, atendimentoId, delivery, onConfirmed, recipes, balances, productStockControls }: Props) {
  const router = useRouter()
  const { items, total, removeItem, addItem, decrementItem, clearCart, setObservacao } = useCart()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deliveryFee, setDeliveryFee] = useState(delivery?.taxaEntrega ?? '0')
  const [editingObservationItem, setEditingObservationItem] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'delivery') setDeliveryFee(delivery?.taxaEntrega ?? '0')
  }, [delivery?.taxaEntrega, mode])

  const isDelivery = mode === 'delivery'

  function parseDeliveryFee(value: string): number | null {
    const normalized = value.trim().replace(',', '.')
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
    const amount = Number(normalized)
    return Number.isFinite(amount) && amount >= 0 ? amount : null
  }

  async function handleConfirmar() {
    setSending(true)
    setError(null)
    try {
      const orderItems = items.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        observacao: item.observacao,
      }))

      if (isDelivery) {
        const fee = parseDeliveryFee(deliveryFee)
        if (!delivery || fee === null) {
          setError('Informe uma taxa de entrega válida.')
          return
        }
        await confirmarPedidoDelivery({
          clienteId: delivery.clienteId,
          enderecoId: delivery.enderecoId,
          taxaEntrega: fee.toFixed(2),
          items: orderItems,
        })
      } else {
        if (!mesaId || !atendimentoId) {
          setError('A mesa ainda não está pronta para receber o pedido.')
          return
        }
        await confirmarPedido(mesaId, atendimentoId, orderItems)
      }
    } catch (error) {
      console.error('Failed to confirm order', error)
      const message = getOrderConfirmationErrorMessage(error)
      setError(message)
      toast.error(message)
      return
    } finally {
      setSending(false)
    }

    router.refresh()
    clearCart()
    onClose()
    onConfirmed?.()
    toast.success('Pedido concluído com sucesso.')
  }

  const displayedTotal = total + (isDelivery ? (parseDeliveryFee(deliveryFee) ?? 0) : 0)
  const displayedTotalLabel = isDelivery
    ? displayedTotal.toFixed(2).replace('.', ',')
    : total.toFixed(2)

  return (
    <Drawer open={open} onOpenChange={(value) => !value && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{isDelivery ? 'Carrinho — DELIVERY' : `Carrinho — Mesa ${mesaNumero}`}</DrawerTitle>
        </DrawerHeader>
        {isDelivery && delivery ? <div className="space-y-3 px-4">
          <div className="rounded-[var(--radius)] border bg-muted/30 p-3 text-sm">
            <p className="font-semibold">{delivery.clienteNome}</p>
            <p className="mt-1 text-muted-foreground">{delivery.enderecoLabel}</p>
          </div>
          <label className="grid gap-1 text-sm font-medium" htmlFor="delivery-fee">
            Taxa de entrega
            <input id="delivery-fee" type="text" inputMode="decimal" value={deliveryFee} onChange={(event) => setDeliveryFee(event.target.value)} className="min-h-11 rounded-md border border-input bg-background px-3 font-normal" aria-describedby="delivery-fee-help" />
            <span id="delivery-fee-help" className="text-xs font-normal text-muted-foreground">A taxa padrão foi carregada e pode ser ajustada antes da confirmação. R$ 0,00 também é válido.</span>
          </label>
        </div> : null}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4">
          {items.map((item) => (
            <CartItemRow
              key={item.produtoId}
              item={item}
              recipes={recipes}
              balances={balances}
              productStockControls={productStockControls}
              editingObservationItem={editingObservationItem}
              setEditingObservationItem={setEditingObservationItem}
              removeItem={removeItem}
              addItem={addItem}
              decrementItem={decrementItem}
              setObservacao={setObservacao}
            />
          ))}
        </div>
        <Separator className="my-4" />
        <div className="flex justify-between px-4 font-semibold">
          <span>Total</span>
          <span>R$ {displayedTotalLabel}</span>
        </div>
        {error && <p className="px-4 text-sm text-destructive">{error}</p>}
        <DrawerFooter className="gap-2">
          <Button type="button" intent="positive" appearance="solid" size="lg" className="min-h-11 w-full" onClick={handleConfirmar} aria-busy={sending} disabled={sending || items.length === 0}>
            {sending ? 'Confirmando...' : 'Confirmar pedido'}
          </Button>
          <Button type="button" intent="neutral" appearance="outline" size="lg" className="min-h-11 w-full" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

type CartItemRowProps = {
  item: ReturnType<typeof useCart.getState>['items'][number]
  recipes: ReceitaDisponibilidade[]
  balances: SaldoDisponibilidade[]
  productStockControls: ProdutoControleEstoque[]
  editingObservationItem: string | null
  setEditingObservationItem: Dispatch<SetStateAction<string | null>>
  removeItem: ReturnType<typeof useCart.getState>['removeItem']
  addItem: ReturnType<typeof useCart.getState>['addItem']
  decrementItem: ReturnType<typeof useCart.getState>['decrementItem']
  setObservacao: ReturnType<typeof useCart.getState>['setObservacao']
}

function CartItemRow({ item, recipes, balances, productStockControls, editingObservationItem, setEditingObservationItem, removeItem, addItem, decrementItem, setObservacao }: CartItemRowProps) {
  const cartItems = useCart((state) => state.items)
  const availability = getProductAvailability(item.produtoId, cartItems, recipes, balances, productStockControls)
  const atStockCap = availability.maxAdditionalQuantity === 0
  const stockCapDescriptionId = `cart-stock-cap-${item.produtoId}`
  const maxQuantity = availability.maxAdditionalQuantity === null
    ? undefined
    : item.quantidade + availability.maxAdditionalQuantity

  function handleAdd() {
    if (!addItem({ produtoId: item.produtoId, nome: item.nome, preco: item.preco }, maxQuantity)) {
      toast.error(`Sem estoque: ${availability.limitingItemName}`, { duration: 1000 })
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium">{item.nome}</p>
        {item.observacao && <p className="break-words text-xs text-muted-foreground">Obs: {item.observacao}</p>}
        <Button type="button" intent="informational" appearance="link" className="min-h-11 justify-start px-0 text-xs" onClick={() => setEditingObservationItem((current) => current === item.produtoId ? null : item.produtoId)}>
          {editingObservationItem === item.produtoId ? 'Fechar edição' : 'Editar observação'}
        </Button>
        {editingObservationItem === item.produtoId ? (
          <div className="mt-2 space-y-2">
            <label htmlFor={`observacao-${item.produtoId}`} className="text-xs font-medium text-foreground">Observação para a cozinha</label>
            <Textarea id={`observacao-${item.produtoId}`} autoFocus className="min-h-24 resize-y text-sm" placeholder="Ex.: sem cebola, sem tomate" value={item.observacao ?? ''} onChange={(event) => setObservacao(item.produtoId, event.target.value)} rows={3} />
            <Button type="button" intent="positive" appearance="soft" size="sm" onClick={() => setEditingObservationItem(null)}>Salvar observação</Button>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" intent="neutral" appearance="outline" size="icon" className="size-11" aria-label={`Diminuir ${item.nome}`} onClick={() => decrementItem(item.produtoId)}><Minus aria-hidden="true" /></Button>
        <span className="w-8 text-center text-sm font-medium">{item.quantidade}</span>
        <Button type="button" intent="positive" appearance="soft" size="icon" className="size-11" aria-label={`Adicionar mais ${item.nome}`} aria-describedby={atStockCap ? stockCapDescriptionId : undefined} onClick={handleAdd}><Plus aria-hidden="true" /></Button>
        {atStockCap ? <span id={stockCapDescriptionId} className="sr-only" role="status">Limite de estoque atingido para {item.nome}.</span> : null}
        <Button type="button" intent="destructive" appearance="ghost" size="icon" className="size-11" aria-label={`Remover ${item.nome} do carrinho`} onClick={() => removeItem(item.produtoId)}><Trash2 aria-hidden="true" /></Button>
      </div>
    </div>
  )
}
