/**
 * Seed an explicitly selected PostgreSQL development database.
 *
 * Run with:
 *   SEED_DATABASE_URL=postgresql://... ALLOW_DEV_SEED=true npm run db:seed
 *
 * DATABASE_URL is intentionally not used: seeding requires a separate explicit
 * target and acknowledgement so a normal development/production connection is
 * never modified by accident.
 */
import { loadEnvConfig } from '@next/env'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-serverless'
import WebSocket from 'ws'
import * as schema from '../lib/db/schema'
import { resolveRuntimeDatabaseUrl } from '../lib/db/database-url'
import { hashPassword } from '../lib/auth/password'
import { DEV_TEST_PASSWORD, DEV_TEST_USERS } from '../lib/dev/test-users'
import { DEFAULT_MENU_CATEGORIES } from '../lib/menu/default-menu'

const DEV_TENANT_ID = '00000000-0000-4000-8000-000000000001'
const DEV_USER_ID_PREFIX = '00000000-0000-4000-8000-0000000000'
const DEV_TENANT_USER_ID_PREFIX = '00000000-0000-4000-8000-0000000001'

function devUuid(prefix: string, index: number): string {
  return `${prefix}${String(index).padStart(2, '0')}`
}

function resolveSeedDatabaseUrl(): string {
  loadEnvConfig(process.cwd())

  if (process.env.ALLOW_DEV_SEED !== 'true') {
    throw new Error('Set ALLOW_DEV_SEED=true to acknowledge this development seed.')
  }
  if (!process.env.SEED_DATABASE_URL) {
    throw new Error('SEED_DATABASE_URL is required for db:seed.')
  }

  return resolveRuntimeDatabaseUrl(process.env.SEED_DATABASE_URL)
}

async function seed() {
  const databaseUrl = resolveSeedDatabaseUrl()
  if (!neonConfig.webSocketConstructor) neonConfig.webSocketConstructor = WebSocket

  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle({ client: pool, schema })
  const passwordHash = await hashPassword(DEV_TEST_PASSWORD)

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(schema.tenant)
        .values({ id: DEV_TENANT_ID, nome: 'Restaurante Dev', slug: 'restaurante-dev' })
        .onConflictDoUpdate({
          target: schema.tenant.slug,
          set: { nome: 'Restaurante Dev', status: 'active', updatedAt: new Date() },
        })

      for (const [index, user] of DEV_TEST_USERS.entries()) {
        const userId = devUuid(DEV_USER_ID_PREFIX, index + 1)
        const tenantUserId = devUuid(DEV_TENANT_USER_ID_PREFIX, index + 1)

        await tx
          .insert(schema.usuario)
          .values({
            id: userId,
            nome: user.name,
            email: user.email,
            role: user.access === 'admin' ? 'admin' : 'garcom',
            passwordHash,
          })
          .onConflictDoUpdate({
            target: schema.usuario.email,
            set: {
              nome: user.name,
              role: user.access === 'admin' ? 'admin' : 'garcom',
              passwordHash,
              updatedAt: new Date(),
            },
          })

        await tx
          .insert(schema.tenantUser)
          .values({ id: tenantUserId, tenantId: DEV_TENANT_ID, usuarioId: userId })
          .onConflictDoUpdate({
            target: schema.tenantUser.id,
            set: { tenantId: DEV_TENANT_ID, usuarioId: userId, status: 'active', updatedAt: new Date() },
          })

        await tx.delete(schema.usuarioAcesso).where(eq(schema.usuarioAcesso.usuarioId, userId))
        await tx.insert(schema.usuarioAcesso).values(
          user.accesses.map((access) => ({
            id: crypto.randomUUID(),
            tenantUserId,
            usuarioId: userId,
            acesso: access,
          })),
        )
      }

      for (let numero = 1; numero <= 10; numero += 1) {
        await tx
          .insert(schema.mesa)
          .values({ tenantId: DEV_TENANT_ID, numero })
          .onConflictDoNothing()
      }

      const categoryIdsByName = new Map<string, string>()
      for (const category of DEFAULT_MENU_CATEGORIES) {
        const [existingCategory] = await tx
          .select({ id: schema.categoria.id })
          .from(schema.categoria)
          .where(and(eq(schema.categoria.tenantId, DEV_TENANT_ID), eq(schema.categoria.nome, category.nome)))

        const categoryId = existingCategory?.id ?? crypto.randomUUID()
        if (existingCategory) {
          await tx
            .update(schema.categoria)
            .set({ ordem: category.ordem })
            .where(eq(schema.categoria.id, categoryId))
        } else {
          await tx.insert(schema.categoria).values({
            id: categoryId,
            tenantId: DEV_TENANT_ID,
            nome: category.nome,
            ordem: category.ordem,
          })
        }
        categoryIdsByName.set(category.nome, categoryId)
      }

      const stockItems = [
        { nome: 'Farinha', unidadeBase: 'g', unidadeCompra: 'kg', minimo: '5000.000', ideal: '15000.000', atual: '15000.000', custo: '0.0060' },
        { nome: 'Queijo mussarela', unidadeBase: 'g', unidadeCompra: 'kg', minimo: '2000.000', ideal: '8000.000', atual: '2000.000', custo: '0.0320' },
        { nome: 'Molho de tomate', unidadeBase: 'g', unidadeCompra: 'kg', minimo: '3000.000', ideal: '10000.000', atual: '1000.000', custo: '0.0120' },
        { nome: 'Refrigerante em lata', unidadeBase: 'unidade', unidadeCompra: 'unidade', minimo: null, ideal: null, atual: '0.000', custo: '4.5000' },
        { nome: 'Embalagem para pizza', unidadeBase: 'unidade', unidadeCompra: 'unidade', minimo: '20.000', ideal: '50.000', atual: '0.000', custo: '2.0000' },
      ]
      const stockItemIds = new Map<string, string>()
      for (const item of stockItems) {
        const [existing] = await tx.select({ id: schema.itemEstoque.id }).from(schema.itemEstoque).where(and(eq(schema.itemEstoque.tenantId, DEV_TENANT_ID), eq(schema.itemEstoque.nome, item.nome)))
        const itemId = existing?.id ?? crypto.randomUUID()
        stockItemIds.set(item.nome, itemId)
        const values = {
          tenantId: DEV_TENANT_ID,
          nome: item.nome,
          categoriaId: categoryIdsByName.get('Pizzas') ?? null,
          unidadeBase: item.unidadeBase,
          unidadeCompra: item.unidadeCompra,
          fatorCompraParaBase: item.unidadeBase === 'g' && item.unidadeCompra === 'kg' ? '1000.000' : '1.000',
          estoqueAtual: item.atual,
          estoqueMinimo: item.minimo,
          estoqueIdeal: item.ideal,
          custoUnitario: item.custo,
          ativo: true,
          atualizadoEm: new Date(),
        }
        if (existing) {
          await tx.update(schema.itemEstoque).set(values).where(eq(schema.itemEstoque.id, itemId))
        } else {
          await tx.insert(schema.itemEstoque).values({ id: itemId, ...values })
          await tx.insert(schema.movimentoEstoque).values({
            id: crypto.randomUUID(),
            tenantId: DEV_TENANT_ID,
            itemEstoqueId: itemId,
            tipo: 'entrada',
            quantidade: item.atual,
            saldoAnterior: '0.000',
            saldoResultante: item.atual,
            custoUnitario: item.custo,
            custoTotal: (Number(item.atual) * Number(item.custo)).toFixed(2),
            chaveIdempotencia: crypto.randomUUID(),
            observacao: 'Saldo inicial do seed',
          })
        }
      }

      for (const category of DEFAULT_MENU_CATEGORIES) {
        const categoryId = categoryIdsByName.get(category.nome)
        if (!categoryId) throw new Error(`Missing category id for ${category.nome}`)

        for (const product of category.produtos) {
          const [existingProduct] = await tx
            .select({ id: schema.produto.id })
            .from(schema.produto)
            .where(and(
              eq(schema.produto.tenantId, DEV_TENANT_ID),
              eq(schema.produto.categoriaId, categoryId),
              eq(schema.produto.nome, product.nome),
            ))

          if (existingProduct) {
            await tx
              .update(schema.produto)
              .set({
                descricao: product.descricao,
                preco: product.preco,
                imagemUrl: product.imagemUrl,
                disponivel: true,
              })
              .where(eq(schema.produto.id, existingProduct.id))
          } else {
            await tx.insert(schema.produto).values({
              id: crypto.randomUUID(),
              tenantId: DEV_TENANT_ID,
              categoriaId: categoryId,
              nome: product.nome,
              descricao: product.descricao,
              preco: product.preco,
              imagemUrl: product.imagemUrl,
              disponivel: true,
            })
          }
        }
      }

      const [recipeProduct] = await tx.select({ id: schema.produto.id }).from(schema.produto).where(and(eq(schema.produto.tenantId, DEV_TENANT_ID), eq(schema.produto.nome, 'Mussarela'))).limit(1)
      const cheeseId = stockItemIds.get('Queijo mussarela')
      const flourId = stockItemIds.get('Farinha')
      if (recipeProduct && cheeseId && flourId) {
        await tx.delete(schema.fichaTecnicaItem).where(and(eq(schema.fichaTecnicaItem.tenantId, DEV_TENANT_ID), eq(schema.fichaTecnicaItem.produtoId, recipeProduct.id)))
        await tx.insert(schema.fichaTecnicaItem).values([
          { id: crypto.randomUUID(), tenantId: DEV_TENANT_ID, produtoId: recipeProduct.id, itemEstoqueId: cheeseId, quantidade: '150.000' },
          { id: crypto.randomUUID(), tenantId: DEV_TENANT_ID, produtoId: recipeProduct.id, itemEstoqueId: flourId, quantidade: '250.000' },
        ])
        await tx.update(schema.produto).set({ controleEstoque: true }).where(eq(schema.produto.id, recipeProduct.id))
      }
    })
  } finally {
    await pool.end()
  }

  const productCount = DEFAULT_MENU_CATEGORIES.reduce(
    (total, category) => total + category.produtos.length,
    0,
  )
  console.log('Development PostgreSQL database seeded successfully.')
  console.log(`  - ${DEV_TEST_USERS.length} dev users (${DEV_TEST_USERS.map((user) => user.email).join(', ')})`)
  console.log(`  - Dev password: ${DEV_TEST_PASSWORD}`)
  console.log('  - 10 mesas')
  console.log(`  - ${DEFAULT_MENU_CATEGORIES.length} categorias`)
  console.log(`  - ${productCount} produtos`)
}

seed().catch((error) => {
  console.error('Seed failed:', error)
  process.exitCode = 1
})
