import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export type StatusPedido = 'novo' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado'
export type RoleUsuario = 'garcom' | 'admin'
export type AcessoUsuario = 'admin' | 'caixa' | 'cozinha' | 'garcom'
export type TenantStatus = 'active' | 'inactive'
export type TenantUserStatus = 'active' | 'inactive'
export type FormaPagamento = 'dinheiro' | 'pix' | 'credito' | 'debito' | 'outro'
export type StatusPagamento = 'registrado' | 'estornado'

export const tenant = sqliteTable('tenant', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const mesa = sqliteTable('mesa', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenant.id),
  numero: integer('numero').notNull().unique(),
  ativa: integer('ativa', { mode: 'boolean' }).notNull().default(true),
})

export const categoria = sqliteTable('categoria', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenant.id),
  nome: text('nome').notNull(),
  ordem: integer('ordem').notNull().default(0),
})

export const produto = sqliteTable('produto', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenant.id),
  categoriaId: text('categoria_id').notNull().references(() => categoria.id),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  preco: text('preco').notNull(),
  disponivel: integer('disponivel', { mode: 'boolean' }).notNull().default(true),
  imagemUrl: text('imagem_url'),
})

export const pedido = sqliteTable('pedido', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenant.id),
  mesaId: text('mesa_id').notNull().references(() => mesa.id),
  createdByUserId: text('created_by_user_id').references(() => usuario.id, {
    onDelete: 'set null',
  }),
  status: text('status', { enum: ['novo', 'em_preparo', 'pronto', 'entregue', 'cancelado'] })
    .notNull()
    .default('novo'),
  criadoEm: integer('criado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  entregueEm: integer('entregue_em', { mode: 'timestamp' }),
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
  passwordHash: text('password_hash'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const tenantUser = sqliteTable('tenant_user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenant.id, { onDelete: 'cascade' }),
  usuarioId: text('usuario_id').notNull().references(() => usuario.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const usuarioAcesso = sqliteTable('usuario_acesso', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantUserId: text('tenant_user_id').references(() => tenantUser.id, { onDelete: 'cascade' }),
  usuarioId: text('usuario_id').notNull().references(() => usuario.id, { onDelete: 'cascade' }),
  acesso: text('acesso', { enum: ['admin', 'caixa', 'cozinha', 'garcom'] }).notNull(),
})

export const authSession = sqliteTable('auth_session', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  usuarioId: text('usuario_id').notNull().references(() => usuario.id, { onDelete: 'cascade' }),
  selectedTenantId: text('selected_tenant_id').references(() => tenant.id, { onDelete: 'set null' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const pagamentoPedido = sqliteTable('pagamento_pedido', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenant.id),
  pedidoId: text('pedido_id').notNull().references(() => pedido.id, { onDelete: 'cascade' }),
  registradoPorUsuarioId: text('registrado_por_usuario_id').notNull().references(() => usuario.id),
  formaPagamento: text('forma_pagamento', {
    enum: ['dinheiro', 'pix', 'credito', 'debito', 'outro'],
  }).notNull(),
  valor: text('valor').notNull(),
  status: text('status', { enum: ['registrado', 'estornado'] }).notNull().default('registrado'),
  observacao: text('observacao'),
  registradoEm: integer('registrado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})
