INSERT INTO shopping_list_item (
  tenant_id,
  kind,
  insumo_id,
  nome,
  unidade,
  quantidade_sugerida
)
SELECT
  insumo.tenant_id,
  'automatic',
  insumo.id,
  insumo.nome,
  insumo.unidade_compra,
  CEIL(
    (
      (insumo.estoque_ideal - insumo.estoque_atual)
        / insumo.fator_compra_para_base
    ) * 1000
  ) / 1000
FROM insumo
WHERE insumo.ativo = true
  AND insumo.estoque_atual <= insumo.estoque_minimo
  AND insumo.estoque_ideal > insumo.estoque_atual
  AND insumo.fator_compra_para_base > 0
ON CONFLICT (tenant_id, insumo_id) WHERE kind = 'automatic' DO NOTHING;
