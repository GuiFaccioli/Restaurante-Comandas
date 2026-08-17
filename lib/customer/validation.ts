export type CustomerInput = {
  name: string
  phone: string
  deliveryFee?: string | number
}

export type AddressInput = {
  street: string
  number: string
  neighborhood?: string
  city?: string
  postalCode?: string
  complement?: string
  reference?: string
}

export type NormalizedAddressInput = {
  street: string
  number: string
  neighborhood: string | null
  city: string | null
  postalCode: string | null
  complement: string | null
  reference: string | null
}

function optionalText(value: string | undefined): string | null {
  const normalized = value?.trim() ?? ''
  return normalized || null
}

export function normalizePhone(value: string): string {
  const normalized = value.replace(/\D/g, '')
  if (normalized.length < 10 || normalized.length > 15) {
    throw new Error('Informe um telefone válido')
  }
  return normalized
}

export function normalizeDeliveryFee(value: string | number | undefined): string {
  if (value === undefined || value === '') return '0.00'
  const normalized = String(value).trim().replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Informe uma taxa de entrega válida')
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0) throw new Error('A taxa de entrega não pode ser negativa')
  return amount.toFixed(2)
}

export function normalizeCustomerInput(input: CustomerInput) {
  const name = input.name.trim()
  if (!name) throw new Error('Informe o nome do cliente')
  if (!input.phone.trim()) throw new Error('Informe o telefone do cliente')
  return {
    name,
    phone: input.phone.trim(),
    normalizedPhone: normalizePhone(input.phone),
    deliveryFee: normalizeDeliveryFee(input.deliveryFee),
  }
}

export function validateAddressInput(input: AddressInput): NormalizedAddressInput {
  const street = input.street.trim()
  const number = input.number.trim()
  if (!street) throw new Error('Informe a rua')
  if (!number) throw new Error('Informe o número')
  return {
    street,
    number,
    neighborhood: optionalText(input.neighborhood),
    city: optionalText(input.city),
    postalCode: optionalText(input.postalCode)?.replace(/\D/g, '') || null,
    complement: optionalText(input.complement),
    reference: optionalText(input.reference),
  }
}

export const normalizarTelefone = normalizePhone
export const normalizarTaxaEntrega = normalizeDeliveryFee
export const validarEndereco = validateAddressInput
export const validarCliente = normalizeCustomerInput
