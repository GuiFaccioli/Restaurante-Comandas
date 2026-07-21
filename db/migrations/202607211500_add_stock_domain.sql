ALTER TABLE produto ADD COLUMN IF NOT EXISTS controle_estoque BOOLEAN NOT NULL DEFAULT false;

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
  ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS ficha_tecnica_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumo(id),
  quantidade NUMERIC(12,3) NOT NULL,
  UNIQUE (produto_id, insumo_id)
);

CREATE TABLE IF NOT EXISTS movimento_estoque (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumo(id),
  tipo TEXT NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL,
  pedido_id UUID REFERENCES pedido(id) ON DELETE SET NULL,
  chave_idempotencia TEXT NOT NULL UNIQUE,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insumo_tenant_id ON insumo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ficha_tecnica_produto_id ON ficha_tecnica_item(produto_id);
CREATE INDEX IF NOT EXISTS idx_ficha_tecnica_insumo_id ON ficha_tecnica_item(insumo_id);
CREATE INDEX IF NOT EXISTS idx_movimento_estoque_tenant_id ON movimento_estoque(tenant_id);
CREATE INDEX IF NOT EXISTS idx_movimento_estoque_insumo_id ON movimento_estoque(insumo_id);
