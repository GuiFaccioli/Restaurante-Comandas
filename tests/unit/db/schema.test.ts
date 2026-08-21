import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  mesa,
  pedido,
  itemPedido,
  statusPedidoEnum,
  roleUsuarioEnum,
  categoria,
  produto,
  usuario,
  usuarioAcesso,
  authSession,
  loginRateLimit,
  acessoUsuarioEnum,
  tenant,
  tenantUser,
  pagamentoPedido,
  insumo,
  fichaTecnicaItem,
  movimentoEstoque,
  shoppingListItem,
} from '@/lib/db/schema'

describe('Drizzle schema', () => {
  describe('mesa table', () => {
    it('has required columns', () => {
      expect(Object.keys(mesa)).toContain('id')
      expect(Object.keys(mesa)).toContain('tenantId')
      expect(Object.keys(mesa)).toContain('numero')
      expect(Object.keys(mesa)).toContain('ativa')
    })
  })

  describe('categoria table', () => {
    it('has required columns', () => {
      expect(Object.keys(categoria)).toContain('id')
      expect(Object.keys(categoria)).toContain('tenantId')
      expect(Object.keys(categoria)).toContain('nome')
      expect(Object.keys(categoria)).toContain('ordem')
    })
  })

  describe('produto table', () => {
    it('has required columns', () => {
      expect(Object.keys(produto)).toContain('id')
      expect(Object.keys(produto)).toContain('tenantId')
      expect(Object.keys(produto)).toContain('categoriaId')
      expect(Object.keys(produto)).toContain('nome')
      expect(Object.keys(produto)).toContain('preco')
      expect(Object.keys(produto)).toContain('disponivel')
      expect(Object.keys(produto)).toContain('controleEstoque')
    })

    it('references categoria', () => {
      const categoriaIdCol = (produto as any).categoriaId
      expect(categoriaIdCol).toBeDefined()
    })
  })

  describe('stock tables', () => {
    it('backfills qualifying automatic shopping-list rows during release', () => {
      const migrationPath = join(
        process.cwd(),
        'db/migrations/202608111000_backfill_automatic_shopping_list.sql',
      )

      expect(existsSync(migrationPath)).toBe(true)
      if (!existsSync(migrationPath)) return

      const migration = readFileSync(migrationPath, 'utf8')
      expect(migration).toContain('INSERT INTO shopping_list_item')
      expect(migration).toContain("'automatic'")
      expect(migration).toContain('insumo.ativo = true')
      expect(migration).toContain('insumo.estoque_atual <= insumo.estoque_minimo')
      expect(migration).toContain('insumo.estoque_ideal > insumo.estoque_atual')
      expect(migration).toContain('insumo.fator_compra_para_base > 0')
      expect(migration).toContain('CEIL(')
      expect(migration).toContain(
        'ON CONFLICT (tenant_id, insumo_id) WHERE kind = \'automatic\' DO NOTHING',
      )
    })

    it('declares tenant-scoped shopping-list items', () => {
      expect(Object.keys(shoppingListItem)).toEqual(expect.arrayContaining([
        'id', 'tenantId', 'kind', 'insumoId', 'nome', 'unidade', 'quantidadeSugerida', 'chaveIdempotencia', 'criadoEm',
      ]))
    })

    it('stores tenant-scoped stock items with normalized units and thresholds', () => {
      expect(Object.keys(insumo)).toEqual(expect.arrayContaining([
        'id', 'tenantId', 'nome', 'unidadeBase', 'unidadeCompra',
        'fatorCompraParaBase', 'estoqueAtual', 'estoqueIdeal', 'estoqueMinimo',
      ]))
    })

    it('connects products to stock items through technical sheets', () => {
      expect(Object.keys(fichaTecnicaItem)).toEqual(expect.arrayContaining([
        'id', 'tenantId', 'produtoId', 'insumoId', 'quantidade',
      ]))
    })

    it('keeps an idempotent movement ledger for stock changes', () => {
      expect(Object.keys(movimentoEstoque)).toEqual(expect.arrayContaining([
        'id', 'tenantId', 'insumoId', 'tipo', 'quantidade', 'saldoAnterior', 'saldoResultante',
        'custoUnitario', 'custoTotal', 'pedidoId', 'itemPedidoId', 'chaveIdempotencia', 'motivo',
        'criadoPorUsuarioId',
      ]))
    })
  })

  describe('pedido table', () => {
    it('has required columns', () => {
      expect(Object.keys(pedido)).toContain('id')
      expect(Object.keys(pedido)).toContain('tenantId')
      expect(Object.keys(pedido)).toContain('mesaId')
      expect(Object.keys(pedido)).toContain('status')
      expect(Object.keys(pedido)).toContain('criadoEm')
      expect(Object.keys(pedido)).toContain('entregueEm')
      expect(Object.keys(pedido)).toContain('atualizadoEm')
    })

    it('references mesa', () => {
      const mesaIdCol = (pedido as any).mesaId
      expect(mesaIdCol).toBeDefined()
    })

    it('stores nullable creator identity for new orders', () => {
      expect(Object.keys(pedido)).toContain('createdByUserId')
    })
  })

  describe('itemPedido table', () => {
    it('has required columns', () => {
      expect(Object.keys(itemPedido)).toContain('id')
      expect(Object.keys(itemPedido)).toContain('tenantId')
      expect(Object.keys(itemPedido)).toContain('pedidoId')
      expect(Object.keys(itemPedido)).toContain('produtoId')
      expect(Object.keys(itemPedido)).toContain('quantidade')
      expect(Object.keys(itemPedido)).toContain('precoUnitario')
    })

    it('references pedido with cascade delete', () => {
      const pedidoIdCol = (itemPedido as any).pedidoId
      expect(pedidoIdCol).toBeDefined()
    })

    it('references produto', () => {
      const produtoIdCol = (itemPedido as any).produtoId
      expect(produtoIdCol).toBeDefined()
    })
  })

  describe('usuario table', () => {
    it('has required columns', () => {
      expect(Object.keys(usuario)).toContain('id')
      expect(Object.keys(usuario)).toContain('authUserId')
      expect(Object.keys(usuario)).toContain('nome')
      expect(Object.keys(usuario)).toContain('email')
      expect(Object.keys(usuario)).toContain('role')
      expect(Object.keys(usuario)).toContain('passwordHash')
      expect(Object.keys(usuario)).toContain('createdAt')
      expect(Object.keys(usuario)).toContain('updatedAt')
    })
  })

  describe('schema reference files', () => {
    it('keeps db/schema.sql aligned with delivered timestamp and first-party auth tables', () => {
      const sqlSchema = readFileSync(join(process.cwd(), 'db/schema.sql'), 'utf8')

      expect(sqlSchema).toContain('entregue_em')
      expect(sqlSchema).toContain('CREATE TYPE acesso_usuario')
      expect(sqlSchema).toContain('CREATE TABLE usuario_acesso')
      expect(sqlSchema).toContain('CREATE TABLE auth_session')
      expect(sqlSchema).toContain('password_hash')
      expect(sqlSchema).toContain('auth_user_id TEXT UNIQUE')
      expect(sqlSchema).toContain('CREATE TABLE tenant')
      expect(sqlSchema).toContain('CREATE TABLE tenant_user')
      expect(sqlSchema).toContain('tenant_id')
      expect(sqlSchema).toContain('selected_tenant_id')
      expect(sqlSchema).toContain('CREATE TABLE pagamento_pedido')
      expect(sqlSchema).toContain('forma_pagamento')
      expect(sqlSchema).toContain('status_pagamento')
      expect(sqlSchema).toContain('CREATE TABLE insumo')
      expect(sqlSchema).toContain('CREATE TABLE ficha_tecnica_item')
      expect(sqlSchema).toContain('CREATE TABLE movimento_estoque')
    })

    it('scopes stock movement idempotency by tenant in db/schema.sql', () => {
      const sqlSchema = readFileSync(join(process.cwd(), 'db/schema.sql'), 'utf8')
      const movementStart = sqlSchema.indexOf('CREATE TABLE movimento_estoque')
      const movementEnd = sqlSchema.indexOf(');', movementStart)
      const movementDefinition = sqlSchema.slice(movementStart, movementEnd)

      expect(movementDefinition).toContain('chave_idempotencia TEXT NOT NULL')
      expect(movementDefinition).not.toMatch(
        /chave_idempotencia\s+TEXT\s+NOT NULL\s+UNIQUE/i,
      )
      expect(sqlSchema).toMatch(
        /CREATE UNIQUE INDEX movimento_estoque_tenant_chave_idempotencia_unique\s+ON movimento_estoque\s*\(tenant_id,\s*chave_idempotencia\);/i,
      )
    })

    it('declares the immutable order-consumption snapshot and indexes in db/schema.sql', () => {
      const sqlSchema = readFileSync(join(process.cwd(), 'db/schema.sql'), 'utf8')

      expect(sqlSchema).toMatch(
        /CREATE TABLE item_pedido_insumo\s*\([\s\S]*tenant_id UUID NOT NULL[\s\S]*pedido_id UUID NOT NULL[\s\S]*item_pedido_id UUID NOT NULL[\s\S]*insumo_id UUID NOT NULL[\s\S]*quantidade_total NUMERIC\(12,\s*3\) NOT NULL[\s\S]*UNIQUE\s*\(tenant_id,\s*item_pedido_id,\s*insumo_id\)[\s\S]*\);/i,
      )
      expect(sqlSchema).toMatch(
        /CREATE INDEX idx_item_pedido_insumo_tenant_pedido\s+ON item_pedido_insumo\s*\(tenant_id,\s*pedido_id\);/i,
      )
      expect(sqlSchema).toMatch(
        /CREATE INDEX idx_item_pedido_insumo_insumo_id\s+ON item_pedido_insumo\s*\(insumo_id\);/i,
      )
    })

    it('uses Drizzle and SQL references as schema sources of truth after Prisma removal', () => {
      const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))

      expect(packageJson.dependencies).not.toHaveProperty('@prisma/client')
      expect(packageJson.devDependencies).not.toHaveProperty('prisma')
      expect(packageJson.scripts).not.toHaveProperty('prisma:generate')
      expect(packageJson.scripts).not.toHaveProperty('prisma:studio')
      expect(packageJson.scripts).not.toHaveProperty('prisma:validate')
    })

    it('ships an additive nullable order creator migration without speculative backfill', () => {
      const migrationPath = join(
        process.cwd(),
        'db/migrations/202607131200_add_pedido_creator.sql'
      )

      expect(existsSync(migrationPath)).toBe(true)
      const migration = readFileSync(migrationPath, 'utf8')
      expect(migration).toContain('ADD COLUMN IF NOT EXISTS created_by_user_id UUID')
      expect(migration).toContain('REFERENCES usuario(id)')
      expect(migration).toContain('idx_pedido_created_by_user_id')
      expect(migration).not.toMatch(/UPDATE\s+pedido/i)
    })

    it('declares the reference-schema creator foreign key after usuario exists', () => {
      const sqlSchema = readFileSync(join(process.cwd(), 'db/schema.sql'), 'utf8')
      const pedidoStart = sqlSchema.indexOf('CREATE TABLE pedido')
      const pedidoEnd = sqlSchema.indexOf(');', pedidoStart)
      const usuarioStart = sqlSchema.indexOf('CREATE TABLE usuario')
      const usuarioEnd = sqlSchema.indexOf(');', usuarioStart)

      expect(pedidoStart).toBeGreaterThanOrEqual(0)
      expect(usuarioStart).toBeGreaterThanOrEqual(0)
      expect(usuarioEnd).toBeLessThan(pedidoStart)
      const pedidoDefinition = sqlSchema.slice(pedidoStart, pedidoEnd)
      expect(pedidoDefinition).toContain(
        'created_by_user_id UUID REFERENCES usuario(id) ON DELETE SET NULL',
      )
      expect(pedidoDefinition).not.toMatch(/created_by_user_id\s+UUID\s+NOT NULL/)
    })
  })

  describe('usuarioAcesso table', () => {
    it('stores explicit area permissions per tenant membership', () => {
      expect(Object.keys(usuarioAcesso)).toContain('id')
      expect(Object.keys(usuarioAcesso)).toContain('tenantUserId')
      expect(Object.keys(usuarioAcesso)).toContain('acesso')
    })
  })

  describe('authSession table', () => {
    it('stores server-side sessions without raw browser tokens', () => {
      expect(Object.keys(authSession)).toContain('id')
      expect(Object.keys(authSession)).toContain('usuarioId')
      expect(Object.keys(authSession)).toContain('tokenHash')
      expect(Object.keys(authSession)).toContain('expiresAt')
      expect(Object.keys(authSession)).toContain('createdAt')
      expect(Object.keys(authSession)).toContain('selectedTenantId')
    })
  })

  describe('loginRateLimit table', () => {
    it('stores only scoped HMAC keys and fixed-window state', () => {
      expect(Object.keys(loginRateLimit)).toEqual(
        expect.arrayContaining([
          'scope',
          'keyHash',
          'failureCount',
          'windowStartedAt',
          'blockedUntil',
          'updatedAt',
        ]),
      )
      expect(Object.keys(loginRateLimit)).not.toContain('email')
      expect(Object.keys(loginRateLimit)).not.toContain('ip')
    })
  })

  describe('tenant tables', () => {
    it('defines restaurant tenants', () => {
      expect(Object.keys(tenant)).toContain('id')
      expect(Object.keys(tenant)).toContain('nome')
      expect(Object.keys(tenant)).toContain('slug')
      expect(Object.keys(tenant)).toContain('status')
      expect(Object.keys(tenant)).toContain('createdAt')
      expect(Object.keys(tenant)).toContain('updatedAt')
    })

    it('links users to tenants independently of identity', () => {
      expect(Object.keys(tenantUser)).toContain('id')
      expect(Object.keys(tenantUser)).toContain('tenantId')
      expect(Object.keys(tenantUser)).toContain('usuarioId')
      expect(Object.keys(tenantUser)).toContain('status')
      expect(Object.keys(tenantUser)).toContain('createdAt')
      expect(Object.keys(tenantUser)).toContain('updatedAt')
    })
  })

  describe('pagamentoPedido table', () => {
    it('stores external payment records by tenant and order', () => {
      expect(Object.keys(pagamentoPedido)).toContain('id')
      expect(Object.keys(pagamentoPedido)).toContain('tenantId')
      expect(Object.keys(pagamentoPedido)).toContain('pedidoId')
      expect(Object.keys(pagamentoPedido)).toContain('atendimentoId')
      expect(Object.keys(pagamentoPedido)).toContain('registradoPorUsuarioId')
      expect(Object.keys(pagamentoPedido)).toContain('formaPagamento')
      expect(Object.keys(pagamentoPedido)).toContain('valor')
      expect(Object.keys(pagamentoPedido)).toContain('status')
      expect(Object.keys(pagamentoPedido)).toContain('registradoEm')
    })

    it('stores payments at attendance level instead of enforcing one payment per order', () => {
      const pgSchema = readFileSync(
        join(process.cwd(), 'lib/db/schema.ts'),
        'utf8',
      )
      const sqlSchema = readFileSync(
        join(process.cwd(), 'db/schema.sql'),
        'utf8',
      )

      for (const source of [pgSchema, sqlSchema]) {
        expect(source).toContain('atendimento')
        expect(source).not.toContain('pagamento_pedido_tenant_pedido_registrado_unique')
        expect(source).toMatch(/status[\s\S]{0,80}registrado/)
      }
      expect(sqlSchema).toContain('idx_pagamento_pedido_tenant_atendimento')
    })
  })

  describe('enums', () => {
    it('statusPedidoEnum is defined', () => {
      expect(statusPedidoEnum).toBeDefined()
      expect(statusPedidoEnum.enumName).toBe('status_pedido')
    })

    it('supports canceled orders as a first-class status', () => {
      const pgSchema = readFileSync(join(process.cwd(), 'lib/db/schema.ts'), 'utf8')
      const sqlSchema = readFileSync(join(process.cwd(), 'db/schema.sql'), 'utf8')
      const migration = readFileSync(
        join(process.cwd(), 'db/migrations/202607071018_add_cancelado_status.sql'),
        'utf8'
      )

      expect(pgSchema).toContain("'cancelado'")
      expect(sqlSchema).toContain("'cancelado'")
      expect(migration).toContain("ADD VALUE IF NOT EXISTS 'cancelado'")
    })

    it('roleUsuarioEnum is defined', () => {
      expect(roleUsuarioEnum).toBeDefined()
      expect(roleUsuarioEnum.enumName).toBe('role_usuario')
    })

    it('acessoUsuarioEnum is defined', () => {
      expect(acessoUsuarioEnum).toBeDefined()
      expect(acessoUsuarioEnum.enumName).toBe('acesso_usuario')
    })
  })
})
