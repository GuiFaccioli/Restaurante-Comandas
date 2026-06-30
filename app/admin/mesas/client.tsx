'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { criarMesa, toggleAtiva } from '@/lib/actions/mesas'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

type Mesa = { id: string; numero: number; ativa: boolean }

export function MesasAdminClient({ mesas }: { mesas: Mesa[] }) {
  const router = useRouter()
  const [novoNumero, setNovoNumero] = useState('')

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

  return (
    <div className="max-w-md space-y-4">
      <div className="flex gap-2">
        <input
          type="number"
          className="border rounded-[var(--radius)] px-3 py-2 text-sm w-32"
          placeholder="Nº da mesa"
          value={novoNumero}
          onChange={(e) => setNovoNumero(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleNovaMesa()}
        />
        <Button size="sm" onClick={handleNovaMesa}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar Mesa
        </Button>
      </div>
      <div className="space-y-2">
        {mesas.map((m) => (
          <div key={m.id} className="border rounded-[var(--radius)] px-4 py-3 flex justify-between items-center">
            <span className="font-medium">Mesa {m.numero}</span>
            <Badge
              className="cursor-pointer"
              variant={m.ativa ? 'default' : 'secondary'}
              onClick={async () => {
                try {
                  await toggleAtiva(m.id)
                  router.refresh()
                } catch (error) {
                  console.error('Failed to toggle table availability', error)
                  toast.error('Não foi possível atualizar a mesa.')
                }
              }}
            >
              {m.ativa ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
