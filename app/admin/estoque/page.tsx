import { redirect } from 'next/navigation'

export default async function EstoqueAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ produtoId?: string }>
}) {
  const params = await searchParams
  redirect(params.produtoId ? `/admin/estoque/ficha-tecnica?produtoId=${encodeURIComponent(params.produtoId)}` : '/admin/estoque/itens')
}
