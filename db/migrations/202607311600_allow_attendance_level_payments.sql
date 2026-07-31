-- Attendance-level payments are not tied to one individual order.
ALTER TABLE pagamento_pedido
  ALTER COLUMN pedido_id DROP NOT NULL;
