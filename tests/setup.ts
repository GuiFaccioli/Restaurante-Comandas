import '@testing-library/jest-dom'

process.env.DEV_SKIP_AUTH = 'true'
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'file:./dev.db'
