'use client'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useCart } from '@/lib/store/cart'

type Props = { open: boolean; produtoId: string; onClose: () => void }

export function ObservacaoSheet({ open, produtoId, onClose }: Props) {
  const { items, setObservacao } = useCart()
  const item = items.find((i) => i.produtoId === produtoId)
  const [text, setText] = useState(item?.observacao ?? '')

  function handleSave() {
    setObservacao(produtoId, text)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Observação — {item?.nome}</SheetTitle>
        </SheetHeader>
        <Textarea
          className="mt-4 min-h-28"
          placeholder="Ex: sem cebola, bem passado…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
        <SheetFooter className="mt-4">
          <Button className="h-12 w-full" onClick={handleSave}>
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
