ALTER TABLE shopping_list_item
  ADD COLUMN IF NOT EXISTS chave_idempotencia TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS shopping_list_tenant_idempotency_key_unique
  ON shopping_list_item (tenant_id, chave_idempotencia)
  WHERE chave_idempotencia IS NOT NULL;
