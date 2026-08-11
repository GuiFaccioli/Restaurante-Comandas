CREATE TABLE shopping_list_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('automatic', 'manual')),
  insumo_id UUID,
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL,
  quantidade_sugerida NUMERIC(12,3) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((kind = 'automatic' AND insumo_id IS NOT NULL) OR (kind = 'manual' AND insumo_id IS NULL)),
  CONSTRAINT shopping_list_item_tenant_insumo_fkey
    FOREIGN KEY (tenant_id, insumo_id)
    REFERENCES insumo (tenant_id, id)
);

CREATE UNIQUE INDEX shopping_list_active_automatic_item_unique
  ON shopping_list_item (tenant_id, insumo_id) WHERE kind = 'automatic';
