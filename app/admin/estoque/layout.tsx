import { InventoryNavigation } from '@/components/admin/inventory-navigation'

export default function EstoqueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <InventoryNavigation />
      {children}
    </div>
  )
}
