-- Complete PostgreSQL reference schema.
-- Runtime changes are applied by scripts/migrate.ts and db/migrations.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE tenant_status AS ENUM ('active', 'inactive');
CREATE TYPE tenant_user_status AS ENUM ('active', 'inactive');
CREATE TYPE status_pedido AS ENUM (
  'novo', 'em_preparo', 'pronto', 'entregue', 'cancelado'
);
CREATE TYPE role_usuario AS ENUM ('garcom', 'admin');
CREATE TYPE acesso_usuario AS ENUM ('admin', 'caixa', 'cozinha', 'garcom');
CREATE TYPE forma_pagamento AS ENUM (
  'dinheiro', 'pix', 'credito', 'debito', 'outro'
);
CREATE TYPE status_pagamento AS ENUM ('registrado', 'estornado');
CREATE TYPE status_atendimento AS ENUM ('open', 'awaiting_payment', 'paid', 'cancelled');

CREATE TABLE tenant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status tenant_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usuario (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role role_usuario NOT NULL DEFAULT 'garcom',
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mesa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  numero INTEGER NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, numero)
);

CREATE TABLE categoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, id)
);

CREATE TABLE produto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  categoria_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  disponivel BOOLEAN NOT NULL DEFAULT true,
  imagem_url TEXT,
  controle_estoque BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, categoria_id)
    REFERENCES categoria(tenant_id, id)
);

CREATE TABLE insumo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  unidade_base TEXT NOT NULL,
  unidade_compra TEXT NOT NULL,
  fator_compra_para_base NUMERIC(12,3) NOT NULL DEFAULT 1,
  estoque_atual NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_ideal NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 0,
  custo_unitario NUMERIC(12,4),
  ativo BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (tenant_id, id)
);

CREATE TABLE atendimento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  mesa_id UUID NOT NULL,
  status status_atendimento NOT NULL DEFAULT 'open',
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  aguardando_pagamento_em TIMESTAMPTZ,
  fechado_em TIMESTAMPTZ,
  aberto_por_usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  fechado_por_usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, mesa_id) REFERENCES mesa(tenant_id, id)
);

CREATE TABLE pedido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  mesa_id UUID NOT NULL,
  atendimento_id UUID NOT NULL,
  created_by_user_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  status status_pedido NOT NULL DEFAULT 'novo',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  entregue_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, mesa_id)
    REFERENCES mesa(tenant_id, id),
  FOREIGN KEY (tenant_id, atendimento_id)
    REFERENCES atendimento(tenant_id, id)
);

CREATE TABLE item_pedido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  pedido_id UUID NOT NULL,
  produto_id UUID NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(10,2) NOT NULL,
  observacao TEXT,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, pedido_id, id),
  FOREIGN KEY (tenant_id, pedido_id)
    REFERENCES pedido(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, produto_id)
    REFERENCES produto(tenant_id, id)
);

CREATE TABLE ficha_tecnica_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL,
  insumo_id UUID NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL,
  UNIQUE (tenant_id, produto_id, insumo_id),
  FOREIGN KEY (tenant_id, produto_id)
    REFERENCES produto(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, insumo_id)
    REFERENCES insumo(tenant_id, id)
);

CREATE TABLE item_pedido_insumo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  pedido_id UUID NOT NULL,
  item_pedido_id UUID NOT NULL,
  insumo_id UUID NOT NULL,
  quantidade_total NUMERIC(12,3) NOT NULL CHECK (quantidade_total > 0),
  UNIQUE (tenant_id, item_pedido_id, insumo_id),
  FOREIGN KEY (tenant_id, pedido_id)
    REFERENCES pedido(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, pedido_id, item_pedido_id)
    REFERENCES item_pedido(tenant_id, pedido_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, insumo_id)
    REFERENCES insumo(tenant_id, id)
);

CREATE TABLE tenant_user (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  status tenant_user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usuario_acesso (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_user_id UUID REFERENCES tenant_user(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  acesso acesso_usuario NOT NULL
);

CREATE TABLE auth_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  selected_tenant_id UUID REFERENCES tenant(id) ON DELETE SET NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pagamento_pedido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  pedido_id UUID,
  atendimento_id UUID NOT NULL,
  registrado_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  forma_pagamento forma_pagamento NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  status status_pagamento NOT NULL DEFAULT 'registrado',
  observacao TEXT,
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, pedido_id)
    REFERENCES pedido(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, atendimento_id)
    REFERENCES atendimento(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE movimento_estoque (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL,
  saldo_anterior NUMERIC(12,3) NOT NULL DEFAULT 0,
  saldo_resultante NUMERIC(12,3) NOT NULL DEFAULT 0,
  custo_unitario NUMERIC(12,4),
  custo_total NUMERIC(12,2),
  pedido_id UUID,
  item_pedido_id UUID,
  chave_idempotencia TEXT NOT NULL,
  motivo TEXT,
  observacao TEXT,
  criado_por_usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (item_pedido_id IS NULL OR pedido_id IS NOT NULL),
  FOREIGN KEY (tenant_id, insumo_id)
    REFERENCES insumo(tenant_id, id),
  FOREIGN KEY (tenant_id, pedido_id)
    REFERENCES pedido(tenant_id, id),
  FOREIGN KEY (tenant_id, pedido_id, item_pedido_id)
    REFERENCES item_pedido(tenant_id, pedido_id, id)
);

CREATE INDEX idx_mesa_tenant_id ON mesa(tenant_id);
CREATE UNIQUE INDEX mesa_tenant_numero_unique
  ON mesa(tenant_id, numero);
CREATE INDEX idx_categoria_tenant_id ON categoria(tenant_id);
CREATE INDEX idx_produto_cat ON produto(categoria_id);
CREATE INDEX idx_produto_tenant_id ON produto(tenant_id);
CREATE INDEX idx_insumo_tenant_id ON insumo(tenant_id);
CREATE INDEX idx_ficha_tecnica_produto_id
  ON ficha_tecnica_item(produto_id);
CREATE INDEX idx_ficha_tecnica_insumo_id
  ON ficha_tecnica_item(insumo_id);
CREATE INDEX idx_pedido_mesa_id ON pedido(mesa_id);
CREATE INDEX idx_pedido_tenant_atendimento ON pedido(tenant_id, atendimento_id);
CREATE INDEX idx_pedido_tenant_id ON pedido(tenant_id);
CREATE INDEX idx_pedido_status ON pedido(status);
CREATE INDEX idx_pedido_created_by_user_id
  ON pedido(created_by_user_id);
CREATE INDEX idx_item_pedido_id ON item_pedido(pedido_id);
CREATE INDEX idx_item_pedido_tenant_id ON item_pedido(tenant_id);
CREATE INDEX idx_item_pedido_insumo_tenant_pedido
  ON item_pedido_insumo(tenant_id, pedido_id);
CREATE INDEX idx_item_pedido_insumo_insumo_id
  ON item_pedido_insumo(insumo_id);
CREATE INDEX idx_tenant_user_tenant_id ON tenant_user(tenant_id);
CREATE INDEX idx_tenant_user_usuario_id ON tenant_user(usuario_id);
CREATE INDEX idx_usuario_acesso_tenant_user_id
  ON usuario_acesso(tenant_user_id);
CREATE INDEX idx_usuario_acesso_usuario_id
  ON usuario_acesso(usuario_id);
CREATE INDEX idx_auth_session_usuario_id ON auth_session(usuario_id);
CREATE INDEX idx_pagamento_pedido_tenant_id
  ON pagamento_pedido(tenant_id);
CREATE INDEX idx_pagamento_pedido_pedido_id
  ON pagamento_pedido(pedido_id);
CREATE INDEX idx_pagamento_pedido_tenant_atendimento
  ON pagamento_pedido(tenant_id, atendimento_id);
CREATE UNIQUE INDEX atendimento_tenant_mesa_open_unique
  ON atendimento(tenant_id, mesa_id)
  WHERE status = 'open';
CREATE INDEX idx_movimento_estoque_tenant_id
  ON movimento_estoque(tenant_id);
CREATE INDEX idx_movimento_estoque_insumo_id
  ON movimento_estoque(insumo_id);
CREATE UNIQUE INDEX movimento_estoque_tenant_chave_idempotencia_unique
  ON movimento_estoque(tenant_id, chave_idempotencia);
CREATE INDEX idx_movimento_estoque_insumo_criado_em
  ON movimento_estoque(insumo_id, criado_em DESC);
CREATE INDEX idx_movimento_estoque_pedido_item
  ON movimento_estoque(pedido_id, item_pedido_id);

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
