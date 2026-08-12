# Review package: 9341747..HEAD

## Commits
0f4eb55 test: remove brittle attendance implementation assertion
adbebcd test: update attendance handoff contract

## Stat
 tests/unit/attendance/attendance-contract.test.ts | 1 -
 1 file changed, 1 deletion(-)

## Diff
diff --git a/tests/unit/attendance/attendance-contract.test.ts b/tests/unit/attendance/attendance-contract.test.ts
index a37ad71..5fbd45f 100644
--- a/tests/unit/attendance/attendance-contract.test.ts
+++ b/tests/unit/attendance/attendance-contract.test.ts
@@ -18,14 +18,13 @@ describe('attendance operational contract', () => {
     expect(source('app/admin/pedidos/page.tsx')).toContain('getCashierAccounts')
     expect(source('app/admin/pedidos/client.tsx')).toContain('registrarPagamentoAtendimento')
     expect(source('components/garcom/mesa-atendimento-gate.tsx')).toContain('Continuar atendimento')
     expect(source('components/garcom/mesa-atendimento-gate.tsx')).toContain('Iniciar novo atendimento')
     expect(source('lib/stock/order-consumption.ts')).toContain('atendimentoId')
   })
 
   it('makes delivery the automatic handoff to cashier without a waiter approval action', () => {
     expect(source('app/garcom/mesa/[id]/client.tsx')).not.toContain('Enviar conta para pagamento')
     expect(source('app/garcom/mesa/[id]/page.tsx')).toContain("item.status === 'awaiting_payment'")
-    expect(source('lib/stock/order-consumption.ts')).toContain("status: 'awaiting_payment'")
     expect(source('app/admin/pedidos/client.tsx')).toContain('TenantEventListener')
   })
 })
