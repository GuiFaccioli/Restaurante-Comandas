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
      size="lg"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 p-0"
      onClick={onClick}
    >
      <ShoppingCart className="h-6 w-6" />
      <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
        {total > 9 ? '9+' : total}
      </span>
    </Button>
  )
}
