'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { criarProduto, editarProduto } from '@/lib/actions/produtos'
import { formatCurrencyInput, formatDecimalAsCurrencyInput } from '@/lib/money'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { userFacingErrorMessage } from '@/lib/ui/error-messages'

type Produto = { id: string; nome: string; descricao: string | null; preco: string }
type Props = {
  open: boolean
  onClose: () => void
  categoriaId: string
  produto?: Produto
}

export function ProdutoForm({ open, onClose, categoriaId, produto }: Props) {
  const router = useRouter()
  const [nome, setNome] = useState(produto?.nome ?? '')
  const [descricao, setDescricao] = useState(produto?.descricao ?? '')
  const [preco, setPreco] = useState(produto?.preco ? formatDecimalAsCurrencyInput(produto.preco) : '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      if (produto) {
        await editarProduto(produto.id, { nome, descricao, preco })
      } else {
        await criarProduto({ categoriaId, nome, descricao, preco })
      }
      router.refresh()
      onClose()
      toast.success(produto ? 'Produto atualizado com sucesso.' : 'Produto criado com sucesso.')
    } catch (error) {
      console.error('Failed to save product', error)
      toast.error(userFacingErrorMessage(error, 'Não foi possível salvar o produto por um erro inesperado.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{produto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="produto-nome">Nome</Label>
            <Input id="produto-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="produto-preco">Preço (R$)</Label>
            <Input id="produto-preco" inputMode="numeric" placeholder="0,00" value={preco} onChange={(e) => setPreco(formatCurrencyInput(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="produto-descricao">Descrição (opcional)</Label>
            <Textarea id="produto-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
          {produto ? (
            <div className="flex flex-col gap-2 rounded-[var(--radius)] border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Ingredientes do produto</p>
                <p className="mt-1 text-xs text-muted-foreground">Defina os insumos consumidos na ficha técnica.</p>
              </div>
              <Link href={`/admin/estoque/ficha-tecnica?produtoId=${produto.id}`} className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius)] border border-border bg-background px-3 text-sm font-medium hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Editar insumos
              </Link>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" intent="destructive" appearance="outline" className="min-h-11" onClick={onClose}>Cancelar</Button>
          <Button type="button" intent="positive" appearance="solid" className="min-h-11" aria-busy={saving} disabled={saving || !nome || !preco} onClick={handleSave}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
