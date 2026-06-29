export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-3 flex gap-6">
        <a href="/admin/menu" className="text-sm font-medium hover:text-primary">Cardápio</a>
        <a href="/admin/mesas" className="text-sm font-medium hover:text-primary">Mesas</a>
        <a href="/admin/pedidos" className="text-sm font-medium hover:text-primary">Pedidos</a>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
