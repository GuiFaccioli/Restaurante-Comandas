DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pagamento_pedido
     WHERE status = 'registrado'
     GROUP BY tenant_id, pedido_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce registered payment uniqueness: duplicate registered payments exist for the same tenant and order';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS
  pagamento_pedido_tenant_pedido_registrado_unique
  ON pagamento_pedido (tenant_id, pedido_id)
  WHERE status = 'registrado';
