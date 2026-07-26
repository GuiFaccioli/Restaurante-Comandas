CREATE TABLE IF NOT EXISTS item_pedido_insumo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  pedido_id UUID NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  item_pedido_id UUID NOT NULL REFERENCES item_pedido(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumo(id),
  quantidade_total NUMERIC(12,3) NOT NULL CHECK (quantidade_total > 0),
  UNIQUE (tenant_id, item_pedido_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_item_pedido_insumo_tenant_pedido
  ON item_pedido_insumo(tenant_id, pedido_id);

CREATE INDEX IF NOT EXISTS idx_item_pedido_insumo_insumo_id
  ON item_pedido_insumo(insumo_id);
