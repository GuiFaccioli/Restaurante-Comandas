ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID
  REFERENCES usuario(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedido_created_by_user_id
  ON pedido(created_by_user_id);
