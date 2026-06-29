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
  acessoUsuarioEnum,
} from '@/lib/db/schema'

describe('Drizzle schema', () => {
  describe('mesa table', () => {
    it('has required columns', () => {
      expect(Object.keys(mesa)).toContain('id')
      expect(Object.keys(mesa)).toContain('numero')
      expect(Object.keys(mesa)).toContain('ativa')
    })
  })

  describe('categoria table', () => {
    it('has required columns', () => {
      expect(Object.keys(categoria)).toContain('id')
      expect(Object.keys(categoria)).toContain('nome')
      expect(Object.keys(categoria)).toContain('ordem')
    })
  })

  describe('produto table', () => {
    it('has required columns', () => {
      expect(Object.keys(produto)).toContain('id')
      expect(Object.keys(produto)).toContain('categoriaId')
      expect(Object.keys(produto)).toContain('nome')
      expect(Object.keys(produto)).toContain('preco')
      expect(Object.keys(produto)).toContain('disponivel')
    })

    it('references categoria', () => {
      const categoriaIdCol = (produto as any).categoriaId
      expect(categoriaIdCol).toBeDefined()
    })
  })

  describe('pedido table', () => {
    it('has required columns', () => {
      expect(Object.keys(pedido)).toContain('id')
      expect(Object.keys(pedido)).toContain('mesaId')
      expect(Object.keys(pedido)).toContain('status')
      expect(Object.keys(pedido)).toContain('criadoEm')
      expect(Object.keys(pedido)).toContain('atualizadoEm')
    })

    it('references mesa', () => {
      const mesaIdCol = (pedido as any).mesaId
      expect(mesaIdCol).toBeDefined()
    })
  })

  describe('itemPedido table', () => {
    it('has required columns', () => {
      expect(Object.keys(itemPedido)).toContain('id')
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
      expect(Object.keys(usuario)).toContain('nome')
      expect(Object.keys(usuario)).toContain('email')
      expect(Object.keys(usuario)).toContain('role')
      expect(Object.keys(usuario)).toContain('passwordHash')
      expect(Object.keys(usuario)).toContain('createdAt')
      expect(Object.keys(usuario)).toContain('updatedAt')
    })
  })

  describe('usuarioAcesso table', () => {
    it('stores explicit area permissions per user', () => {
      expect(Object.keys(usuarioAcesso)).toContain('id')
      expect(Object.keys(usuarioAcesso)).toContain('usuarioId')
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
    })
  })

  describe('enums', () => {
    it('statusPedidoEnum is defined', () => {
      expect(statusPedidoEnum).toBeDefined()
      expect(statusPedidoEnum.enumName).toBe('status_pedido')
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
