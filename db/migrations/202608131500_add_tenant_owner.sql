ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES usuario(id);

UPDATE tenant AS t
SET owner_user_id = owner.usuario_id
FROM (
  SELECT DISTINCT ON (tu.tenant_id)
    tu.tenant_id,
    tu.usuario_id
  FROM tenant_user AS tu
  LEFT JOIN usuario_acesso AS ua ON ua.tenant_user_id = tu.id
  WHERE tu.status = 'active'
  ORDER BY tu.tenant_id, (ua.acesso = 'admin') DESC, tu.created_at ASC
) AS owner
WHERE t.id = owner.tenant_id
  AND t.owner_user_id IS NULL;
