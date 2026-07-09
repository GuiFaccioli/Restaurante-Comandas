'use client'
import { useState } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Separator } from '@/components/ui/separator'
import { confirmarPedido } from '@/lib/actions/pedidos'
import { useCart } from '@/lib/store/cart'
import { ObservacaoSheet } from './observacao-sheet'

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
          <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4">
            {items.map((item) => (
              <div
                key={item.produtoId}
                className="flex flex-col gap-3 rounded-[var(--radius)] border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium">{item.nome}</p>
                  {item.observacao && (
                    <p className="break-words text-xs text-muted-foreground">
                      Obs: {item.observacao}
                    </p>
                  )}
                  <button
                    className="text-xs text-ring underline underline-offset-2"
                    onClick={() => setObsItem(item.produtoId)}
                  >
                    {item.observacao ? 'Editar observação' : '+ Observação'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11 w-11 p-0"
                    onClick={() => decrementItem(item.produtoId)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantidade}</span>
                  <Button
                    size="sm"
                    variant="success"
                    className="min-h-11 w-11 p-0"
                    onClick={() =>
                      addItem({ produtoId: item.produtoId, nome: item.nome, preco: item.preco })
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-11 w-11 p-0 text-destructive"
                    onClick={() => removeItem(item.produtoId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between px-4 font-semibold">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
          {error && <p className="px-4 text-sm text-destructive">{error}</p>}
          <DrawerFooter className="gap-2">
            <Button
              size="lg"
              variant="success"
              className="h-12 w-full"
              onClick={handleConfirmar}
              disabled={sending || items.length === 0}
            >
              {sending ? 'Confirmando...' : 'Confirmar pedido'}
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="h-12 w-full"
              onClick={onClose}
              disabled={sending}
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      {obsItem && (
        <ObservacaoSheet open={!!obsItem} produtoId={obsItem} onClose={() => setObsItem(null)} />
      )}
    </>
  )
}
