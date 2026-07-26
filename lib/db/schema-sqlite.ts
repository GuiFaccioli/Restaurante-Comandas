import {
  check,
  foreignKey,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export type StatusPedido =
  | 'novo'
  | 'em_preparo'
  | 'pronto'
  | 'entregue'
  | 'cancelado'
export type RoleUsuario = 'garcom' | 'admin'
export type AcessoUsuario = 'admin' | 'caixa' | 'cozinha' | 'garcom'
export type TenantStatus = 'active' | 'inactive'
export type TenantUserStatus = 'active' | 'inactive'
export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'credito'
  | 'debito'
  | 'outro'
export type StatusPagamento = 'registrado' | 'estornado'
export type TipoMovimentoEstoque =
  | 'entrada'
  | 'perda'
  | 'contagem'
  | 'saida'
  | 'estorno'
  | 'ajuste'

export const tenant = sqliteTable('tenant', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status', { enum: ['active', 'inactive'] })
    .notNull()
    .default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const usuario = sqliteTable('usuario', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: ['garcom', 'admin'] })
    .notNull()
    .default('garcom'),
  passwordHash: text('password_hash'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const mesa = sqliteTable(
  'mesa',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenant.id),
    numero: integer('numero').notNull(),
    ativa: integer('ativa', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => [
    uniqueIndex('mesa_tenant_id_unique').on(table.tenantId, table.id),
    uniqueIndex('mesa_tenant_numero_unique').on(
      table.tenantId,
      table.numero,
    ),
  ],
)

export const categoria = sqliteTable(
  'categoria',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenant.id),
    nome: text('nome').notNull(),
    ordem: integer('ordem').notNull().default(0),
  },
  (table) => [
    uniqueIndex('categoria_tenant_id_unique').on(table.tenantId, table.id),
  ],
)

export const produto = sqliteTable(
  'produto',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenant.id),
    categoriaId: text('categoria_id').notNull(),
    nome: text('nome').notNull(),
    descricao: text('descricao'),
    preco: text('preco').notNull(),
    disponivel: integer('disponivel', { mode: 'boolean' })
      .notNull()
      .default(true),
    imagemUrl: text('imagem_url'),
    controleEstoque: integer('controle_estoque', { mode: 'boolean' })
      .notNull()
      .default(false),
  },
  (table) => [
    uniqueIndex('produto_tenant_id_unique').on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.categoriaId],
      foreignColumns: [categoria.tenantId, categoria.id],
      name: 'produto_tenant_categoria_fkey',
    }),
  ],
)

export const insumo = sqliteTable(
  'insumo',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    unidadeBase: text('unidade_base').notNull(),
    unidadeCompra: text('unidade_compra').notNull(),
    fatorCompraParaBase: text('fator_compra_para_base')
      .notNull()
      .default('1'),
    estoqueAtual: text('estoque_atual').notNull().default('0'),
    estoqueIdeal: text('estoque_ideal').notNull().default('0'),
    estoqueMinimo: text('estoque_minimo').notNull().default('0'),
    custoUnitario: text('custo_unitario'),
    ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => [
    uniqueIndex('insumo_tenant_id_unique').on(table.tenantId, table.id),
  ],
)

export const pedido = sqliteTable(
  'pedido',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenant.id),
    mesaId: text('mesa_id').notNull(),
    createdByUserId: text('created_by_user_id').references(() => usuario.id, {
      onDelete: 'set null',
    }),
    status: text('status', {
      enum: ['novo', 'em_preparo', 'pronto', 'entregue', 'cancelado'],
    })
      .notNull()
      .default('novo'),
    criadoEm: integer('criado_em', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    entregueEm: integer('entregue_em', { mode: 'timestamp' }),
    atualizadoEm: integer('atualizado_em', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('pedido_tenant_id_unique').on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.mesaId],
      foreignColumns: [mesa.tenantId, mesa.id],
      name: 'pedido_tenant_mesa_fkey',
    }),
  ],
)

export const itemPedido = sqliteTable(
  'item_pedido',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text('tenant_id').references(() => tenant.id, {
      onDelete: 'cascade',
    }),
    pedidoId: text('pedido_id').notNull(),
    produtoId: text('produto_id').notNull(),
    quantidade: integer('quantidade').notNull(),
    precoUnitario: text('preco_unitario').notNull(),
    observacao: text('observacao'),
  },
  (table) => [
    uniqueIndex('item_pedido_tenant_id_unique').on(table.tenantId, table.id),
    uniqueIndex('item_pedido_tenant_pedido_id_unique').on(
      table.tenantId,
      table.pedidoId,
      table.id,
    ),
    foreignKey({
      columns: [table.tenantId, table.pedidoId],
      foreignColumns: [pedido.tenantId, pedido.id],
      name: 'item_pedido_tenant_pedido_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.tenantId, table.produtoId],
      foreignColumns: [produto.tenantId, produto.id],
      name: 'item_pedido_tenant_produto_fkey',
    }),
  ],
)

export const fichaTecnicaItem = sqliteTable(
  'ficha_tecnica_item',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    produtoId: text('produto_id').notNull(),
    insumoId: text('insumo_id').notNull(),
    quantidade: text('quantidade').notNull(),
  },
  (table) => [
    uniqueIndex('ficha_tecnica_tenant_produto_insumo_unique').on(
      table.tenantId,
      table.produtoId,
      table.insumoId,
    ),
    foreignKey({
      columns: [table.tenantId, table.produtoId],
      foreignColumns: [produto.tenantId, produto.id],
      name: 'ficha_tecnica_tenant_produto_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.tenantId, table.insumoId],
      foreignColumns: [insumo.tenantId, insumo.id],
      name: 'ficha_tecnica_tenant_insumo_fkey',
    }),
  ],
)

export const itemPedidoInsumo = sqliteTable(
  'item_pedido_insumo',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    pedidoId: text('pedido_id').notNull(),
    itemPedidoId: text('item_pedido_id').notNull(),
    insumoId: text('insumo_id').notNull(),
    quantidadeTotal: text('quantidade_total').notNull(),
  },
  (table) => [
    uniqueIndex('item_pedido_insumo_tenant_item_insumo_unique').on(
      table.tenantId,
      table.itemPedidoId,
      table.insumoId,
    ),
    foreignKey({
      columns: [table.tenantId, table.pedidoId],
      foreignColumns: [pedido.tenantId, pedido.id],
      name: 'item_pedido_insumo_tenant_pedido_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.tenantId, table.pedidoId, table.itemPedidoId],
      foreignColumns: [
        itemPedido.tenantId,
        itemPedido.pedidoId,
        itemPedido.id,
      ],
      name: 'item_pedido_insumo_tenant_pedido_item_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.tenantId, table.insumoId],
      foreignColumns: [insumo.tenantId, insumo.id],
      name: 'item_pedido_insumo_tenant_insumo_fkey',
    }),
  ],
)

export const tenantUser = sqliteTable('tenant_user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenant.id, { onDelete: 'cascade' }),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['active', 'inactive'] })
    .notNull()
    .default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const usuarioAcesso = sqliteTable('usuario_acesso', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantUserId: text('tenant_user_id').references(() => tenantUser.id, {
    onDelete: 'cascade',
  }),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  acesso: text('acesso', {
    enum: ['admin', 'caixa', 'cozinha', 'garcom'],
  }).notNull(),
})

export const authSession = sqliteTable('auth_session', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  selectedTenantId: text('selected_tenant_id').references(() => tenant.id, {
    onDelete: 'set null',
  }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const pagamentoPedido = sqliteTable(
  'pagamento_pedido',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenant.id),
    pedidoId: text('pedido_id').notNull(),
    registradoPorUsuarioId: text('registrado_por_usuario_id')
      .notNull()
      .references(() => usuario.id),
    formaPagamento: text('forma_pagamento', {
      enum: ['dinheiro', 'pix', 'credito', 'debito', 'outro'],
    }).notNull(),
    valor: text('valor').notNull(),
    status: text('status', { enum: ['registrado', 'estornado'] })
      .notNull()
      .default('registrado'),
    observacao: text('observacao'),
    registradoEm: integer('registrado_em', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('pagamento_pedido_tenant_pedido_registrado_unique')
      .on(table.tenantId, table.pedidoId)
      .where(sql`${table.status} = 'registrado'`),
    foreignKey({
      columns: [table.tenantId, table.pedidoId],
      foreignColumns: [pedido.tenantId, pedido.id],
      name: 'pagamento_pedido_tenant_pedido_fkey',
    }).onDelete('cascade'),
  ],
)

export const movimentoEstoque = sqliteTable(
  'movimento_estoque',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    insumoId: text('insumo_id').notNull(),
    tipo: text('tipo').notNull(),
    quantidade: text('quantidade').notNull(),
    saldoAnterior: text('saldo_anterior').notNull().default('0'),
    saldoResultante: text('saldo_resultante').notNull().default('0'),
    custoUnitario: text('custo_unitario'),
    custoTotal: text('custo_total'),
    pedidoId: text('pedido_id'),
    itemPedidoId: text('item_pedido_id'),
    chaveIdempotencia: text('chave_idempotencia').notNull(),
    motivo: text('motivo'),
    observacao: text('observacao'),
    criadoPorUsuarioId: text('criado_por_usuario_id').references(
      () => usuario.id,
      { onDelete: 'set null' },
    ),
    criadoEm: integer('criado_em', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    check(
      'movimento_estoque_item_requires_pedido_check',
      sql`${table.itemPedidoId} IS NULL OR ${table.pedidoId} IS NOT NULL`,
    ),
    uniqueIndex('movimento_estoque_tenant_chave_idempotencia_unique').on(
      table.tenantId,
      table.chaveIdempotencia,
    ),
    foreignKey({
      columns: [table.tenantId, table.insumoId],
      foreignColumns: [insumo.tenantId, insumo.id],
      name: 'movimento_estoque_tenant_insumo_fkey',
    }),
    foreignKey({
      columns: [table.tenantId, table.pedidoId],
      foreignColumns: [pedido.tenantId, pedido.id],
      name: 'movimento_estoque_tenant_pedido_fkey',
    }),
    foreignKey({
      columns: [table.tenantId, table.pedidoId, table.itemPedidoId],
      foreignColumns: [
        itemPedido.tenantId,
        itemPedido.pedidoId,
        itemPedido.id,
      ],
      name: 'movimento_estoque_tenant_pedido_item_fkey',
    }),
  ],
)
