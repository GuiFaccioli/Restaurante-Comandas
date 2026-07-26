import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('waiter order action semantics', () => {
  it('keeps back/inspection neutral and persisted cancellation destructive', () => {
    const back = source('app/garcom/mesa/[id]/client.tsx')
    const panel = source('components/garcom/table-orders-panel.tsx')

    expect(back).toContain('aria-label="Voltar"')
    expect(panel).toMatch(/intent="destructive"[\s\S]*Cancelar/)
    expect(panel).toMatch(/intent="neutral"[\s\S]*Itens/)
  })

})
