import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export type StatusPedido = 'novo' | 'em_preparo' | 'pronto' | 'entregue'
export type RoleUsuario = 'garcom' | 'admin'

export const mesa = sqliteTable('mesa', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  numero: integer('numero').notNull().unique(),
  ativa: integer('ativa', { mode: 'boolean' }).notNull().default(true),
})

export const categoria = sqliteTable('categoria', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  ordem: integer('ordem').notNull().default(0),
})

export const produto = sqliteTable('produto', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  categoriaId: text('categoria_id').notNull().references(() => categoria.id),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  preco: text('preco').notNull(),
  disponivel: integer('disponivel', { mode: 'boolean' }).notNull().default(true),
  imagemUrl: text('imagem_url'),
})

export const pedido = sqliteTable('pedido', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  mesaId: text('mesa_id').notNull().references(() => mesa.id),
  status: text('status', { enum: ['novo', 'em_preparo', 'pronto', 'entregue'] })
    .notNull()
    .default('novo'),
  criadoEm: integer('criado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const itemPedido = sqliteTable('item_pedido', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  pedidoId: text('pedido_id')
    .notNull()
    .references(() => pedido.id, { onDelete: 'cascade' }),
  produtoId: text('produto_id').notNull().references(() => produto.id),
  quantidade: integer('quantidade').notNull(),
  precoUnitario: text('preco_unitario').notNull(),
  observacao: text('observacao'),
})

export const usuario = sqliteTable('usuario', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: ['garcom', 'admin'] }).notNull().default('garcom'),
})
