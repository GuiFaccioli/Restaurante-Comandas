'use client'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/store/cart'

export function CartFab({ onClick }: { onClick: () => void }) {
  const { items } = useCart()
  const total = items.reduce((acc, i) => acc + i.quantidade, 0)

  if (total === 0) return null

  return (
    <Button
      type="button"
      intent="neutral"
      appearance="solid"
      size="lg"
      aria-label="Abrir carrinho"
      className="fixed right-4 bottom-4 z-50 min-h-11 h-14 w-14 rounded-full p-0 shadow-lg sm:right-6 sm:bottom-6"
      onClick={onClick}
    >
      <ShoppingCart className="h-6 w-6" aria-hidden="true" />
      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted text-xs text-foreground">
        {total > 9 ? '9+' : total}
      </span>
    </Button>
  )
}
