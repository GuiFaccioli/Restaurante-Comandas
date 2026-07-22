ALTER TABLE movimento_estoque ADD COLUMN IF NOT EXISTS saldo_anterior NUMERIC(12,3) NOT NULL DEFAULT 0;
ALTER TABLE movimento_estoque ADD COLUMN IF NOT EXISTS saldo_resultante NUMERIC(12,3) NOT NULL DEFAULT 0;
ALTER TABLE movimento_estoque ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(12,4);
ALTER TABLE movimento_estoque ADD COLUMN IF NOT EXISTS custo_total NUMERIC(12,2);
ALTER TABLE movimento_estoque ADD COLUMN IF NOT EXISTS item_pedido_id UUID REFERENCES item_pedido(id) ON DELETE SET NULL;
ALTER TABLE movimento_estoque ADD COLUMN IF NOT EXISTS motivo TEXT;
ALTER TABLE movimento_estoque ADD COLUMN IF NOT EXISTS criado_por_usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimento_estoque_insumo_criado_em
  ON movimento_estoque(insumo_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_movimento_estoque_pedido_item
  ON movimento_estoque(pedido_id, item_pedido_id);
