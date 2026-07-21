'use client'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { criarProduto, editarProduto, uploadProdutoImagem } from '@/lib/actions/produtos'
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
  const [imagemArquivo, setImagemArquivo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState(produto?.imagemUrl ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setImagemArquivo(null)
    setImagemUrl(produto?.imagemUrl ?? '')
    setPreviewUrl(produto?.imagemUrl ?? '')
  }, [produto])

  async function handleSave() {
    setSaving(true)
    try {
      let imagemFinal = imagemUrl
      if (imagemArquivo) {
        const formData = new FormData()
        formData.set('file', imagemArquivo)
        const uploaded = await uploadProdutoImagem(formData)
        imagemFinal = uploaded.url
      }
      if (produto) {
        await editarProduto(produto.id, { nome, descricao, preco, imagemUrl: imagemFinal })
      } else {
        await criarProduto({ categoriaId, nome, descricao, preco, imagemUrl: imagemFinal })
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
          <div className="space-y-1">
            <Label htmlFor="produto-nome">Nome</Label>
            <Input id="produto-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="produto-descricao">Descrição</Label>
            <Textarea
              id="produto-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="produto-preco">Preço (R$)</Label>
            <Input
              id="produto-preco"
              inputMode="numeric"
              placeholder="0,00"
              value={preco}
              onChange={(e) => setPreco(formatCurrencyInput(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="produto-imagem-arquivo">Imagem do produto</Label>
            <Input
              id="produto-imagem-arquivo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setImagemArquivo(file)
                if (file) setPreviewUrl(URL.createObjectURL(file))
              }}
            />
            <p className="text-xs text-muted-foreground">JPG, PNG ou WebP, até 4 MB.</p>
            <Label htmlFor="produto-imagem-url">URL legada (opcional)</Label>
            <Input
              id="produto-imagem-url"
              value={imagemUrl}
              onChange={(e) => setImagemUrl(e.target.value)}
              placeholder="https://..."
            />
            {previewUrl && (
              <img
                src={previewUrl}
                alt="preview"
                className="w-full h-40 object-cover rounded-[var(--radius)] border"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'block' }}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" intent="neutral" appearance="outline" className="min-h-11" onClick={onClose}>Cancelar</Button>
          <Button type="button" intent="positive" appearance="solid" className="min-h-11" aria-busy={saving} disabled={saving || !nome || !preco} onClick={handleSave}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

