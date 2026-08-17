CREATE TABLE IF NOT EXISTS cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  telefone_normalizado TEXT NOT NULL,
  taxa_entrega_padrao NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (taxa_entrega_padrao >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, telefone_normalizado)
);

CREATE INDEX IF NOT EXISTS idx_cliente_tenant_nome ON cliente (tenant_id, nome);

CREATE TABLE IF NOT EXISTS endereco_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL,
  rua TEXT NOT NULL,
  numero TEXT NOT NULL,
  bairro TEXT,
  cidade TEXT,
  cep TEXT,
  complemento TEXT,
  referencia TEXT,
  padrao BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT endereco_cliente_tenant_cliente_fkey
    FOREIGN KEY (tenant_id, cliente_id) REFERENCES cliente (tenant_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS endereco_cliente_active_default_unique
  ON endereco_cliente (tenant_id, cliente_id)
  WHERE ativo = TRUE AND padrao = TRUE;

CREATE INDEX IF NOT EXISTS idx_endereco_cliente_tenant_cliente ON endereco_cliente (tenant_id, cliente_id);
CREATE INDEX IF NOT EXISTS idx_endereco_cliente_tenant_cep ON endereco_cliente (tenant_id, cep);
