import { describe, expect, it } from 'vitest'
import { DEV_TEST_PASSWORD, DEV_TEST_USERS } from '@/lib/dev/test-users'

describe('dev test users', () => {
  it('has one local test user for each application access', () => {
    expect(DEV_TEST_PASSWORD.length).toBeGreaterThanOrEqual(8)
    expect(DEV_TEST_USERS.map((user) => user.access).sort()).toEqual([
      'admin',
      'caixa',
      'cozinha',
      'garcom',
    ])
  })

  it('keeps one person tied to one permission for focused testing', () => {
    for (const user of DEV_TEST_USERS) {
      expect(user.id).toMatch(/^dev-user-/)
      expect(user.email).toBe(`${user.access}@local.com`)
      expect(user.accesses).toEqual([user.access])
    }
  })
})
