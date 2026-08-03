ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS auth_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS usuario_auth_user_id_unique
  ON usuario(auth_user_id)
  WHERE auth_user_id IS NOT NULL;
