'use client'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
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
          className="mt-4"
          placeholder="Ex: sem cebola, bem passado…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
        <SheetFooter className="mt-4">
          <Button className="w-full h-12" onClick={handleSave}>Salvar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
