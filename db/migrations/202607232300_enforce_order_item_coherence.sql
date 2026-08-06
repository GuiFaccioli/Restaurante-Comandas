-- Keep order-derived rows inside one tenant/order aggregate.
-- This migration intentionally fails before changing constraints when legacy
-- data links an item to a different order.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM item_pedido_composicao AS child
      JOIN item_pedido AS item_parent ON item_parent.id = child.item_pedido_id
     WHERE child.tenant_id IS DISTINCT FROM item_parent.tenant_id
        OR child.pedido_id IS DISTINCT FROM item_parent.pedido_id
  ) THEN
    RAISE EXCEPTION
      'Order-item coherence violation: item_pedido_composicao references an item from another tenant or pedido';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM movimento_estoque AS child
      LEFT JOIN item_pedido AS item_parent
        ON item_parent.id = child.item_pedido_id
     WHERE child.item_pedido_id IS NOT NULL
       AND (
         child.pedido_id IS NULL
         OR item_parent.id IS NULL
         OR child.tenant_id IS DISTINCT FROM item_parent.tenant_id
         OR child.pedido_id IS DISTINCT FROM item_parent.pedido_id
       )
  ) THEN
    RAISE EXCEPTION
      'Order-item coherence violation: movimento_estoque references an item from another tenant or pedido';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS item_pedido_tenant_pedido_id_unique
  ON item_pedido(tenant_id, pedido_id, id);

-- Remove legacy single-column foreign keys superseded by tenant-scoped keys.
DO $$
DECLARE
  fk RECORD;
  child_columns TEXT[];
BEGIN
  FOR fk IN
    SELECT constraint_row.oid, constraint_row.conname, child.relname
      FROM pg_constraint AS constraint_row
      JOIN pg_class AS child ON child.oid = constraint_row.conrelid
      JOIN pg_namespace AS namespace ON namespace.oid = child.relnamespace
     WHERE constraint_row.contype = 'f'
       AND namespace.nspname = current_schema()
       AND child.relname IN (
         'produto',
         'pedido',
         'item_pedido',
         'ficha_tecnica_item',
         'item_pedido_composicao',
         'movimento_estoque',
         'pagamento_pedido'
       )
  LOOP
    SELECT array_agg(attribute.attname ORDER BY key_column.ordinality)
      INTO child_columns
      FROM unnest(
        (SELECT conkey FROM pg_constraint WHERE oid = fk.oid)
      ) WITH ORDINALITY AS key_column(attnum, ordinality)
      JOIN pg_attribute AS attribute
        ON attribute.attrelid = (
          SELECT conrelid FROM pg_constraint WHERE oid = fk.oid
        )
       AND attribute.attnum = key_column.attnum;

    IF
      (fk.relname = 'produto' AND child_columns = ARRAY['categoria_id']) OR
      (fk.relname = 'pedido' AND child_columns = ARRAY['mesa_id']) OR
      (
        fk.relname = 'item_pedido'
        AND child_columns IN (ARRAY['pedido_id'], ARRAY['produto_id'])
      ) OR
      (
        fk.relname = 'ficha_tecnica_item'
        AND child_columns IN (ARRAY['produto_id'], ARRAY['item_estoque_id'])
      ) OR
      (
        fk.relname = 'item_pedido_composicao'
        AND child_columns IN (
          ARRAY['pedido_id'],
          ARRAY['item_pedido_id'],
          ARRAY['item_estoque_id'],
          ARRAY['tenant_id', 'item_pedido_id']
        )
      ) OR
      (
        fk.relname = 'movimento_estoque'
        AND child_columns IN (
          ARRAY['item_estoque_id'],
          ARRAY['pedido_id'],
          ARRAY['item_pedido_id'],
          ARRAY['tenant_id', 'item_pedido_id']
        )
      ) OR
      (
        fk.relname = 'pagamento_pedido'
        AND child_columns = ARRAY['pedido_id']
      )
    THEN
      EXECUTE format(
        'ALTER TABLE %I DROP CONSTRAINT %I',
        fk.relname,
        fk.conname
      );
    END IF;
  END LOOP;
END
$$;

-- Reconcile canonical constraints by full catalog definition.
DO $$
DECLARE
  expected RECORD;
  constraint_row RECORD;
  child_columns TEXT[];
  parent_columns TEXT[];
BEGIN
  FOR expected IN
    SELECT *
      FROM (
        VALUES
          (
            'item_pedido_composicao_tenant_pedido_item_fkey',
            'item_pedido_composicao',
            ARRAY['tenant_id', 'pedido_id', 'item_pedido_id']::TEXT[],
            'item_pedido',
            ARRAY['tenant_id', 'pedido_id', 'id']::TEXT[],
            'c'
          ),
          (
            'movimento_estoque_tenant_pedido_item_fkey',
            'movimento_estoque',
            ARRAY['tenant_id', 'pedido_id', 'item_pedido_id']::TEXT[],
            'item_pedido',
            ARRAY['tenant_id', 'pedido_id', 'id']::TEXT[],
            'a'
          )
      ) AS definitions(
        constraint_name,
        child_table,
        expected_child_columns,
        parent_table,
        expected_parent_columns,
        expected_delete_action
      )
  LOOP
    SELECT constraint_catalog.*
      INTO constraint_row
      FROM pg_constraint AS constraint_catalog
     WHERE constraint_catalog.conrelid = expected.child_table::regclass
       AND constraint_catalog.conname = expected.constraint_name;

    IF FOUND THEN
      SELECT array_agg(
               attribute.attname::TEXT
               ORDER BY key_column.ordinality
             )
        INTO child_columns
        FROM unnest(
          constraint_row.conkey
        ) WITH ORDINALITY AS key_column(attnum, ordinality)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = constraint_row.conrelid
         AND attribute.attnum = key_column.attnum;

      SELECT array_agg(
               attribute.attname::TEXT
               ORDER BY key_column.ordinality
             )
        INTO parent_columns
        FROM unnest(
          constraint_row.confkey
        ) WITH ORDINALITY AS key_column(attnum, ordinality)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = constraint_row.confrelid
         AND attribute.attnum = key_column.attnum;

      IF constraint_row.contype <> 'f'
         OR constraint_row.conrelid <> expected.child_table::regclass
         OR constraint_row.confrelid <> expected.parent_table::regclass
         OR child_columns IS DISTINCT FROM expected.expected_child_columns
         OR parent_columns IS DISTINCT FROM expected.expected_parent_columns
         OR constraint_row.confdeltype::TEXT
              <> expected.expected_delete_action
      THEN
        EXECUTE format(
          'ALTER TABLE %I DROP CONSTRAINT %I',
          expected.child_table,
          expected.constraint_name
        );
      END IF;
    END IF;
  END LOOP;

  SELECT constraint_catalog.*
    INTO constraint_row
    FROM pg_constraint AS constraint_catalog
   WHERE constraint_catalog.conrelid = 'movimento_estoque'::regclass
     AND constraint_catalog.conname =
       'movimento_estoque_item_requires_pedido_check';

  IF FOUND
     AND (
       constraint_row.contype <> 'c'
       OR lower(
            regexp_replace(
              pg_get_expr(
                constraint_row.conbin,
                constraint_row.conrelid
              ),
              '[[:space:]()]',
              '',
              'g'
            )
          ) <> 'item_pedido_idisnullorpedido_idisnotnull'
     )
  THEN
    ALTER TABLE movimento_estoque
      DROP CONSTRAINT movimento_estoque_item_requires_pedido_check;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'item_pedido_composicao'::regclass
       AND conname = 'item_pedido_composicao_tenant_pedido_item_fkey'
  ) THEN
    ALTER TABLE item_pedido_composicao
      ADD CONSTRAINT item_pedido_composicao_tenant_pedido_item_fkey
      FOREIGN KEY (tenant_id, pedido_id, item_pedido_id)
      REFERENCES item_pedido(tenant_id, pedido_id, id)
      ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'movimento_estoque'::regclass
       AND conname = 'movimento_estoque_tenant_pedido_item_fkey'
  ) THEN
    ALTER TABLE movimento_estoque
      ADD CONSTRAINT movimento_estoque_tenant_pedido_item_fkey
      FOREIGN KEY (tenant_id, pedido_id, item_pedido_id)
      REFERENCES item_pedido(tenant_id, pedido_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'movimento_estoque'::regclass
       AND conname = 'movimento_estoque_item_requires_pedido_check'
  ) THEN
    ALTER TABLE movimento_estoque
      ADD CONSTRAINT movimento_estoque_item_requires_pedido_check
      CHECK (item_pedido_id IS NULL OR pedido_id IS NOT NULL);
  END IF;
END
$$;
