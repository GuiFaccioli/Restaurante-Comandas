'use client'
import { useState } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Trash2, Minus, Plus } from 'lucide-react'
import { useCart } from '@/lib/store/cart'
import { confirmarPedido } from '@/lib/actions/pedidos'
import { ObservacaoSheet } from './observacao-sheet'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onClose: () => void
  mesaId: string
  mesaNumero: number
}

export function CartDrawer({ open, onClose, mesaId, mesaNumero }: Props) {
  const { items, total, removeItem, addItem, decrementItem, clearCart } = useCart()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [obsItem, setObsItem] = useState<string | null>(null)

  async function handleConfirmar() {
    setSending(true)
    setError(null)
    try {
      await confirmarPedido(
        mesaId,
        items.map((item) => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          observacao: item.observacao,
        }))
      )
    } catch (error) {
      console.error('Failed to confirm order', error)
      setError('Não foi possível confirmar o pedido. Tente novamente.')
      toast.error('Não foi possível confirmar o pedido.')
      return
    } finally {
      setSending(false)
    }

    clearCart()
    onClose()
    toast.success('Pedido concluído com sucesso.')
  }
  return (
    <>
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Carrinho — Mesa {mesaNumero}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 space-y-3 overflow-y-auto max-h-[60vh]">
            {items.map((item) => (
              <div key={item.produtoId} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.nome}</p>
                  {item.observacao && (
                    <p className="text-xs text-muted-foreground">Obs: {item.observacao}</p>
                  )}
                  <button
                    className="text-xs text-ring underline"
                    onClick={() => setObsItem(item.produtoId)}
                  >
                    {item.observacao ? 'Editar obs.' : '+ Observação'}
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                    onClick={() => decrementItem(item.produtoId)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{item.quantidade}</span>
                  <Button size="sm" className="h-7 w-7 p-0"
                    onClick={() => addItem({ produtoId: item.produtoId, nome: item.nome, preco: item.preco })}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                    onClick={() => removeItem(item.produtoId)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="px-4 flex justify-between font-semibold">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
          {error && <p className="px-4 text-sm text-destructive">{error}</p>}
          <DrawerFooter>
            <Button size="lg" className="h-12 w-full" onClick={handleConfirmar} disabled={sending || items.length === 0}>
              {sending ? 'Confirmando...' : 'Confirmar pedido'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      {obsItem && (
        <ObservacaoSheet
          open={!!obsItem}
          produtoId={obsItem}
          onClose={() => setObsItem(null)}
        />
      )}
    </>
  )
}

