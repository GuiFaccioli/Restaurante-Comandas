'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { criarProduto, editarProduto } from '@/lib/actions/produtos'
import { formatCurrencyInput, formatDecimalAsCurrencyInput } from '@/lib/money'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Produto = { id: string; nome: string; descricao: string | null; preco: string; imagemUrl: string | null }
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
  const [imagemUrl, setImagemUrl] = useState(produto?.imagemUrl ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      if (produto) {
        await editarProduto(produto.id, { nome, descricao, preco, imagemUrl })
      } else {
        await criarProduto({ categoriaId, nome, descricao, preco, imagemUrl })
      }
      router.refresh()
      onClose()
      toast.success(produto ? 'Produto atualizado com sucesso.' : 'Produto criado com sucesso.')
    } catch (error) {
      console.error('Failed to save product', error)
      toast.error('Não foi possível salvar o produto.')
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
          <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} /></div>
          <div>
            <Label>Preço (R$)</Label>
            <Input
              inputMode="numeric"
              placeholder="0,00"
              value={preco}
              onChange={(e) => setPreco(formatCurrencyInput(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>URL da Imagem</Label>
            <Input value={imagemUrl} onChange={(e) => setImagemUrl(e.target.value)} placeholder="https://..." />
            {imagemUrl && (
              <img
                src={imagemUrl}
                alt="preview"
                className="w-full h-40 object-cover rounded-[var(--radius)] border"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'block' }}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !nome || !preco}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

