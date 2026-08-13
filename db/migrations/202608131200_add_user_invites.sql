CREATE TABLE IF NOT EXISTS usuario_convite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  tenant_user_id UUID NOT NULL REFERENCES tenant_user(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  criado_por_usuario_id UUID NOT NULL REFERENCES usuario(id),
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expira_em TIMESTAMPTZ NOT NULL,
  aceito_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS usuario_convite_pending_email_unique
  ON usuario_convite(tenant_id, email)
  WHERE aceito_em IS NULL;
