'use client'
import { useState } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { confirmarPedido } from '@/lib/actions/pedidos'
import { useCart } from '@/lib/store/cart'

type Props = {
  open: boolean
  onClose: () => void
  mesaId: string
  mesaNumero: number
  atendimentoId: string
}

export function CartDrawer({ open, onClose, mesaId, mesaNumero, atendimentoId }: Props) {
  const { items, total, removeItem, addItem, decrementItem, clearCart, setObservacao } = useCart()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingObservationItem, setEditingObservationItem] = useState<string | null>(null)

  async function handleConfirmar() {
    setSending(true)
    setError(null)
    try {
      await confirmarPedido(
        mesaId,
        atendimentoId,
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
                  <Button
                    type="button"
                    intent="informational"
                    appearance="link"
                    className="min-h-11 justify-start px-0 text-xs"
                    onClick={() => setEditingObservationItem((current) => current === item.produtoId ? null : item.produtoId)}
                  >
                    {editingObservationItem === item.produtoId ? 'Fechar edição' : 'Editar observação'}
                  </Button>
                  {editingObservationItem === item.produtoId ? (
                    <div className="mt-2 space-y-2">
                      <label htmlFor={`observacao-${item.produtoId}`} className="text-xs font-medium text-foreground">
                        Observação para a cozinha
                      </label>
                      <Textarea
                        id={`observacao-${item.produtoId}`}
                        autoFocus
                        className="min-h-24 resize-y text-sm"
                        placeholder="Ex.: sem cebola, sem tomate"
                        value={item.observacao ?? ''}
                        onChange={(event) => setObservacao(item.produtoId, event.target.value)}
                        rows={3}
                      />
                      <Button type="button" intent="positive" appearance="soft" size="sm" onClick={() => setEditingObservationItem(null)}>
                        Salvar observação
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    intent="neutral"
                    appearance="outline"
                    size="icon"
                    className="size-11"
                    aria-label={`Diminuir ${item.nome}`}
                    onClick={() => decrementItem(item.produtoId)}
                  >
                    <Minus aria-hidden="true" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantidade}</span>
                  <Button
                    type="button"
                    intent="positive"
                    appearance="soft"
                    size="icon"
                    className="size-11"
                    aria-label={`Adicionar mais ${item.nome}`}
                    onClick={() =>
                      addItem({ produtoId: item.produtoId, nome: item.nome, preco: item.preco })
                    }
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    intent="destructive"
                    appearance="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={`Remover ${item.nome} do carrinho`}
                    onClick={() => removeItem(item.produtoId)}
                  >
                    <Trash2 aria-hidden="true" />
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
              type="button"
              intent="positive"
              appearance="solid"
              size="lg"
              className="min-h-11 w-full"
              onClick={handleConfirmar}
              aria-busy={sending}
              disabled={sending || items.length === 0}
            >
              {sending ? 'Confirmando...' : 'Confirmar pedido'}
            </Button>
            <Button
              type="button"
              intent="destructive"
              appearance="outline"
              size="lg"
              className="min-h-11 w-full"
              onClick={onClose}
              disabled={sending}
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}
