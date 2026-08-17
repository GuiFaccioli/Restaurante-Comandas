import { and, asc, eq, exists, ilike, or } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { cliente, enderecoCliente } from '@/lib/db/schema'
import { requireAnyAccess } from '@/lib/auth/access'

export type CustomerSearchPagination = { page?: number; pageSize?: number }

export async function buscarClientes(query: string, pagination: CustomerSearchPagination = {}) {
  const page = Math.max(1, pagination.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, pagination.pageSize ?? 20))
  const term = query.trim()
  const normalizedDigits = term.replace(/\D/g, '')
  const { tenantId } = await requireAnyAccess(['admin', 'caixa'])
  const addressSearch = term
    ? exists(
        db.select({ id: enderecoCliente.id })
          .from(enderecoCliente)
          .where(and(
            eq(enderecoCliente.tenantId, tenantId),
            eq(enderecoCliente.clienteId, cliente.id),
            eq(enderecoCliente.ativo, true),
            or(
              ilike(enderecoCliente.rua, `%${term}%`),
              ilike(enderecoCliente.bairro, `%${term}%`),
              ilike(enderecoCliente.cidade, `%${term}%`),
              ...(normalizedDigits ? [ilike(enderecoCliente.cep, `%${normalizedDigits}%`)] : []),
            ),
          )),
      )
    : undefined
  const filter = term
    ? or(
        ilike(cliente.nome, `%${term}%`),
        ...(normalizedDigits ? [ilike(cliente.telefoneNormalizado, `%${normalizedDigits}%`)] : []),
        addressSearch,
      )
    : undefined
  return db.select({
    id: cliente.id, name: cliente.nome, phone: cliente.telefone, deliveryFee: cliente.taxaEntregaPadrao,
    active: cliente.ativo, addressId: enderecoCliente.id, street: enderecoCliente.rua, number: enderecoCliente.numero,
    neighborhood: enderecoCliente.bairro, city: enderecoCliente.cidade, postalCode: enderecoCliente.cep,
    complement: enderecoCliente.complemento, reference: enderecoCliente.referencia,
  }).from(cliente).leftJoin(enderecoCliente, and(eq(enderecoCliente.tenantId, tenantId), eq(enderecoCliente.clienteId, cliente.id), eq(enderecoCliente.ativo, true), eq(enderecoCliente.padrao, true)))
    .where(and(eq(cliente.tenantId, tenantId), ...(filter ? [filter] : [])))
    .orderBy(asc(cliente.nome)).limit(pageSize).offset((page - 1) * pageSize)
}
