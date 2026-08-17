'use server'

import { and, eq } from 'drizzle-orm'
import { runInDbTransaction } from '@/lib/db/index'
import { cliente, enderecoCliente } from '@/lib/db/schema'
import { requireAnyAccess } from '@/lib/auth/access'
import { normalizeCustomerInput, validateAddressInput, type AddressInput } from '@/lib/customer/validation'
import { buscarClientes as buscarClientesQuery, type CustomerSearchPagination } from '@/lib/customer/queries'

export async function buscarClientes(query: string, pagination: CustomerSearchPagination = {}) {
  return buscarClientesQuery(query, pagination)
}

export type CreateCustomerInput = {
  name: string
  phone: string
  deliveryFee?: string | number
  defaultAddress: AddressInput
}

export type EditCustomerInput = CreateCustomerInput & { id: string }

function duplicatePhoneError(error: unknown): never {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    throw new Error('Já existe um cliente com este telefone neste restaurante')
  }
  throw error
}

export async function criarCliente(input: CreateCustomerInput): Promise<{ id: string }> {
  const { tenantId } = await requireAnyAccess(['admin', 'caixa'])
  const customer = normalizeCustomerInput(input)
  const address = validateAddressInput(input.defaultAddress)
  try {
    return await runInDbTransaction({
      postgresOperation: async (tx) => {
        const [created] = await tx.insert(cliente).values({
          id: crypto.randomUUID(), tenantId, nome: customer.name, telefone: customer.phone,
          telefoneNormalizado: customer.normalizedPhone, taxaEntregaPadrao: customer.deliveryFee, ativo: true,
        }).returning({ id: cliente.id })
        if (!created) throw new Error('Não foi possível criar o cliente')
        await tx.insert(enderecoCliente).values({
          id: crypto.randomUUID(), tenantId, clienteId: created.id, ...mapAddress(address), padrao: true, ativo: true,
        })
        return { id: created.id }
      },
    })
  } catch (error) {
    duplicatePhoneError(error)
  }
}

export async function editarCliente(input: EditCustomerInput): Promise<void> {
  const { tenantId } = await requireAnyAccess(['admin', 'caixa'])
  const customer = normalizeCustomerInput(input)
  const address = validateAddressInput(input.defaultAddress)
  await runInDbTransaction({
    postgresOperation: async (tx) => {
      const [updated] = await tx.update(cliente).set({
        nome: customer.name, telefone: customer.phone, telefoneNormalizado: customer.normalizedPhone,
        taxaEntregaPadrao: customer.deliveryFee, atualizadoEm: new Date(),
      }).where(and(eq(cliente.id, input.id), eq(cliente.tenantId, tenantId))).returning({ id: cliente.id })
      if (!updated) throw new Error('Cliente não encontrado neste restaurante')
      await tx.update(enderecoCliente).set({ padrao: false, atualizadoEm: new Date() }).where(and(eq(enderecoCliente.clienteId, input.id), eq(enderecoCliente.tenantId, tenantId), eq(enderecoCliente.ativo, true)))
      await tx.insert(enderecoCliente).values({ id: crypto.randomUUID(), tenantId, clienteId: input.id, ...mapAddress(address), padrao: true, ativo: true })
    },
  })
}

export async function inativarCliente(id: string): Promise<void> {
  const { tenantId } = await requireAnyAccess(['admin', 'caixa'])
  await updateCustomerStatus(id, tenantId, false)
}

export async function reativarCliente(id: string): Promise<void> {
  const { tenantId } = await requireAnyAccess(['admin', 'caixa'])
  await updateCustomerStatus(id, tenantId, true)
}

function mapAddress(address: ReturnType<typeof validateAddressInput>) {
  return { rua: address.street, numero: address.number, bairro: address.neighborhood, cidade: address.city, cep: address.postalCode, complemento: address.complement, referencia: address.reference }
}

async function updateCustomerStatus(id: string, tenantId: string, ativo: boolean): Promise<void> {
  await runInDbTransaction({
    postgresOperation: async (tx) => {
      const [updated] = await tx.update(cliente).set({ ativo, atualizadoEm: new Date() }).where(and(eq(cliente.id, id), eq(cliente.tenantId, tenantId))).returning({ id: cliente.id })
      if (!updated) throw new Error('Cliente não encontrado neste restaurante')
    },
  })
}
