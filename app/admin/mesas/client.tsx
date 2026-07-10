'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AdminEmptyState, AdminPage, AdminPageHeader, AdminPanel, AdminStatsGrid, AdminStatCard } from '@/components/admin/admin-page'
import { criarMesa, toggleAtiva } from '@/lib/actions/mesas'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

type Mesa = { id: string; numero: number; ativa: boolean }

export function MesasAdminClient({ mesas }: { mesas: Mesa[] }) {
  const router = useRouter()
  const [novoNumero, setNovoNumero] = useState('')
  const mesasAtivas = mesas.filter((mesa) => mesa.ativa).length
  const mesasInativas = mesas.length - mesasAtivas

  async function handleNovaMesa() {
    const n = parseInt(novoNumero)
    if (!n) return
    try {
      await criarMesa(n)
      setNovoNumero('')
      router.refresh()
      toast.success('Mesa criada com sucesso.')
    } catch (error) {
      console.error('Failed to create table', error)
      toast.error('Não foi possível criar a mesa.')
    }
  }

  async function handleToggleMesa(mesaId: string) {
    try {
      await toggleAtiva(mesaId)
      router.refresh()
    } catch (error) {
      console.error('Failed to toggle table availability', error)
      toast.error('Não foi possível atualizar a mesa.')
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Mesas"
        description="Cadastre e ative as mesas que aparecem no atendimento do garçom."
      />

      <AdminStatsGrid className="xl:grid-cols-3">
        <AdminStatCard label="Mesas cadastradas" value={mesas.length} detail="Total disponível para gestão." />
        <AdminStatCard label="Ativas" value={mesasAtivas} detail="Aparecem no fluxo do garçom." tone="success" />
        <AdminStatCard label="Inativas" value={mesasInativas} detail="Ficam ocultas da operação." />
      </AdminStatsGrid>

      <AdminPanel title="Adicionar mesa" description="Use números simples para bater com a identificação física do salão.">
        <label htmlFor="numero-mesa" className="text-sm font-medium">
          Número da mesa
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="numero-mesa"
            type="number"
            className="min-h-11 rounded-[var(--radius)] border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:w-40"
            placeholder="Ex.: 12"
            value={novoNumero}
            onChange={(e) => setNovoNumero(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNovaMesa()}
          />
          <Button size="sm" className="min-h-11" onClick={handleNovaMesa}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Mesa
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel title="Mapa de mesas" description="Ative ou pause mesas sem excluir o histórico operacional.">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {mesas.length === 0 ? (
          <AdminEmptyState
            className="sm:col-span-2 lg:col-span-3"
            title="Nenhuma mesa cadastrada"
            description="Adicione a primeira mesa para liberar o atendimento."
          />
        ) : (
          mesas.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-[var(--radius)] border bg-card px-4 py-3">
              <span className="font-medium">Mesa {m.numero}</span>
              <button
                type="button"
                aria-pressed={m.ativa}
                className={`min-h-11 rounded-full px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                  m.ativa
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                }`}
                onClick={() => handleToggleMesa(m.id)}
              >
                {m.ativa ? 'Ativa' : 'Inativa'}
              </button>
            </div>
          ))
        )}
      </div>
      </AdminPanel>
    </AdminPage>
  )
}
