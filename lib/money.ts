function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function formatBrazilianDecimal(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatCurrencyInput(value: string): string {
  const digits = onlyDigits(value)
  if (!digits) return ''

  return formatBrazilianDecimal(Number(digits))
}

export function normalizeCurrencyToDecimal(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Informe um preço válido')

  const sanitized = trimmed.replace(/[^\d,.-]/g, '')
  let normalized: string

  if (sanitized.includes(',')) {
    normalized = sanitized.replace(/\./g, '').replace(',', '.')
  } else {
    const dotParts = sanitized.split('.')
    if (dotParts.length === 2 && dotParts[1].length <= 2) {
      normalized = sanitized
    } else {
      normalized = sanitized.replace(/\./g, '')
    }
  }

  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Informe um preço válido')
  }

  return amount.toFixed(2)
}

export function formatDecimalAsCurrencyInput(value: string): string {
  return normalizeCurrencyToDecimal(value).replace('.', ',')
}
