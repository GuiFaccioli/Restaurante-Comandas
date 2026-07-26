CREATE UNIQUE INDEX IF NOT EXISTS movimento_estoque_tenant_chave_idempotencia_unique
  ON movimento_estoque (tenant_id, chave_idempotencia);

ALTER TABLE movimento_estoque
  DROP CONSTRAINT IF EXISTS movimento_estoque_chave_idempotencia_key;
