import {
  boolean,
  check,
  foreignKey,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

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
export const tenantUserStatusEnum = pgEnum('tenant_user_status', [
  'active',
  'inactive',
])
export const formaPagamentoEnum = pgEnum('forma_pagamento', [
  'dinheiro',
  'pix',
  'credito',
  'debito',
  'outro',
])
export const statusPagamentoEnum = pgEnum('status_pagamento', [
  'registrado',
  'estornado',
])
export const statusAtendimentoEnum = pgEnum('status_atendimento', [
  'open',
  'awaiting_payment',
  'paid',
  'cancelled',
])

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
export type StatusAtendimento =
  | 'open'
  | 'awaiting_payment'
  | 'paid'
  | 'cancelled'
export type TipoMovimentoEstoque =
  | 'entrada'
  | 'perda'
  | 'contagem'
  | 'saida'
  | 'estorno'
  | 'ajuste'

export const tenant = pgTable('tenant', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  slug: text('slug').notNull().unique(),
  status: tenantStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const usuario = pgTable('usuario', {
  id: uuid('id').primaryKey(),
  authUserId: text('auth_user_id').unique(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  role: roleUsuarioEnum('role').notNull().default('garcom'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const mesa = pgTable(
  'mesa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id),
    numero: integer('numero').notNull(),
    ativa: boolean('ativa').notNull().default(true),
  },
  (table) => [
    uniqueIndex('mesa_tenant_id_unique').on(table.tenantId, table.id),
    uniqueIndex('mesa_tenant_numero_unique').on(
      table.tenantId,
      table.numero,
    ),
  ],
)

export const categoria = pgTable(
  'categoria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id),
    nome: text('nome').notNull(),
    ordem: integer('ordem').notNull().default(0),
  },
  (table) => [
    uniqueIndex('categoria_tenant_id_unique').on(table.tenantId, table.id),
  ],
)

export const produto = pgTable(
  'produto',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id),
    categoriaId: uuid('categoria_id').notNull(),
    nome: text('nome').notNull(),
    descricao: text('descricao'),
    preco: numeric('preco', { precision: 10, scale: 2 }).notNull(),
    disponivel: boolean('disponivel').notNull().default(true),
    imagemUrl: text('imagem_url'),
    controleEstoque: boolean('controle_estoque').notNull().default(false),
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

export const insumo = pgTable(
  'insumo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    unidadeBase: text('unidade_base').notNull(),
    unidadeCompra: text('unidade_compra').notNull(),
    fatorCompraParaBase: numeric('fator_compra_para_base', {
      precision: 12,
      scale: 3,
    })
      .notNull()
      .default('1'),
    estoqueAtual: numeric('estoque_atual', { precision: 12, scale: 3 })
      .notNull()
      .default('0'),
    estoqueIdeal: numeric('estoque_ideal', { precision: 12, scale: 3 })
      .notNull()
      .default('0'),
    estoqueMinimo: numeric('estoque_minimo', { precision: 12, scale: 3 })
      .notNull()
      .default('0'),
    custoUnitario: numeric('custo_unitario', { precision: 12, scale: 4 }),
    ativo: boolean('ativo').notNull().default(true),
  },
  (table) => [
    uniqueIndex('insumo_tenant_id_unique').on(table.tenantId, table.id),
  ],
)

export const shoppingListItem = pgTable(
  'shopping_list_item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    insumoId: uuid('insumo_id'),
    nome: text('nome').notNull(),
    unidade: text('unidade').notNull(),
    quantidadeSugerida: numeric('quantidade_sugerida', {
      precision: 12,
      scale: 3,
    }).notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'shopping_list_item_kind_check',
      sql`${table.kind} IN ('automatic', 'manual')`,
    ),
    check(
      'shopping_list_item_kind_insumo_check',
      sql`(${table.kind} = 'automatic' AND ${table.insumoId} IS NOT NULL) OR (${table.kind} = 'manual' AND ${table.insumoId} IS NULL)`,
    ),
    uniqueIndex('shopping_list_active_automatic_item_unique')
      .on(table.tenantId, table.insumoId)
      .where(sql`${table.kind} = 'automatic'`),
    foreignKey({
      columns: [table.tenantId, table.insumoId],
      foreignColumns: [insumo.tenantId, insumo.id],
      name: 'shopping_list_item_tenant_insumo_fkey',
    }),
  ],
)

export const atendimento = pgTable(
  'atendimento',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id),
    mesaId: uuid('mesa_id').notNull(),
    status: statusAtendimentoEnum('status').notNull().default('open'),
    abertoEm: timestamp('aberto_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
    aguardandoPagamentoEm: timestamp('aguardando_pagamento_em', { withTimezone: true }),
    fechadoEm: timestamp('fechado_em', { withTimezone: true }),
    abertoPorUsuarioId: uuid('aberto_por_usuario_id').references(() => usuario.id, {
      onDelete: 'set null',
    }),
    fechadoPorUsuarioId: uuid('fechado_por_usuario_id').references(() => usuario.id, {
      onDelete: 'set null',
    }),
    criadoEm: timestamp('criado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('atendimento_tenant_id_unique').on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.mesaId],
      foreignColumns: [mesa.tenantId, mesa.id],
      name: 'atendimento_tenant_mesa_fkey',
    }),
  ],
)

export const pedido = pgTable(
  'pedido',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id),
    mesaId: uuid('mesa_id').notNull(),
    atendimentoId: uuid('atendimento_id').notNull(),
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
  },
  (table) => [
    uniqueIndex('pedido_tenant_id_unique').on(table.tenantId, table.id),
    foreignKey({
      columns: [table.tenantId, table.mesaId],
      foreignColumns: [mesa.tenantId, mesa.id],
      name: 'pedido_tenant_mesa_fkey',
    }),
    foreignKey({
      columns: [table.tenantId, table.atendimentoId],
      foreignColumns: [atendimento.tenantId, atendimento.id],
      name: 'pedido_tenant_atendimento_fkey',
    }),
  ],
)

export const itemPedido = pgTable(
  'item_pedido',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenant.id, {
      onDelete: 'cascade',
    }),
    pedidoId: uuid('pedido_id').notNull(),
    produtoId: uuid('produto_id').notNull(),
    quantidade: integer('quantidade').notNull(),
    precoUnitario: numeric('preco_unitario', {
      precision: 10,
      scale: 2,
    }).notNull(),
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

export const fichaTecnicaItem = pgTable(
  'ficha_tecnica_item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    produtoId: uuid('produto_id').notNull(),
    insumoId: uuid('insumo_id').notNull(),
    quantidade: numeric('quantidade', { precision: 12, scale: 3 }).notNull(),
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

export const itemPedidoInsumo = pgTable(
  'item_pedido_insumo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    pedidoId: uuid('pedido_id').notNull(),
    itemPedidoId: uuid('item_pedido_id').notNull(),
    insumoId: uuid('insumo_id').notNull(),
    quantidadeTotal: numeric('quantidade_total', {
      precision: 12,
      scale: 3,
    }).notNull(),
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

export const tenantUser = pgTable('tenant_user', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id, { onDelete: 'cascade' }),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  status: tenantUserStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const usuarioAcesso = pgTable('usuario_acesso', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantUserId: uuid('tenant_user_id').references(() => tenantUser.id, {
    onDelete: 'cascade',
  }),
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
  selectedTenantId: uuid('selected_tenant_id').references(() => tenant.id, {
    onDelete: 'set null',
  }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const pagamentoPedido = pgTable(
  'pagamento_pedido',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id),
    pedidoId: uuid('pedido_id'),
    atendimentoId: uuid('atendimento_id').notNull(),
    registradoPorUsuarioId: uuid('registrado_por_usuario_id')
      .notNull()
      .references(() => usuario.id),
    formaPagamento: formaPagamentoEnum('forma_pagamento').notNull(),
    valor: numeric('valor', { precision: 10, scale: 2 }).notNull(),
    status: statusPagamentoEnum('status').notNull().default('registrado'),
    observacao: text('observacao'),
    registradoEm: timestamp('registrado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.pedidoId],
      foreignColumns: [pedido.tenantId, pedido.id],
      name: 'pagamento_pedido_tenant_pedido_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.tenantId, table.atendimentoId],
      foreignColumns: [atendimento.tenantId, atendimento.id],
      name: 'pagamento_pedido_tenant_atendimento_fkey',
    }).onDelete('cascade'),
  ],
)

export const movimentoEstoque = pgTable(
  'movimento_estoque',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenant.id, { onDelete: 'cascade' }),
    insumoId: uuid('insumo_id').notNull(),
    tipo: text('tipo').notNull(),
    quantidade: numeric('quantidade', { precision: 12, scale: 3 }).notNull(),
    saldoAnterior: numeric('saldo_anterior', {
      precision: 12,
      scale: 3,
    })
      .notNull()
      .default('0'),
    saldoResultante: numeric('saldo_resultante', {
      precision: 12,
      scale: 3,
    })
      .notNull()
      .default('0'),
    custoUnitario: numeric('custo_unitario', { precision: 12, scale: 4 }),
    custoTotal: numeric('custo_total', { precision: 12, scale: 2 }),
    pedidoId: uuid('pedido_id'),
    itemPedidoId: uuid('item_pedido_id'),
    chaveIdempotencia: text('chave_idempotencia').notNull(),
    motivo: text('motivo'),
    observacao: text('observacao'),
    criadoPorUsuarioId: uuid('criado_por_usuario_id').references(
      () => usuario.id,
      { onDelete: 'set null' },
    ),
    criadoEm: timestamp('criado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
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
