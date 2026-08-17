import { describe, expect, it } from 'vitest'
import {
  normalizeCustomerInput,
  normalizeDeliveryFee,
  normalizePhone,
  validateAddressInput,
} from '@/lib/customer/validation'

describe('customer validation', () => {
  it('requires a customer name and phone', () => {
    expect(() => normalizeCustomerInput({ name: ' ', phone: '' })).toThrow('Informe o nome do cliente')
    expect(() => normalizeCustomerInput({ name: 'Ana', phone: ' ' })).toThrow('Informe o telefone do cliente')
  })

  it('normalizes equivalent phone representations to the same value', () => {
    expect(normalizePhone('(11) 99999-8888')).toBe(normalizePhone('11999998888'))
  })

  it('requires street and number while preserving optional address fields', () => {
    expect(() => validateAddressInput({ street: '', number: '' })).toThrow('Informe a rua')
    expect(validateAddressInput({
      street: ' Rua A ', number: ' 10 ', neighborhood: ' Centro ', city: ' São Paulo ',
      postalCode: '01001-000', complement: 'Casa', reference: 'Portão azul',
    })).toEqual(expect.objectContaining({
      street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'São Paulo',
      postalCode: '01001000', complement: 'Casa', reference: 'Portão azul',
    }))
  })

  it('accepts a zero delivery fee', () => {
    expect(normalizeDeliveryFee('0')).toBe('0.00')
  })
})
