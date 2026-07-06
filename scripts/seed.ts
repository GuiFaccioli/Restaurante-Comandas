/**
 * Seed the local SQLite dev database with test data.
 * Run with: npm run db:seed
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../lib/db/schema-sqlite'
import { hashPassword } from '../lib/auth/password'
import { DEV_TEST_PASSWORD, DEV_TEST_USERS } from '../lib/dev/test-users'
import { DEFAULT_MENU_CATEGORIES } from '../lib/menu/default-menu'

const url = process.env.DATABASE_URL ?? 'file:./dev.db'
const dbPath = url.startsWith('file:') ? url.replace('file:', '') : './dev.db'

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

const db = drizzle(sqlite, { schema })
const DEV_TENANT_ID = '00000000-0000-4000-8000-000000000001'

async function seed() {
  console.log('Seeding dev database at', dbPath, '...')

  sqlite
    .prepare(
      `
      INSERT INTO tenant (id, nome, slug, status, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        nome = excluded.nome,
        status = excluded.status,
        updated_at = excluded.updated_at
    `
    )
    .run(DEV_TENANT_ID, 'Restaurante Dev', 'restaurante-dev', Date.now(), Date.now())

  const upsertUser = sqlite.prepare(`
    INSERT INTO usuario (id, nome, email, role, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      nome = excluded.nome,
      role = excluded.role,
      password_hash = excluded.password_hash,
      updated_at = excluded.updated_at
  `)
  const deleteAccesses = sqlite.prepare('DELETE FROM usuario_acesso WHERE usuario_id = ?')
  const upsertTenantUser = sqlite.prepare(`
    INSERT INTO tenant_user (id, tenant_id, usuario_id, status, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      updated_at = excluded.updated_at
  `)
  const insertAccess = sqlite.prepare(`
    INSERT INTO usuario_acesso (id, tenant_user_id, usuario_id, acesso)
    VALUES (?, ?, ?, ?)
  `)
  const passwordHash = await hashPassword(DEV_TEST_PASSWORD)
  const now = Date.now()

  for (const user of DEV_TEST_USERS) {
    const tenantUserId = `tu-${user.id}`
    upsertUser.run(user.id, user.name, user.email, user.access, passwordHash, now, now)
    upsertTenantUser.run(tenantUserId, DEV_TENANT_ID, user.id, now, now)
    deleteAccesses.run(user.id)

    for (const access of user.accesses) {
      insertAccess.run(crypto.randomUUID(), tenantUserId, user.id, access)
    }
  }

  // 10 mesas
  for (let i = 1; i <= 10; i++) {
    db.insert(schema.mesa).values({ tenantId: DEV_TENANT_ID, numero: i }).onConflictDoNothing().run()
  }

  const categoryIdsByName = new Map<string, string>()
  const existingCategories = db.select().from(schema.categoria).all()
  const updateCategoryOrder = sqlite.prepare('UPDATE categoria SET ordem = ? WHERE id = ? AND tenant_id = ?')

  for (const category of DEFAULT_MENU_CATEGORIES) {
    const existingCategory = existingCategories.find(
      (item) => item.nome === category.nome && item.tenantId === DEV_TENANT_ID
    )

    if (existingCategory) {
      updateCategoryOrder.run(category.ordem, existingCategory.id, DEV_TENANT_ID)
      categoryIdsByName.set(category.nome, existingCategory.id)
      continue
    }

    const id = crypto.randomUUID()
    db.insert(schema.categoria)
      .values({ id, tenantId: DEV_TENANT_ID, nome: category.nome, ordem: category.ordem })
      .run()
    categoryIdsByName.set(category.nome, id)
  }

  // Insert products only if they don't exist by name and category (idempotent).
  const insertProduct = sqlite.prepare(`
    INSERT INTO produto (id, tenant_id, categoria_id, nome, descricao, preco, imagem_url, disponivel)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT DO NOTHING
  `)
  const updateProduct = sqlite.prepare(`
    UPDATE produto SET imagem_url = ?, descricao = ?, preco = ? WHERE nome = ? AND categoria_id = ? AND tenant_id = ?
  `)
  const findProduct = sqlite.prepare('SELECT id FROM produto WHERE nome = ? AND categoria_id = ? AND tenant_id = ?')

  for (const category of DEFAULT_MENU_CATEGORIES) {
    const categoryId = categoryIdsByName.get(category.nome)
    if (!categoryId) throw new Error(`Missing category id for ${category.nome}`)

    for (const product of category.produtos) {
      const existingProduct = findProduct.get(product.nome, categoryId, DEV_TENANT_ID)

      if (!existingProduct) {
        insertProduct.run(
          crypto.randomUUID(),
          DEV_TENANT_ID,
          categoryId,
          product.nome,
          product.descricao,
          product.preco,
          product.imagemUrl
        )
        continue
      }

      updateProduct.run(
        product.imagemUrl,
        product.descricao,
        product.preco,
        product.nome,
        categoryId,
        DEV_TENANT_ID
      )
    }
  }

  const productCount = DEFAULT_MENU_CATEGORIES.reduce(
    (total, category) => total + category.produtos.length,
    0
  )

  console.log('Done! Database seeded successfully.')
  console.log(`  - ${DEV_TEST_USERS.length} dev users (${DEV_TEST_USERS.map((user) => user.email).join(', ')})`)
  console.log(`  - Dev password: ${DEV_TEST_PASSWORD}`)
  console.log('  - 10 mesas')
  console.log(`  - ${DEFAULT_MENU_CATEGORIES.length} categorias (${DEFAULT_MENU_CATEGORIES.map((category) => category.nome).join(', ')})`)
  console.log(`  - ${productCount} produtos`)

  sqlite.close()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
