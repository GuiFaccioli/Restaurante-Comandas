import { Pool, neonConfig, type PoolClient } from '@neondatabase/serverless'
import WebSocket from 'ws'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { migrateDatabase } from '@/lib/db/migration-runner'

const postgresUrl = process.env.TEST_POSTGRES_URL
const describePostgres = postgresUrl ? describe : describe.skip

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

describePostgres(
  'PostgreSQL payment idempotency (set TEST_POSTGRES_URL to enable)',
  () => {
    const schemaName = `payment_test_${crypto.randomUUID().replaceAll('-', '')}`
    let adminPool: Pool
    let scopedUrl: string

    beforeAll(async () => {
      if (!postgresUrl) return
      if (!neonConfig.webSocketConstructor) {
        neonConfig.webSocketConstructor = WebSocket
      }

      adminPool = new Pool({ connectionString: postgresUrl })
      await adminPool.query(`CREATE SCHEMA "${schemaName}"`)
      const parsed = new URL(postgresUrl)
      parsed.searchParams.set('options', `-c search_path=${schemaName},public`)
      scopedUrl = parsed.toString()
      await migrateDatabase(scopedUrl)
    })

    afterAll(async () => {
      if (!postgresUrl || !adminPool) return
      await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
      await adminPool.end()
    })

    async function createDeliveredOrder() {
      const tenantId = crypto.randomUUID()
      const userId = crypto.randomUUID()
      const mesaId = crypto.randomUUID()
      const atendimentoId = crypto.randomUUID()
      const pedidoId = crypto.randomUUID()
      const pool = new Pool({ connectionString: scopedUrl })

      try {
        await pool.query(
          `INSERT INTO tenant (id, nome, slug)
           VALUES ($1, 'Payment Test', $2)`,
          [tenantId, `payment-test-${crypto.randomUUID()}`],
        )
        await pool.query(
          `INSERT INTO usuario (id, nome, email)
           VALUES ($1, 'Payment User', $2)`,
          [userId, `payment-${crypto.randomUUID()}@example.test`],
        )
        await pool.query(
          `INSERT INTO mesa (id, tenant_id, numero)
           VALUES ($1, $2, 1)`,
          [mesaId, tenantId],
        )
        await pool.query(
          `INSERT INTO atendimento (id, tenant_id, mesa_id, status)
           VALUES ($1, $2, $3, 'awaiting_payment')`,
          [atendimentoId, tenantId, mesaId],
        )
        await pool.query(
          `INSERT INTO pedido (id, tenant_id, mesa_id, atendimento_id, created_by_user_id, status)
           VALUES ($1, $2, $3, $4, $5, 'entregue')`,
          [pedidoId, tenantId, mesaId, atendimentoId, userId],
        )
      } finally {
        await pool.end()
      }

      return { tenantId, userId, atendimentoId, pedidoId }
    }

    async function rollback(client: PoolClient): Promise<void> {
      try {
        await client.query('ROLLBACK')
      } catch {
        // The transaction may already have been committed or aborted.
      }
    }

    it('blocks a competing order lock and exposes only one registered payment', async () => {
      const { tenantId, userId, atendimentoId, pedidoId } = await createDeliveredOrder()
      const firstPool = new Pool({ connectionString: scopedUrl })
      const secondPool = new Pool({ connectionString: scopedUrl })
      const first = await firstPool.connect()
      const second = await secondPool.connect()

      try {
        await first.query('BEGIN')
        await second.query('BEGIN')
        await first.query(
          `SELECT id
             FROM pedido
            WHERE id = $1 AND tenant_id = $2
              FOR UPDATE`,
          [pedidoId, tenantId],
        )

        let competingLockResolved = false
        const competingLock = second.query(
          `SELECT id
             FROM pedido
            WHERE id = $1 AND tenant_id = $2
              FOR UPDATE`,
          [pedidoId, tenantId],
        ).then(() => {
          competingLockResolved = true
        })

        await wait(50)
        expect(competingLockResolved).toBe(false)

        await first.query(
          `INSERT INTO pagamento_pedido (
             tenant_id, pedido_id, atendimento_id, registrado_por_usuario_id, forma_pagamento, valor, status
           ) VALUES ($1, $2, $3, $4, 'pix', '48.00', 'registrado')`,
          [tenantId, pedidoId, atendimentoId, userId],
        )
        await first.query('COMMIT')

        await competingLock
        const activePayment = await second.query(
          `SELECT id
             FROM pagamento_pedido
            WHERE tenant_id = $1
              AND pedido_id = $2
              AND status = 'registrado'`,
          [tenantId, pedidoId],
        )
        expect(activePayment.rows).toHaveLength(1)

      } finally {
        await rollback(first)
        await rollback(second)
        first.release()
        second.release()
        await firstPool.end()
        await secondPool.end()
      }
    })

    it('allows a new registered payment after a reversed payment', async () => {
      const { tenantId, userId, atendimentoId, pedidoId } = await createDeliveredOrder()
      const pool = new Pool({ connectionString: scopedUrl })

      try {
        await pool.query(
          `INSERT INTO pagamento_pedido (
             tenant_id, pedido_id, atendimento_id, registrado_por_usuario_id, forma_pagamento, valor, status
           ) VALUES ($1, $2, $3, $4, 'pix', '48.00', 'estornado')`,
          [tenantId, pedidoId, atendimentoId, userId],
        )
        await pool.query(
          `INSERT INTO pagamento_pedido (
             tenant_id, pedido_id, atendimento_id, registrado_por_usuario_id, forma_pagamento, valor, status
           ) VALUES ($1, $2, $3, $4, 'pix', '48.00', 'registrado')`,
          [tenantId, pedidoId, atendimentoId, userId],
        )
      } finally {
        await pool.end()
      }
    })
  },
)
