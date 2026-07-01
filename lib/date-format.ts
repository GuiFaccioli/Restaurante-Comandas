const pedidoCriadoEmFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function formatPedidoCriadoEm(value: string | Date): string {
  return pedidoCriadoEmFormatter.format(new Date(value))
}
