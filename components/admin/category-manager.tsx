'use client'

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Check, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel } from '@/components/admin/admin-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  criarCategoria,
  type CreatedCategory,
} from '@/lib/actions/produtos'

export type CategoryListItem = {
  id: string
  nome: string
  ordem: number
}

export type CategoryManagerProps = {
  categorias: CategoryListItem[]
  selectedId: string
  onSelect: (id: string) => void
  onCreated: (category: CreatedCategory) => void
  onDeleted: (id: string) => void
  onRefresh: () => void
}

type EditorState = { mode: 'idle' } | { mode: 'create' }

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Não foi possível salvar a categoria'
}

export function CategoryManager({
  categorias,
  selectedId,
  onSelect,
  onCreated,
  onRefresh,
}: CategoryManagerProps) {
  const [editor, setEditor] = useState<EditorState>({ mode: 'idle' })
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const restoreAddFocusRef = useRef(false)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ordered = [...categorias].sort((a, b) => a.ordem - b.ordem)

  useEffect(() => {
    if (editor.mode === 'create') {
      inputRef.current?.focus()
      return
    }
    if (!restoreAddFocusRef.current) return
    restoreAddFocusRef.current = false
    queueMicrotask(() => addButtonRef.current?.focus())
  }, [editor])

  function closeCreate() {
    restoreAddFocusRef.current = true
    setEditor({ mode: 'idle' })
    setDraft('')
    setError('')
  }

  function openCreate() {
    setEditor({ mode: 'create' })
    setDraft('')
    setError('')
  }

  function handleEscape(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Escape' || pendingRef.current) return
    event.preventDefault()
    closeCreate()
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nome = draft.trim()
    if (!nome) {
      setError('Informe o nome da categoria')
      return
    }
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError('')

    try {
      const created = await criarCategoria(nome)
      onCreated(created)
      onRefresh()
      toast.success('Categoria criada')
      pendingRef.current = false
      setPending(false)
      closeCreate()
    } catch (caught) {
      pendingRef.current = false
      setPending(false)
      setError(errorMessage(caught))
      toast.error('Não foi possível criar a categoria')
    }
  }

  const errorId = 'new-category-error'

  return (
    <AdminPanel
      title="Categorias"
      description="Escolha uma seção para revisar produtos."
      action={
        <Button
          ref={addButtonRef}
          type="button"
          intent="positive"
          appearance="ghost"
          size="sm"
          className="min-h-11"
          aria-label="Adicionar categoria"
          disabled={pending}
          onClick={openCreate}
        >
          <Plus aria-hidden="true" />
          Adicionar
        </Button>
      }
    >
      {editor.mode === 'create' ? (
        <form
          className="mb-3 flex flex-wrap items-end gap-2 border-b pb-3"
          aria-busy={pending}
          onSubmit={submitCreate}
          onKeyDown={handleEscape}
        >
          <div className="min-w-0 flex-1 basis-48">
            <label htmlFor="new-category-name" className="text-xs font-medium">
              Nome da nova categoria
            </label>
            <Input
              ref={inputRef}
              id="new-category-name"
              className="mt-1 min-h-11"
              value={draft}
              required
              disabled={pending}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
          <Button
            type="button"
            intent="neutral"
            appearance="ghost"
            className="min-h-11"
            disabled={pending}
            aria-label="Cancelar nova categoria"
            onClick={closeCreate}
          >
            <X aria-hidden="true" />
            Cancelar
          </Button>
          <Button
            type="submit"
            intent="positive"
            appearance="solid"
            className="min-h-11"
            disabled={pending}
            aria-label="Salvar nova categoria"
          >
            <Check aria-hidden="true" />
            {pending ? 'Criando...' : 'Criar'}
          </Button>
          {error ? (
            <p id={errorId} className="basis-full text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}

      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma categoria criada. Use Adicionar para começar.
        </p>
      ) : (
        <ul className="divide-y" aria-label="Categorias do cardápio">
          {ordered.map((category) => (
            <li key={category.id} className="py-1 first:pt-0 last:pb-0">
              <Button
                type="button"
                intent="neutral"
                appearance="ghost"
                className="min-h-11 w-full justify-start whitespace-normal break-words rounded-md text-left"
                aria-pressed={selectedId === category.id}
                disabled={pending}
                onClick={() => onSelect(category.id)}
              >
                {category.nome}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </AdminPanel>
  )
}
