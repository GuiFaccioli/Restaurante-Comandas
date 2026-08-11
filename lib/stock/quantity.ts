const STOCK_QUANTITY_SCALE = 1_000

export function stockQuantityToMillis(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Quantidade de estoque inválida')
    }
    const millis = Math.round(value * STOCK_QUANTITY_SCALE)
    if (
      !Number.isSafeInteger(millis) ||
      Math.abs(value * STOCK_QUANTITY_SCALE - millis) > 1e-9
    ) {
      throw new Error('Quantidade de estoque inválida')
    }
    return millis
  }

  const normalized = value.trim()
  const match = /^(-?)(\d+)(?:\.(\d{1,3}))?$/.exec(normalized)
  if (!match) throw new Error('Quantidade de estoque inválida')
  const sign = match[1] === '-' ? -1 : 1
  const whole = Number(match[2])
  const fraction = Number((match[3] ?? '').padEnd(3, '0'))
  const millis = sign * (whole * STOCK_QUANTITY_SCALE + fraction)
  if (!Number.isSafeInteger(millis)) {
    throw new Error('Quantidade de estoque inválida')
  }
  return millis
}

export function stockMillisToDecimal(millis: number): string {
  if (!Number.isSafeInteger(millis)) {
    throw new Error('Quantidade de estoque inválida')
  }
  const sign = millis < 0 ? '-' : ''
  const absolute = Math.abs(millis)
  const whole = Math.floor(absolute / STOCK_QUANTITY_SCALE)
  const fraction = String(absolute % STOCK_QUANTITY_SCALE).padStart(3, '0')
  return `${sign}${whole}.${fraction}`
}
