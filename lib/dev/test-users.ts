import type { AcessoUsuario } from '@/lib/db/schema'

export const DEV_TEST_PASSWORD = 'dev123456'

export type DevTestUser = {
  id: string
  name: string
  email: string
  access: AcessoUsuario
  accesses: AcessoUsuario[]
}

export const DEV_TEST_USERS: DevTestUser[] = [
  {
    id: 'dev-user-admin',
    name: 'Admin Dev',
    email: 'admin@local.com',
    access: 'admin',
    accesses: ['admin'],
  },
  {
    id: 'dev-user-caixa',
    name: 'Caixa Dev',
    email: 'caixa@local.com',
    access: 'caixa',
    accesses: ['caixa'],
  },
  {
    id: 'dev-user-cozinha',
    name: 'Cozinha Dev',
    email: 'cozinha@local.com',
    access: 'cozinha',
    accesses: ['cozinha'],
  },
  {
    id: 'dev-user-garcom',
    name: 'Garçom Dev',
    email: 'garcom@local.com',
    access: 'garcom',
    accesses: ['garcom'],
  },
]
