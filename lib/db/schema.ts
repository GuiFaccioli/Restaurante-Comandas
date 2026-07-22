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
  'cancelado',
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
export const formaPagamentoEnum = pgEnum('forma_pagamento', [
  'dinheiro',
  'pix',
  'credito',
  'debito',
  'outro',
])
export const statusPagamentoEnum = pgEnum('status_pagamento', ['registrado', 'estornado'])

// ============================================================
// TypeScript Type Exports
// ============================================================

export type StatusPedido = 'novo' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado'
export type RoleUsuario = 'garcom' | 'admin'
export type AcessoUsuario = 'admin' | 'caixa' | 'cozinha' | 'garcom'
export type TenantStatus = 'active' | 'inactive'
export type TenantUserStatus = 'active' | 'inactive'
export type FormaPagamento = 'dinheiro' | 'pix' | 'credito' | 'debito' | 'outro'
export type StatusPagamento = 'registrado' | 'estornado'
export type TipoMovimentoEstoque =
  | 'entrada'
  | 'perda'
  | 'contagem'
  | 'saida'
  | 'estorno'
  | 'ajuste'

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
  controleEstoque: boolean('controle_estoque').notNull().default(false),
})

export const insumo = pgTable('insumo', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  unidadeBase: text('unidade_base').notNull(),
  unidadeCompra: text('unidade_compra').notNull(),
  fatorCompraParaBase: numeric('fator_compra_para_base', { precision: 12, scale: 3 }).notNull().default('1'),
  estoqueAtual: numeric('estoque_atual', { precision: 12, scale: 3 }).notNull().default('0'),
  estoqueIdeal: numeric('estoque_ideal', { precision: 12, scale: 3 }).notNull().default('0'),
  estoqueMinimo: numeric('estoque_minimo', { precision: 12, scale: 3 }).notNull().default('0'),
  custoUnitario: numeric('custo_unitario', { precision: 12, scale: 4 }),
  ativo: boolean('ativo').notNull().default(true),
})

export const fichaTecnicaItem = pgTable('ficha_tecnica_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id, { onDelete: 'cascade' }),
  produtoId: uuid('produto_id')
    .notNull()
    .references(() => produto.id, { onDelete: 'cascade' }),
  insumoId: uuid('insumo_id')
    .notNull()
    .references(() => insumo.id),
  quantidade: numeric('quantidade', { precision: 12, scale: 3 }).notNull(),
})

export const movimentoEstoque = pgTable('movimento_estoque', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id, { onDelete: 'cascade' }),
  insumoId: uuid('insumo_id')
    .notNull()
    .references(() => insumo.id),
  tipo: text('tipo').notNull(),
  quantidade: numeric('quantidade', { precision: 12, scale: 3 }).notNull(),
  saldoAnterior: numeric('saldo_anterior', { precision: 12, scale: 3 }).notNull().default('0'),
  saldoResultante: numeric('saldo_resultante', { precision: 12, scale: 3 }).notNull().default('0'),
  custoUnitario: numeric('custo_unitario', { precision: 12, scale: 4 }),
  custoTotal: numeric('custo_total', { precision: 12, scale: 2 }),
  pedidoId: uuid('pedido_id').references(() => pedido.id, { onDelete: 'set null' }),
  itemPedidoId: uuid('item_pedido_id').references(() => itemPedido.id, { onDelete: 'set null' }),
  chaveIdempotencia: text('chave_idempotencia').notNull().unique(),
  motivo: text('motivo'),
  observacao: text('observacao'),
  criadoPorUsuarioId: uuid('criado_por_usuario_id').references(() => usuario.id, { onDelete: 'set null' }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const pedido = pgTable('pedido', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  mesaId: uuid('mesa_id')
    .notNull()
    .references(() => mesa.id),
  createdByUserId: uuid('created_by_user_id').references(() => usuario.id, {
    onDelete: 'set null',
  }),
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

export const pagamentoPedido = pgTable('pagamento_pedido', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  pedidoId: uuid('pedido_id')
    .notNull()
    .references(() => pedido.id, { onDelete: 'cascade' }),
  registradoPorUsuarioId: uuid('registrado_por_usuario_id')
    .notNull()
    .references(() => usuario.id),
  formaPagamento: formaPagamentoEnum('forma_pagamento').notNull(),
  valor: numeric('valor', { precision: 10, scale: 2 }).notNull(),
  status: statusPagamentoEnum('status').notNull().default('registrado'),
  observacao: text('observacao'),
  registradoEm: timestamp('registrado_em', { withTimezone: true }).notNull().defaultNow(),
})
