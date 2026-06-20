/**
 * Seed the local SQLite dev database with test data.
 * Run with: npm run db:seed
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../lib/db/schema-sqlite'

const url = process.env.DATABASE_URL ?? 'file:./dev.db'
const dbPath = url.startsWith('file:') ? url.replace('file:', '') : './dev.db'

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

const db = drizzle(sqlite, { schema })

async function seed() {
  console.log('Seeding dev database at', dbPath, '...')

  // Dev admin user
  db.insert(schema.usuario)
    .values({
      id: 'dev-user-001',
      nome: 'Admin Dev',
      email: 'dev@local.com',
      role: 'admin',
    })
    .onConflictDoNothing()
    .run()

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
    { nome: 'Margherita', descricao: 'Molho, mussarela e manjericão', preco: '38.90' },
    { nome: 'Pepperoni', descricao: 'Molho, mussarela e pepperoni', preco: '44.90' },
    { nome: 'Quatro Queijos', descricao: 'Molho, mussarela, parmesão, gorgonzola e provolone', preco: '46.90' },
  ]

  for (const p of pizzas) {
    db.insert(schema.produto)
      .values({ categoriaId: pizzaId!, ...p })
      .onConflictDoNothing()
      .run()
  }

  const bebidas = [
    { nome: 'Coca-Cola 350ml', preco: '6.00' },
    { nome: 'Água com gás', preco: '4.00' },
    { nome: 'Suco de laranja', preco: '8.00' },
  ]

  for (const b of bebidas) {
    db.insert(schema.produto)
      .values({ categoriaId: bebidaId!, ...b })
      .onConflictDoNothing()
      .run()
  }

  console.log('Done! Database seeded successfully.')
  console.log('  - 1 admin user (dev-user-001)')
  console.log('  - 10 mesas')
  console.log('  - 2 categorias (Pizzas, Bebidas)')
  console.log('  - 6 produtos (3 pizzas, 3 bebidas)')

  sqlite.close()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
