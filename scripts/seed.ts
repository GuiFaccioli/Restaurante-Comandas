/**
 * Seed the local SQLite dev database with test data.
 * Run with: npm run db:seed
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../lib/db/schema-sqlite'
import { hashPassword } from '../lib/auth/password'
import { DEV_TEST_PASSWORD, DEV_TEST_USERS } from '../lib/dev/test-users'

const url = process.env.DATABASE_URL ?? 'file:./dev.db'
const dbPath = url.startsWith('file:') ? url.replace('file:', '') : './dev.db'

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

const db = drizzle(sqlite, { schema })

async function seed() {
  console.log('Seeding dev database at', dbPath, '...')

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
  const insertAccess = sqlite.prepare(`
    INSERT INTO usuario_acesso (id, usuario_id, acesso)
    VALUES (?, ?, ?)
  `)
  const passwordHash = await hashPassword(DEV_TEST_PASSWORD)
  const now = Date.now()

  for (const user of DEV_TEST_USERS) {
    upsertUser.run(user.id, user.name, user.email, user.access, passwordHash, now, now)
    deleteAccesses.run(user.id)

    for (const access of user.accesses) {
      insertAccess.run(crypto.randomUUID(), user.id, access)
    }
  }

  // 10 mesas
  for (let i = 1; i <= 10; i++) {
    db.insert(schema.mesa).values({ numero: i }).onConflictDoNothing().run()
  }

  // Categorias
  let pizzaId: string | undefined
  let bebidaId: string | undefined

  const existingCats = db.select().from(schema.categoria).all()
  const pizzaCat = existingCats.find((c) => c.nome === 'Pizzas')
  const bebidaCat = existingCats.find((c) => c.nome === 'Bebidas')

  if (!pizzaCat) {
    const id = crypto.randomUUID()
    db.insert(schema.categoria).values({ id, nome: 'Pizzas', ordem: 0 }).run()
    pizzaId = id
  } else {
    pizzaId = pizzaCat.id
  }

  if (!bebidaCat) {
    const id = crypto.randomUUID()
    db.insert(schema.categoria).values({ id, nome: 'Bebidas', ordem: 1 }).run()
    bebidaId = id
  } else {
    bebidaId = bebidaCat.id
  }

  // Produtos
  const pizzas = [
    {
      nome: 'Margherita',
      descricao: 'Molho de tomate, mussarela fresca e manjericão',
      preco: '38.90',
      imagemUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80',
    },
    {
      nome: 'Pepperoni',
      descricao: 'Molho de tomate, mussarela e pepperoni',
      preco: '44.90',
      imagemUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80',
    },
    {
      nome: 'Quatro Queijos',
      descricao: 'Mussarela, parmesão, gorgonzola e provolone',
      preco: '46.90',
      imagemUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
    },
  ]

  const bebidas = [
    {
      nome: 'Coca-Cola 350ml',
      descricao: 'Refrigerante gelado',
      preco: '6.00',
      imagemUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80',
    },
    {
      nome: 'Água com gás',
      descricao: 'Água mineral com gás 500ml',
      preco: '4.00',
      imagemUrl: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=400&q=80',
    },
    {
      nome: 'Suco de laranja',
      descricao: 'Suco natural espremido na hora',
      preco: '8.00',
      imagemUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80',
    },
  ]

  // Insert products only if they don't exist by name (idempotent)
  const upsertProduto = sqlite.prepare(`
    INSERT INTO produto (id, categoria_id, nome, descricao, preco, imagem_url, disponivel)
    VALUES (?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT DO NOTHING
  `)
  const updateProduto = sqlite.prepare(`
    UPDATE produto SET imagem_url = ?, descricao = ? WHERE nome = ? AND categoria_id = ?
  `)

  for (const p of [...pizzas, ...bebidas]) {
    const catId = pizzas.includes(p as typeof pizzas[0]) ? pizzaId! : bebidaId!
    const exists = sqlite.prepare('SELECT id FROM produto WHERE nome = ? AND categoria_id = ?').get(p.nome, catId)
    if (!exists) {
      upsertProduto.run(crypto.randomUUID(), catId, p.nome, p.descricao ?? null, p.preco, p.imagemUrl)
    } else {
      updateProduto.run(p.imagemUrl, p.descricao ?? null, p.nome, catId)
    }
  }

  console.log('Done! Database seeded successfully.')
  console.log(`  - ${DEV_TEST_USERS.length} dev users (${DEV_TEST_USERS.map((user) => user.email).join(', ')})`)
  console.log(`  - Dev password: ${DEV_TEST_PASSWORD}`)
  console.log('  - 10 mesas')
  console.log('  - 2 categorias (Pizzas, Bebidas)')
  console.log('  - 6 produtos (3 pizzas, 3 bebidas)')

  sqlite.close()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
