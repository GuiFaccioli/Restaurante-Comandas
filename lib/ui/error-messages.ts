const TECHNICAL_ERROR_PATTERNS = [
  /postgres|postgreSQL|database|sql|drizzle|neon/i,
  /constraint|duplicate key|violates|relation .* does not exist/i,
  /ECONN|ENOTFOUND|ETIMEDOUT|fetch failed|HTTP \d{3}/i,
  /NEXT_|stack trace|at [\w$]+\s*\(/i,
]

function isTechnicalMessage(message: string) {
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export function userFacingErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback

  const message = error.message.trim()
  if (!message || message.length > 240 || isTechnicalMessage(message)) return fallback
  return message
}
