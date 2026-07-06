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
export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'inactive'])
export const tenantUserStatusEnum = pgEnum('tenant_user_status', ['active', 'inactive'])

// ============================================================
// TypeScript Type Exports
// ============================================================

export type StatusPedido = 'novo' | 'em_preparo' | 'pronto' | 'entregue'
export type RoleUsuario = 'garcom' | 'admin'
export type AcessoUsuario = 'admin' | 'caixa' | 'cozinha' | 'garcom'
export type TenantStatus = 'active' | 'inactive'
export type TenantUserStatus = 'active' | 'inactive'

// ============================================================
// Tables
// ============================================================

export const tenant = pgTable('tenant', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  slug: text('slug').notNull().unique(),
  status: tenantStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const mesa = pgTable('mesa', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  numero: integer('numero').notNull().unique(),
  ativa: boolean('ativa').notNull().default(true),
})

export const categoria = pgTable('categoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  nome: text('nome').notNull(),
  ordem: integer('ordem').notNull().default(0),
})

export const produto = pgTable('produto', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
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
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
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

export const tenantUser = pgTable('tenant_user', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id, { onDelete: 'cascade' }),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  status: tenantUserStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const usuarioAcesso = pgTable('usuario_acesso', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantUserId: uuid('tenant_user_id').references(() => tenantUser.id, { onDelete: 'cascade' }),
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
  selectedTenantId: uuid('selected_tenant_id').references(() => tenant.id, { onDelete: 'set null' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
