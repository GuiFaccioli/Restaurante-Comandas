-- ============================================================
-- Schema do Sistema de Gestão de Pizzaria
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- Mesas
-- ------------------------------------------------------------
CREATE TABLE mesa (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero      INTEGER NOT NULL UNIQUE,
  ativa       BOOLEAN NOT NULL DEFAULT true
);

-- ------------------------------------------------------------
-- Cardápio
-- ------------------------------------------------------------
CREATE TABLE categoria (
  id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome   TEXT NOT NULL,
  ordem  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE produto (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id UUID NOT NULL REFERENCES categoria(id),
  nome        TEXT NOT NULL,
  descricao   TEXT,
  preco       NUMERIC(10,2) NOT NULL,
  disponivel  BOOLEAN NOT NULL DEFAULT true,
  imagem_url  TEXT
);

-- ------------------------------------------------------------
-- Pedidos
-- ------------------------------------------------------------
CREATE TYPE status_pedido AS ENUM ('novo', 'em_preparo', 'pronto', 'entregue');

CREATE TABLE pedido (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mesa_id      UUID NOT NULL REFERENCES mesa(id),
  status       status_pedido NOT NULL DEFAULT 'novo',
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE item_pedido (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id       UUID NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  produto_id      UUID NOT NULL REFERENCES produto(id),
  quantidade      INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario  NUMERIC(10,2) NOT NULL,  -- snapshot do preço no momento do pedido
  observacao      TEXT
);

-- ------------------------------------------------------------
-- Usuários (espelha Neon Auth)
-- ------------------------------------------------------------
CREATE TYPE role_usuario AS ENUM ('garcom', 'admin');

CREATE TABLE usuario (
  id     UUID PRIMARY KEY,  -- mesmo ID do Neon Auth
  nome   TEXT NOT NULL,
  email  TEXT NOT NULL UNIQUE,
  role   role_usuario NOT NULL DEFAULT 'garcom'
);

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------
CREATE INDEX idx_pedido_mesa_id   ON pedido(mesa_id);
CREATE INDEX idx_pedido_status    ON pedido(status);
CREATE INDEX idx_item_pedido_id   ON item_pedido(pedido_id);
CREATE INDEX idx_produto_cat      ON produto(categoria_id);

-- ------------------------------------------------------------
-- Trigger: atualiza atualizado_em automaticamente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pedido_atualizado_em
  BEFORE UPDATE ON pedido
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
