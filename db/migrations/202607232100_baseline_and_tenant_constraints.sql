CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE tenant_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE tenant_user_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE status_pedido AS ENUM (
    'novo', 'em_preparo', 'pronto', 'entregue', 'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TYPE status_pedido ADD VALUE IF NOT EXISTS 'cancelado';
DO $$ BEGIN
  CREATE TYPE role_usuario AS ENUM ('garcom', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE acesso_usuario AS ENUM ('admin', 'caixa', 'cozinha', 'garcom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE forma_pagamento AS ENUM (
    'dinheiro', 'pix', 'credito', 'debito', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE status_pagamento AS ENUM ('registrado', 'estornado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tenant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status tenant_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuario (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role role_usuario NOT NULL DEFAULT 'garcom',
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mesa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  numero INTEGER NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, numero)
);

CREATE TABLE IF NOT EXISTS categoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS produto (
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
  CONSTRAINT produto_tenant_categoria_fkey
    FOREIGN KEY (tenant_id, categoria_id)
    REFERENCES categoria (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS insumo (
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

CREATE TABLE IF NOT EXISTS pedido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  mesa_id UUID NOT NULL,
  created_by_user_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  status status_pedido NOT NULL DEFAULT 'novo',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  entregue_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  CONSTRAINT pedido_tenant_mesa_fkey
    FOREIGN KEY (tenant_id, mesa_id)
    REFERENCES mesa (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS item_pedido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  pedido_id UUID NOT NULL,
  produto_id UUID NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(10,2) NOT NULL,
  observacao TEXT,
  UNIQUE (tenant_id, id),
  CONSTRAINT item_pedido_tenant_pedido_fkey
    FOREIGN KEY (tenant_id, pedido_id)
    REFERENCES pedido (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT item_pedido_tenant_produto_fkey
    FOREIGN KEY (tenant_id, produto_id)
    REFERENCES produto (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS ficha_tecnica_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL,
  insumo_id UUID NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL,
  UNIQUE (tenant_id, produto_id, insumo_id),
  CONSTRAINT ficha_tecnica_tenant_produto_fkey
    FOREIGN KEY (tenant_id, produto_id)
    REFERENCES produto (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT ficha_tecnica_tenant_insumo_fkey
    FOREIGN KEY (tenant_id, insumo_id)
    REFERENCES insumo (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS item_pedido_insumo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  pedido_id UUID NOT NULL,
  item_pedido_id UUID NOT NULL,
  insumo_id UUID NOT NULL,
  quantidade_total NUMERIC(12,3) NOT NULL CHECK (quantidade_total > 0),
  UNIQUE (tenant_id, item_pedido_id, insumo_id),
  CONSTRAINT item_pedido_insumo_tenant_pedido_fkey
    FOREIGN KEY (tenant_id, pedido_id)
    REFERENCES pedido (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT item_pedido_insumo_tenant_item_fkey
    FOREIGN KEY (tenant_id, item_pedido_id)
    REFERENCES item_pedido (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT item_pedido_insumo_tenant_insumo_fkey
    FOREIGN KEY (tenant_id, insumo_id)
    REFERENCES insumo (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS tenant_user (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  status tenant_user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuario_acesso (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_user_id UUID REFERENCES tenant_user(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  acesso acesso_usuario NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  selected_tenant_id UUID REFERENCES tenant(id) ON DELETE SET NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pagamento_pedido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  pedido_id UUID NOT NULL,
  registrado_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  forma_pagamento forma_pagamento NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  status status_pagamento NOT NULL DEFAULT 'registrado',
  observacao TEXT,
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pagamento_pedido_tenant_pedido_fkey
    FOREIGN KEY (tenant_id, pedido_id)
    REFERENCES pedido (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS movimento_estoque (
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
  CONSTRAINT movimento_estoque_tenant_insumo_fkey
    FOREIGN KEY (tenant_id, insumo_id)
    REFERENCES insumo (tenant_id, id),
  CONSTRAINT movimento_estoque_tenant_pedido_fkey
    FOREIGN KEY (tenant_id, pedido_id)
    REFERENCES pedido (tenant_id, id),
  CONSTRAINT movimento_estoque_tenant_item_fkey
    FOREIGN KEY (tenant_id, item_pedido_id)
    REFERENCES item_pedido (tenant_id, id)
);

ALTER TABLE produto
  ADD COLUMN IF NOT EXISTS controle_estoque BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID
  REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS entregue_em TIMESTAMPTZ;
ALTER TABLE item_pedido ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE movimento_estoque
  ADD COLUMN IF NOT EXISTS saldo_anterior NUMERIC(12,3) NOT NULL DEFAULT 0;
ALTER TABLE movimento_estoque
  ADD COLUMN IF NOT EXISTS saldo_resultante NUMERIC(12,3) NOT NULL DEFAULT 0;
ALTER TABLE movimento_estoque
  ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(12,4);
ALTER TABLE movimento_estoque
  ADD COLUMN IF NOT EXISTS custo_total NUMERIC(12,2);
ALTER TABLE movimento_estoque
  ADD COLUMN IF NOT EXISTS item_pedido_id UUID;
ALTER TABLE movimento_estoque ADD COLUMN IF NOT EXISTS motivo TEXT;
ALTER TABLE movimento_estoque
  ADD COLUMN IF NOT EXISTS criado_por_usuario_id UUID
  REFERENCES usuario(id) ON DELETE SET NULL;

UPDATE item_pedido
   SET tenant_id = pedido.tenant_id
  FROM pedido
 WHERE pedido.id = item_pedido.pedido_id
   AND item_pedido.tenant_id IS NULL;

CREATE OR REPLACE FUNCTION set_item_pedido_tenant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id
      INTO NEW.tenant_id
      FROM pedido
     WHERE id = NEW.pedido_id;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION
      'item_pedido tenant_id could not be derived from pedido';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_item_pedido_fill_tenant ON item_pedido;
CREATE TRIGGER trg_item_pedido_fill_tenant
  BEFORE INSERT OR UPDATE OF pedido_id, tenant_id ON item_pedido
  FOR EACH ROW EXECUTE FUNCTION set_item_pedido_tenant();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM item_pedido
     WHERE tenant_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cross-tenant data detected: item_pedido could not be backfilled from pedido';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM produto child
      JOIN categoria parent ON parent.id = child.categoria_id
     WHERE child.tenant_id <> parent.tenant_id
  ) THEN
    RAISE EXCEPTION
      'Cross-tenant data detected: produto.categoria_id -> categoria.id';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pedido child
      JOIN mesa parent ON parent.id = child.mesa_id
     WHERE child.tenant_id <> parent.tenant_id
  ) THEN
    RAISE EXCEPTION
      'Cross-tenant data detected: pedido.mesa_id -> mesa.id';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM item_pedido child
      JOIN pedido order_parent ON order_parent.id = child.pedido_id
      JOIN produto product_parent ON product_parent.id = child.produto_id
     WHERE child.tenant_id <> order_parent.tenant_id
        OR child.tenant_id <> product_parent.tenant_id
  ) THEN
    RAISE EXCEPTION
      'Cross-tenant data detected: item_pedido -> pedido/produto';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM ficha_tecnica_item child
      JOIN produto product_parent ON product_parent.id = child.produto_id
      JOIN insumo ingredient_parent ON ingredient_parent.id = child.insumo_id
     WHERE child.tenant_id <> product_parent.tenant_id
        OR child.tenant_id <> ingredient_parent.tenant_id
  ) THEN
    RAISE EXCEPTION
      'Cross-tenant data detected: ficha_tecnica_item -> produto/insumo';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM item_pedido_insumo child
      JOIN pedido order_parent ON order_parent.id = child.pedido_id
      JOIN item_pedido item_parent ON item_parent.id = child.item_pedido_id
      JOIN insumo ingredient_parent ON ingredient_parent.id = child.insumo_id
     WHERE child.tenant_id <> order_parent.tenant_id
        OR child.tenant_id <> item_parent.tenant_id
        OR child.tenant_id <> ingredient_parent.tenant_id
  ) THEN
    RAISE EXCEPTION
      'Cross-tenant data detected: item_pedido_insumo -> pedido/item/insumo';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM movimento_estoque child
      JOIN insumo ingredient_parent ON ingredient_parent.id = child.insumo_id
      LEFT JOIN pedido order_parent ON order_parent.id = child.pedido_id
      LEFT JOIN item_pedido item_parent ON item_parent.id = child.item_pedido_id
     WHERE child.tenant_id <> ingredient_parent.tenant_id
        OR (
          child.pedido_id IS NOT NULL
          AND child.tenant_id <> order_parent.tenant_id
        )
        OR (
          child.item_pedido_id IS NOT NULL
          AND child.tenant_id <> item_parent.tenant_id
        )
  ) THEN
    RAISE EXCEPTION
      'Cross-tenant data detected: movimento_estoque -> insumo/pedido/item';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pagamento_pedido child
      JOIN pedido parent ON parent.id = child.pedido_id
     WHERE child.tenant_id <> parent.tenant_id
  ) THEN
    RAISE EXCEPTION
      'Cross-tenant data detected: pagamento_pedido.pedido_id -> pedido.id';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pagamento_pedido
     WHERE status = 'registrado'
     GROUP BY tenant_id, pedido_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce registered payment uniqueness: duplicate registered payments exist for the same tenant and order';
  END IF;
END $$;

ALTER TABLE item_pedido ALTER COLUMN tenant_id SET NOT NULL;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'mesa'::regclass
       AND contype = 'u'
       AND pg_get_constraintdef(oid) = 'UNIQUE (numero)'
  LOOP
    EXECUTE format(
      'ALTER TABLE mesa DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS mesa_tenant_id_unique
  ON mesa (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS mesa_tenant_numero_unique
  ON mesa (tenant_id, numero);
CREATE UNIQUE INDEX IF NOT EXISTS categoria_tenant_id_unique
  ON categoria (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS produto_tenant_id_unique
  ON produto (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS insumo_tenant_id_unique
  ON insumo (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS pedido_tenant_id_unique
  ON pedido (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS item_pedido_tenant_id_unique
  ON item_pedido (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS ficha_tecnica_tenant_produto_insumo_unique
  ON ficha_tecnica_item (tenant_id, produto_id, insumo_id);
CREATE UNIQUE INDEX IF NOT EXISTS movimento_estoque_tenant_chave_idempotencia_unique
  ON movimento_estoque (tenant_id, chave_idempotencia);

ALTER TABLE movimento_estoque
  DROP CONSTRAINT IF EXISTS movimento_estoque_chave_idempotencia_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'item_pedido_tenant_fkey'
       AND conrelid = 'item_pedido'::regclass
  ) THEN
    ALTER TABLE item_pedido
      ADD CONSTRAINT item_pedido_tenant_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'produto_tenant_categoria_fkey'
       AND conrelid = 'produto'::regclass
  ) THEN
    ALTER TABLE produto
      ADD CONSTRAINT produto_tenant_categoria_fkey
      FOREIGN KEY (tenant_id, categoria_id)
      REFERENCES categoria (tenant_id, id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'pedido_tenant_mesa_fkey'
       AND conrelid = 'pedido'::regclass
  ) THEN
    ALTER TABLE pedido
      ADD CONSTRAINT pedido_tenant_mesa_fkey
      FOREIGN KEY (tenant_id, mesa_id)
      REFERENCES mesa (tenant_id, id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'item_pedido_tenant_pedido_fkey'
       AND conrelid = 'item_pedido'::regclass
  ) THEN
    ALTER TABLE item_pedido
      ADD CONSTRAINT item_pedido_tenant_pedido_fkey
      FOREIGN KEY (tenant_id, pedido_id)
      REFERENCES pedido (tenant_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'item_pedido_tenant_produto_fkey'
       AND conrelid = 'item_pedido'::regclass
  ) THEN
    ALTER TABLE item_pedido
      ADD CONSTRAINT item_pedido_tenant_produto_fkey
      FOREIGN KEY (tenant_id, produto_id)
      REFERENCES produto (tenant_id, id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'ficha_tecnica_tenant_produto_fkey'
       AND conrelid = 'ficha_tecnica_item'::regclass
  ) THEN
    ALTER TABLE ficha_tecnica_item
      ADD CONSTRAINT ficha_tecnica_tenant_produto_fkey
      FOREIGN KEY (tenant_id, produto_id)
      REFERENCES produto (tenant_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'ficha_tecnica_tenant_insumo_fkey'
       AND conrelid = 'ficha_tecnica_item'::regclass
  ) THEN
    ALTER TABLE ficha_tecnica_item
      ADD CONSTRAINT ficha_tecnica_tenant_insumo_fkey
      FOREIGN KEY (tenant_id, insumo_id)
      REFERENCES insumo (tenant_id, id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'item_pedido_insumo_tenant_pedido_fkey'
       AND conrelid = 'item_pedido_insumo'::regclass
  ) THEN
    ALTER TABLE item_pedido_insumo
      ADD CONSTRAINT item_pedido_insumo_tenant_pedido_fkey
      FOREIGN KEY (tenant_id, pedido_id)
      REFERENCES pedido (tenant_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'item_pedido_insumo_tenant_item_fkey'
       AND conrelid = 'item_pedido_insumo'::regclass
  ) THEN
    ALTER TABLE item_pedido_insumo
      ADD CONSTRAINT item_pedido_insumo_tenant_item_fkey
      FOREIGN KEY (tenant_id, item_pedido_id)
      REFERENCES item_pedido (tenant_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'item_pedido_insumo_tenant_insumo_fkey'
       AND conrelid = 'item_pedido_insumo'::regclass
  ) THEN
    ALTER TABLE item_pedido_insumo
      ADD CONSTRAINT item_pedido_insumo_tenant_insumo_fkey
      FOREIGN KEY (tenant_id, insumo_id)
      REFERENCES insumo (tenant_id, id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'movimento_estoque_tenant_insumo_fkey'
       AND conrelid = 'movimento_estoque'::regclass
  ) THEN
    ALTER TABLE movimento_estoque
      ADD CONSTRAINT movimento_estoque_tenant_insumo_fkey
      FOREIGN KEY (tenant_id, insumo_id)
      REFERENCES insumo (tenant_id, id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'movimento_estoque_tenant_pedido_fkey'
       AND conrelid = 'movimento_estoque'::regclass
  ) THEN
    ALTER TABLE movimento_estoque
      ADD CONSTRAINT movimento_estoque_tenant_pedido_fkey
      FOREIGN KEY (tenant_id, pedido_id)
      REFERENCES pedido (tenant_id, id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'movimento_estoque_tenant_item_fkey'
       AND conrelid = 'movimento_estoque'::regclass
  ) THEN
    ALTER TABLE movimento_estoque
      ADD CONSTRAINT movimento_estoque_tenant_item_fkey
      FOREIGN KEY (tenant_id, item_pedido_id)
      REFERENCES item_pedido (tenant_id, id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'pagamento_pedido_tenant_pedido_fkey'
       AND conrelid = 'pagamento_pedido'::regclass
  ) THEN
    ALTER TABLE pagamento_pedido
      ADD CONSTRAINT pagamento_pedido_tenant_pedido_fkey
      FOREIGN KEY (tenant_id, pedido_id)
      REFERENCES pedido (tenant_id, id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mesa_tenant_id ON mesa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categoria_tenant_id ON categoria(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produto_cat ON produto(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produto_tenant_id ON produto(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insumo_tenant_id ON insumo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ficha_tecnica_produto_id
  ON ficha_tecnica_item(produto_id);
CREATE INDEX IF NOT EXISTS idx_ficha_tecnica_insumo_id
  ON ficha_tecnica_item(insumo_id);
CREATE INDEX IF NOT EXISTS idx_pedido_mesa_id ON pedido(mesa_id);
CREATE INDEX IF NOT EXISTS idx_pedido_tenant_id ON pedido(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedido_status ON pedido(status);
CREATE INDEX IF NOT EXISTS idx_pedido_created_by_user_id
  ON pedido(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_item_pedido_id ON item_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_item_pedido_tenant_id ON item_pedido(tenant_id);
CREATE INDEX IF NOT EXISTS idx_item_pedido_insumo_tenant_pedido
  ON item_pedido_insumo(tenant_id, pedido_id);
CREATE INDEX IF NOT EXISTS idx_item_pedido_insumo_insumo_id
  ON item_pedido_insumo(insumo_id);
CREATE INDEX IF NOT EXISTS idx_tenant_user_tenant_id
  ON tenant_user(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_user_usuario_id
  ON tenant_user(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_acesso_tenant_user_id
  ON usuario_acesso(tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_usuario_acesso_usuario_id
  ON usuario_acesso(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auth_session_usuario_id
  ON auth_session(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagamento_pedido_tenant_id
  ON pagamento_pedido(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pagamento_pedido_pedido_id
  ON pagamento_pedido(pedido_id);
CREATE UNIQUE INDEX IF NOT EXISTS
  pagamento_pedido_tenant_pedido_registrado_unique
  ON pagamento_pedido(tenant_id, pedido_id)
  WHERE status = 'registrado';
CREATE INDEX IF NOT EXISTS idx_movimento_estoque_tenant_id
  ON movimento_estoque(tenant_id);
CREATE INDEX IF NOT EXISTS idx_movimento_estoque_insumo_id
  ON movimento_estoque(insumo_id);
CREATE INDEX IF NOT EXISTS idx_movimento_estoque_insumo_criado_em
  ON movimento_estoque(insumo_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_movimento_estoque_pedido_item
  ON movimento_estoque(pedido_id, item_pedido_id);

CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedido_atualizado_em ON pedido;
CREATE TRIGGER trg_pedido_atualizado_em
  BEFORE UPDATE ON pedido
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
