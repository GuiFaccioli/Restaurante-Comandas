type DateInput = Date | string | number

function toTime(value: DateInput): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatElapsedDuration(start: DateInput, now: DateInput = new Date()): string {
  const elapsedSeconds = Math.max(0, Math.floor((toTime(now) - toTime(start)) / 1000))
  const hours = Math.floor(elapsedSeconds / 3600)
  const minutes = Math.floor((elapsedSeconds % 3600) / 60)
  const seconds = elapsedSeconds % 60

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  return `${pad(minutes)}:${pad(seconds)}`
}
