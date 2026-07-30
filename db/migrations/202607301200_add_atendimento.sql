DO $$
BEGIN
  CREATE TYPE status_atendimento AS ENUM (
    'open', 'awaiting_payment', 'paid', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS atendimento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  mesa_id UUID NOT NULL,
  status status_atendimento NOT NULL DEFAULT 'open',
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  aguardando_pagamento_em TIMESTAMPTZ,
  fechado_em TIMESTAMPTZ,
  aberto_por_usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  fechado_por_usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  CONSTRAINT atendimento_tenant_mesa_fkey
    FOREIGN KEY (tenant_id, mesa_id) REFERENCES mesa(tenant_id, id)
);

ALTER TABLE pedido ADD COLUMN IF NOT EXISTS atendimento_id UUID;
ALTER TABLE pagamento_pedido ADD COLUMN IF NOT EXISTS atendimento_id UUID;

-- Legacy orders cannot be safely merged by table. Create one attendance per
-- order and preserve the historical boundary instead.
DO $$
BEGIN
  INSERT INTO atendimento (
    id,
    tenant_id,
    mesa_id,
    status,
    aberto_em,
    aguardando_pagamento_em,
    fechado_em,
    aberto_por_usuario_id,
    criado_em,
    atualizado_em
  )
  SELECT
    pedido.id,
    pedido.tenant_id,
    pedido.mesa_id,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pagamento_pedido pagamento
         WHERE pagamento.tenant_id = pedido.tenant_id
           AND pagamento.pedido_id = pedido.id
           AND pagamento.status = 'registrado'
      ) THEN 'paid'::status_atendimento
      WHEN pedido.status = 'cancelado' THEN 'cancelled'::status_atendimento
      WHEN pedido.status = 'entregue' THEN 'awaiting_payment'::status_atendimento
      WHEN row_number() OVER (
        PARTITION BY pedido.tenant_id, pedido.mesa_id
        ORDER BY pedido.criado_em DESC, pedido.id DESC
      ) = 1 THEN 'open'::status_atendimento
      ELSE 'awaiting_payment'::status_atendimento
    END,
    pedido.criado_em,
    CASE WHEN pedido.status = 'entregue' THEN pedido.entregue_em ELSE NULL END,
    CASE WHEN pedido.status IN ('cancelado') THEN pedido.atualizado_em ELSE NULL END,
    pedido.created_by_user_id,
    pedido.criado_em,
    pedido.atualizado_em
  FROM pedido
  WHERE NOT EXISTS (
    SELECT 1 FROM atendimento atendimento_existente
     WHERE atendimento_existente.id = pedido.id
       AND atendimento_existente.tenant_id = pedido.tenant_id
  );
END $$;

UPDATE pedido
   SET atendimento_id = pedido.id
 WHERE atendimento_id IS NULL;

UPDATE pagamento_pedido pagamento
   SET atendimento_id = pedido.atendimento_id
  FROM pedido
 WHERE pagamento.tenant_id = pedido.tenant_id
   AND pagamento.pedido_id = pedido.id
   AND pagamento.atendimento_id IS NULL;

ALTER TABLE pedido ALTER COLUMN atendimento_id SET NOT NULL;
ALTER TABLE pagamento_pedido ALTER COLUMN atendimento_id SET NOT NULL;

ALTER TABLE pedido
  ADD CONSTRAINT pedido_tenant_atendimento_fkey
  FOREIGN KEY (tenant_id, atendimento_id)
  REFERENCES atendimento(tenant_id, id);

ALTER TABLE pagamento_pedido
  ADD CONSTRAINT pagamento_pedido_tenant_atendimento_fkey
  FOREIGN KEY (tenant_id, atendimento_id)
  REFERENCES atendimento(tenant_id, id)
  ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS atendimento_tenant_id_unique
  ON atendimento(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS atendimento_tenant_mesa_open_unique
  ON atendimento(tenant_id, mesa_id)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_atendimento_tenant_mesa_status
  ON atendimento(tenant_id, mesa_id, status);
CREATE INDEX IF NOT EXISTS idx_pedido_tenant_atendimento
  ON pedido(tenant_id, atendimento_id);
CREATE INDEX IF NOT EXISTS idx_pagamento_pedido_tenant_atendimento
  ON pagamento_pedido(tenant_id, atendimento_id);

DROP INDEX IF EXISTS pagamento_pedido_tenant_pedido_registrado_unique;
