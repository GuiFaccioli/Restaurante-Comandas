import { Pool, neonConfig } from '@neondatabase/serverless'
import WebSocket from 'ws'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { migrateDatabase } from '@/lib/db/migration-runner'

const postgresUrl = process.env.TEST_POSTGRES_URL
const describePostgres = postgresUrl ? describe : describe.skip

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth/access', () => ({
  requireAccess: vi.fn(async () => ({
    usuarioId: '00000000-0000-0000-0000-000000000001',
    tenantId: '00000000-0000-0000-0000-000000000002',
    access: 'admin',
  })),
}))

describePostgres(
  'PostgreSQL orphaned user invitations (set TEST_POSTGRES_URL to enable)',
  () => {
    const schemaName = `user_invite_test_${crypto.randomUUID().replaceAll('-', '')}`
    const tenantId = '00000000-0000-0000-0000-000000000002'
    const adminUserId = '00000000-0000-0000-0000-000000000001'
    const adminMembershipId = '00000000-0000-0000-0000-000000000003'
    let scopedUrl: string
    let pool: Pool
    let cadastrarUsuarioAdmin: typeof import('@/lib/actions/usuarios').cadastrarUsuarioAdmin

    beforeAll(async () => {
      if (!postgresUrl) return
      if (!neonConfig.webSocketConstructor) {
        neonConfig.webSocketConstructor = WebSocket
      }

      const adminPool = new Pool({ connectionString: postgresUrl })
      await adminPool.query(`CREATE SCHEMA "${schemaName}"`)
      const parsed = new URL(postgresUrl)
      parsed.searchParams.set('options', `-c search_path=${schemaName},public`)
      scopedUrl = parsed.toString()
      await adminPool.end()

      await migrateDatabase(scopedUrl)
      process.env.DATABASE_URL = scopedUrl
      ;({ cadastrarUsuarioAdmin } = await import('@/lib/actions/usuarios'))
      pool = new Pool({ connectionString: scopedUrl })

      await pool.query(
        `INSERT INTO tenant (id, nome, slug)
         VALUES ($1, 'Invite Test', $2)`,
        [tenantId, `invite-test-${crypto.randomUUID()}`],
      )
      await pool.query(
        `INSERT INTO usuario (id, nome, email, role)
         VALUES ($1, 'Admin Test', 'admin-invite-test@example.test', 'admin')`,
        [adminUserId],
      )
      await pool.query(
        `INSERT INTO tenant_user (id, tenant_id, usuario_id, status)
         VALUES ($1, $2, $3, 'active')`,
        [adminMembershipId, tenantId, adminUserId],
      )
    })

    afterAll(async () => {
      if (!postgresUrl) return
      await pool?.end()
      const adminPool = new Pool({ connectionString: postgresUrl })
      await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
      await adminPool.end()
    })

    function form(email: string, accesses = ['caixa', 'garcom']): FormData {
      const data = new FormData()
      data.set('nome', 'Ana Admin')
      data.set('email', email)
      for (const access of accesses) data.append('acessos', access)
      return data
    }

    async function insertOrphan(email: string): Promise<string> {
      const orphanUserId = crypto.randomUUID()
      await pool.query(
        `INSERT INTO usuario (id, nome, email, password_hash)
         VALUES ($1, 'Orphaned User', $2, 'scrypt:old-password')`,
        [orphanUserId, email],
      )
      return orphanUserId
    }

    it('creates a new user and all invite records with valid foreign keys', async () => {
      const email = `orphan-${crypto.randomUUID()}@example.test`
      const orphanUserId = await insertOrphan(email)

      const result = await cadastrarUsuarioAdmin(form(email))
      const newUserId = (
        await pool.query<{ id: string }>(
          `SELECT id FROM usuario WHERE email = $1`,
          [email],
        )
      ).rows[0]?.id

      expect(newUserId).toBeTruthy()
      expect(newUserId).not.toBe(orphanUserId)
      expect(result.inviteUrl).toMatch(/\/convite\/[a-f0-9]{64}$/)

      const oldUser = await pool.query<{
        email: string
        auth_user_id: string | null
        password_hash: string | null
      }>(
        `SELECT email, auth_user_id, password_hash
           FROM usuario
          WHERE id = $1`,
        [orphanUserId],
      )
      expect(oldUser.rows).toEqual([{
        email: `removed-${orphanUserId}@invalid.local`,
        auth_user_id: null,
        password_hash: null,
      }])

      const membership = await pool.query<{
        id: string
        usuario_id: string
        status: string
      }>(
        `SELECT id, usuario_id, status
           FROM tenant_user
          WHERE tenant_id = $1 AND usuario_id = $2`,
        [tenantId, newUserId],
      )
      expect(membership.rows).toHaveLength(1)
      expect(membership.rows[0]).toMatchObject({ usuario_id: newUserId, status: 'active' })

      const accesses = await pool.query<{ usuario_id: string; acesso: string }>(
        `SELECT usuario_id, acesso
           FROM usuario_acesso
          WHERE tenant_user_id = $1
          ORDER BY acesso`,
        [membership.rows[0]?.id],
      )
      expect(accesses.rows).toEqual([
        { usuario_id: newUserId, acesso: 'caixa' },
        { usuario_id: newUserId, acesso: 'garcom' },
      ])

      const invite = await pool.query<{
        tenant_id: string
        tenant_user_id: string
        usuario_id: string
        criado_por_usuario_id: string
        email: string
      }>(
        `SELECT tenant_id, tenant_user_id, usuario_id, criado_por_usuario_id, email
           FROM usuario_convite
          WHERE tenant_id = $1 AND email = $2`,
        [tenantId, email],
      )
      expect(invite.rows).toEqual([{
        tenant_id: tenantId,
        tenant_user_id: membership.rows[0]?.id,
        usuario_id: newUserId,
        criado_por_usuario_id: adminUserId,
        email,
      }])
    })

    it('rolls back anonymization and dependent records when invite creation fails', async () => {
      const email = `rollback-${crypto.randomUUID()}@example.test`
      const orphanUserId = await insertOrphan(email)
      const blockerInviteId = crypto.randomUUID()

      await pool.query(
        `INSERT INTO usuario_convite (
           id, tenant_id, tenant_user_id, usuario_id, criado_por_usuario_id,
           email, token_hash, expira_em
         ) VALUES ($1, $2, $3, $4, $4, $5, $6, now() + interval '1 day')`,
        [
          blockerInviteId,
          tenantId,
          adminMembershipId,
          adminUserId,
          email,
          `blocker-${crypto.randomUUID()}`,
        ],
      )

      await expect(cadastrarUsuarioAdmin(form(email))).rejects.toBeDefined()

      const oldUser = await pool.query<{ email: string; password_hash: string | null }>(
        `SELECT email, password_hash FROM usuario WHERE id = $1`,
        [orphanUserId],
      )
      expect(oldUser.rows).toEqual([{
        email,
        password_hash: 'scrypt:old-password',
      }])

      const newUser = await pool.query<{ id: string }>(
        `SELECT id FROM usuario WHERE email = $1`,
        [email],
      )
      expect(newUser.rows).toEqual([{ id: orphanUserId }])

      const dependentRecords = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM tenant_user
          WHERE tenant_id = $1 AND usuario_id = $2`,
        [tenantId, orphanUserId],
      )
      expect(dependentRecords.rows[0]?.count).toBe('0')

      const orphanAccesses = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM usuario_acesso
          WHERE usuario_id = $1`,
        [orphanUserId],
      )
      expect(orphanAccesses.rows[0]?.count).toBe('0')

      const invites = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM usuario_convite
          WHERE tenant_id = $1 AND email = $2`,
        [tenantId, email],
      )
      expect(invites.rows[0]?.count).toBe('1')
    })
  },
)
