import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  text,
  boolean,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core'

// ============================================================
// Enums
// ============================================================

export const statusPedidoEnum = pgEnum('status_pedido', [
  'novo',
  'em_preparo',
  'pronto',
  'entregue',
])

export const roleUsuarioEnum = pgEnum('role_usuario', ['garcom', 'admin'])
export const acessoUsuarioEnum = pgEnum('acesso_usuario', [
  'admin',
  'caixa',
  'cozinha',
  'garcom',
])

// ============================================================
// TypeScript Type Exports
// ============================================================

export type StatusPedido = 'novo' | 'em_preparo' | 'pronto' | 'entregue'
export type RoleUsuario = 'garcom' | 'admin'
export type AcessoUsuario = 'admin' | 'caixa' | 'cozinha' | 'garcom'

// ============================================================
// Tables
// ============================================================

export const mesa = pgTable('mesa', {
  id: uuid('id').primaryKey().defaultRandom(),
  numero: integer('numero').notNull().unique(),
  ativa: boolean('ativa').notNull().default(true),
})

export const categoria = pgTable('categoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  ordem: integer('ordem').notNull().default(0),
})

export const produto = pgTable('produto', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoriaId: uuid('categoria_id')
    .notNull()
    .references(() => categoria.id),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  preco: numeric('preco', { precision: 10, scale: 2 }).notNull(),
  disponivel: boolean('disponivel').notNull().default(true),
  imagemUrl: text('imagem_url'),
})

export const pedido = pgTable('pedido', {
  id: uuid('id').primaryKey().defaultRandom(),
  mesaId: uuid('mesa_id')
    .notNull()
    .references(() => mesa.id),
  status: statusPedidoEnum('status').notNull().default('novo'),
  criadoEm: timestamp('criado_em', { withTimezone: true })
    .notNull()
    .defaultNow(),
  entregueEm: timestamp('entregue_em', { withTimezone: true }),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const itemPedido = pgTable('item_pedido', {
  id: uuid('id').primaryKey().defaultRandom(),
  pedidoId: uuid('pedido_id')
    .notNull()
    .references(() => pedido.id, { onDelete: 'cascade' }),
  produtoId: uuid('produto_id')
    .notNull()
    .references(() => produto.id),
  quantidade: integer('quantidade').notNull(),
  precoUnitario: numeric('preco_unitario', { precision: 10, scale: 2 })
    .notNull(),
  observacao: text('observacao'),
})

export const usuario = pgTable('usuario', {
  id: uuid('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  role: roleUsuarioEnum('role').notNull().default('garcom'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const usuarioAcesso = pgTable('usuario_acesso', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  acesso: acessoUsuarioEnum('acesso').notNull(),
})

export const authSession = pgTable('auth_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
