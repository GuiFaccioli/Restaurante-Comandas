DO $$
BEGIN
  CREATE TYPE canal_pedido AS ENUM ('salao', 'delivery');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE atendimento
  ALTER COLUMN mesa_id DROP NOT NULL;

ALTER TABLE pedido
  ALTER COLUMN mesa_id DROP NOT NULL;

ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS canal canal_pedido NOT NULL DEFAULT 'salao',
  ADD COLUMN IF NOT EXISTS cliente_id UUID,
  ADD COLUMN IF NOT EXISTS cliente_nome_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS cliente_telefone_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS endereco_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS taxa_entrega_aplicada NUMERIC(10, 2);

ALTER TABLE pedido
  ADD CONSTRAINT pedido_tenant_cliente_fkey
  FOREIGN KEY (tenant_id, cliente_id)
  REFERENCES cliente (tenant_id, id)
  ON DELETE SET NULL;

ALTER TABLE pedido
  ADD CONSTRAINT pedido_channel_invariants CHECK (
    (canal = 'salao' AND mesa_id IS NOT NULL AND cliente_id IS NULL
      AND cliente_nome_snapshot IS NULL
      AND cliente_telefone_snapshot IS NULL
      AND endereco_snapshot IS NULL
      AND taxa_entrega_aplicada IS NULL)
    OR
    (canal = 'delivery' AND mesa_id IS NULL AND cliente_id IS NOT NULL
      AND cliente_nome_snapshot IS NOT NULL
      AND cliente_telefone_snapshot IS NOT NULL
      AND endereco_snapshot IS NOT NULL
      AND taxa_entrega_aplicada IS NOT NULL
      AND taxa_entrega_aplicada >= 0)
  );

CREATE UNIQUE INDEX IF NOT EXISTS pedido_delivery_one_to_one_unique
  ON pedido (tenant_id, atendimento_id)
  WHERE canal = 'delivery';

CREATE INDEX IF NOT EXISTS idx_pedido_tenant_cliente
  ON pedido (tenant_id, cliente_id)
  WHERE cliente_id IS NOT NULL;
