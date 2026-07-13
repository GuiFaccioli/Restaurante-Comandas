-- ============================================================
-- Schema do Sistema de Gestão de Pizzaria
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- Tenants
-- ------------------------------------------------------------
CREATE TYPE tenant_status AS ENUM ('active', 'inactive');
CREATE TYPE tenant_user_status AS ENUM ('active', 'inactive');

CREATE TABLE tenant (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  status      tenant_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Mesas
-- ------------------------------------------------------------
CREATE TABLE mesa (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id),
  numero      INTEGER NOT NULL UNIQUE,
  ativa       BOOLEAN NOT NULL DEFAULT true
);

-- ------------------------------------------------------------
-- Cardápio
-- ------------------------------------------------------------
CREATE TABLE categoria (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  nome      TEXT NOT NULL,
  ordem     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE produto (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id),
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
CREATE TYPE status_pedido AS ENUM ('novo', 'em_preparo', 'pronto', 'entregue', 'cancelado');
CREATE TYPE forma_pagamento AS ENUM ('dinheiro', 'pix', 'credito', 'debito', 'outro');
CREATE TYPE status_pagamento AS ENUM ('registrado', 'estornado');

CREATE TABLE pedido (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenant(id),
  mesa_id      UUID NOT NULL REFERENCES mesa(id),
  created_by_user_id UUID,
  status       status_pedido NOT NULL DEFAULT 'novo',
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  entregue_em  TIMESTAMPTZ,
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
CREATE TYPE acesso_usuario AS ENUM ('admin', 'caixa', 'cozinha', 'garcom');

CREATE TABLE usuario (
  id            UUID PRIMARY KEY,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          role_usuario NOT NULL DEFAULT 'garcom',
  password_hash TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pedido
  ADD CONSTRAINT pedido_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES usuario(id) ON DELETE SET NULL;

CREATE TABLE pagamento_pedido (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id                  UUID NOT NULL REFERENCES tenant(id),
  pedido_id                  UUID NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  registrado_por_usuario_id  UUID NOT NULL REFERENCES usuario(id),
  forma_pagamento            forma_pagamento NOT NULL,
  valor                      NUMERIC(10,2) NOT NULL,
  status                     status_pagamento NOT NULL DEFAULT 'registrado',
  observacao                 TEXT,
  registrado_em              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_user (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  status     tenant_user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usuario_acesso (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_user_id UUID REFERENCES tenant_user(id) ON DELETE CASCADE,
  usuario_id     UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  acesso         acesso_usuario NOT NULL
);

CREATE TABLE auth_session (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id         UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  selected_tenant_id UUID REFERENCES tenant(id) ON DELETE SET NULL,
  token_hash         TEXT NOT NULL UNIQUE,
  expires_at         TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------
CREATE INDEX idx_pedido_mesa_id   ON pedido(mesa_id);
CREATE INDEX idx_pedido_tenant_id ON pedido(tenant_id);
CREATE INDEX idx_pedido_status    ON pedido(status);
CREATE INDEX idx_pedido_created_by_user_id ON pedido(created_by_user_id);
CREATE INDEX idx_item_pedido_id   ON item_pedido(pedido_id);
CREATE INDEX idx_pagamento_pedido_tenant_id ON pagamento_pedido(tenant_id);
CREATE INDEX idx_pagamento_pedido_pedido_id ON pagamento_pedido(pedido_id);
CREATE INDEX idx_produto_cat      ON produto(categoria_id);
CREATE INDEX idx_produto_tenant_id ON produto(tenant_id);
CREATE INDEX idx_mesa_tenant_id ON mesa(tenant_id);
CREATE INDEX idx_categoria_tenant_id ON categoria(tenant_id);
CREATE INDEX idx_tenant_user_tenant_id ON tenant_user(tenant_id);
CREATE INDEX idx_tenant_user_usuario_id ON tenant_user(usuario_id);
CREATE INDEX idx_usuario_acesso_tenant_user_id ON usuario_acesso(tenant_user_id);
CREATE INDEX idx_usuario_acesso_usuario_id ON usuario_acesso(usuario_id);
CREATE INDEX idx_auth_session_usuario_id   ON auth_session(usuario_id);

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
