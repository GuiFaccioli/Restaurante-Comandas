'use client'

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { userFacingErrorMessage } from '@/lib/ui/error-messages'

import { AdminPanel } from '@/components/admin/admin-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  criarCategoria,
  editarCategoria,
  removerCategoria,
  type CreatedCategory,
} from '@/lib/actions/produtos'
import { cn } from '@/lib/utils'

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

type EditorState =
  | { mode: 'idle' }
  | { mode: 'create' }
  | { mode: 'edit'; categoryId: string }

type PendingMutation = null | 'create' | 'rename' | 'delete'
type FocusTarget = 'add' | string

function errorMessage(error: unknown) {
  return userFacingErrorMessage(error, 'Não foi possível salvar a categoria por um erro inesperado.')
}

export function CategoryManager({
  categorias,
  selectedId,
  onSelect,
  onCreated,
  onDeleted,
  onRefresh,
}: CategoryManagerProps) {
  const [editor, setEditor] = useState<EditorState>({ mode: 'idle' })
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<PendingMutation>(null)
  const pendingRef = useRef<PendingMutation>(null)
  const returnFocusRef = useRef<FocusTarget | null>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editButtonRefs = useRef(new Map<string, HTMLElement>())
  const ordered = [...categorias].sort((a, b) => a.ordem - b.ordem)

  useEffect(() => {
    if (editor.mode !== 'idle') {
      inputRef.current?.focus()
      inputRef.current?.select()
      return
    }

    const target = returnFocusRef.current
    if (!target) return
    returnFocusRef.current = null
    queueMicrotask(() => {
      if (target === 'add') addButtonRef.current?.focus()
      else editButtonRefs.current.get(target)?.focus()
    })
  }, [editor])

  function beginMutation(kind: Exclude<PendingMutation, null>) {
    if (pendingRef.current) return false
    pendingRef.current = kind
    setPending(kind)
    return true
  }

  function finishMutation() {
    pendingRef.current = null
    setPending(null)
  }

  function closeEditor(target: FocusTarget) {
    returnFocusRef.current = target
    setEditor({ mode: 'idle' })
    setDraft('')
    setError('')
  }

  function openCreate() {
    setEditor({ mode: 'create' })
    setDraft('')
    setError('')
  }

  function openEdit(category: CategoryListItem) {
    setEditor({ mode: 'edit', categoryId: category.id })
    setDraft(category.nome)
    setError('')
  }

  function handleEscape(
    event: KeyboardEvent<HTMLFormElement>,
    target: FocusTarget
  ) {
    if (event.key !== 'Escape' || pendingRef.current) return
    event.preventDefault()
    closeEditor(target)
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nome = draft.trim()
    if (!nome) {
      setError('Informe o nome da categoria')
      return
    }
    if (!beginMutation('create')) return

    setError('')
    try {
      const created = await criarCategoria(nome)
      onCreated(created)
      onRefresh()
      toast.success('Categoria criada')
      finishMutation()
      closeEditor('add')
    } catch (caught) {
      finishMutation()
      setError(errorMessage(caught))
      toast.error(errorMessage(caught))
    }
  }

  async function submitRename(
    event: FormEvent<HTMLFormElement>,
    category: CategoryListItem
  ) {
    event.preventDefault()
    const nome = draft.trim()
    if (!nome) {
      setError('Informe o nome da categoria')
      return
    }
    if (!beginMutation('rename')) return

    setError('')
    try {
      await editarCategoria(category.id, nome)
      onRefresh()
      toast.success('Categoria atualizada')
      finishMutation()
      closeEditor(category.id)
    } catch (caught) {
      finishMutation()
      setError(errorMessage(caught))
      toast.error(errorMessage(caught))
    }
  }

  async function deleteCategory(category: CategoryListItem) {
    if (pendingRef.current) return
    if (!window.confirm(`Excluir a categoria "${category.nome}"?`)) return

    const index = ordered.findIndex((item) => item.id === category.id)
    const selectedCategorySurvives =
      selectedId !== category.id &&
      ordered.some((item) => item.id === selectedId)
    const focusFallback = selectedCategorySurvives
      ? ordered.find((item) => item.id === selectedId)
      : (ordered[index + 1] ?? ordered[index - 1])

    if (!beginMutation('delete')) return
    setError('')
    try {
      const result = await removerCategoria(category.id)
      if (!result.ok) {
        finishMutation()
        setError(result.error)
        return
      }
      onDeleted(category.id)
      onRefresh()
      toast.success('Categoria excluída')
      finishMutation()
      closeEditor(focusFallback?.id ?? 'add')
    } catch (caught) {
      finishMutation()
      setError(errorMessage(caught))
      toast.error(errorMessage(caught))
    }
  }

  const createErrorId = 'new-category-error'

  return (
    <AdminPanel
      title="Categorias"
      description="Ex.: Cozinha, Pizzaria, Bebidas"
      action={
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                ref={addButtonRef}
                type="button"
                intent="positive"
                appearance="soft"
                size="icon"
                className="size-11 min-h-11"
                aria-label="Adicionar categoria"
                disabled={pending !== null}
                onClick={openCreate}
              />
            }
          >
            <Plus aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Adicionar categoria</TooltipContent>
        </Tooltip>
      }
    >
      {editor.mode === 'create' ? (
        <form
          className="mb-3 flex flex-wrap items-end gap-2 border-b pb-3"
          aria-busy={pending === 'create'}
          onSubmit={submitCreate}
          onKeyDown={(event) => handleEscape(event, 'add')}
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
              disabled={pending !== null}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? createErrorId : undefined}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
          <Button
            type="button"
            intent="destructive"
            appearance="ghost"
            className="min-h-11"
            disabled={pending !== null}
            aria-label="Cancelar nova categoria"
            onClick={() => closeEditor('add')}
          >
            <X aria-hidden="true" />
            Cancelar
          </Button>
          <Button
            type="submit"
            intent="positive"
            appearance="solid"
            className="min-h-11"
            disabled={pending !== null}
            aria-label="Salvar nova categoria"
          >
            <Check aria-hidden="true" />
            {pending === 'create' ? 'Criando...' : 'Criar'}
          </Button>
          {error ? (
            <p id={createErrorId} className="basis-full text-sm text-destructive" role="alert">
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
          {ordered.map((category) => {
            const editing =
              editor.mode === 'edit' && editor.categoryId === category.id
            const errorId = `category-error-${category.id}`

            return (
              <li key={category.id} className="py-1 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-1">
                  <Button
                    type="button"
                    intent="neutral"
                    appearance="ghost"
                    className={cn(
                      'min-h-11 min-w-0 flex-1 justify-start whitespace-normal break-words rounded-md text-left',
                      selectedId === category.id && 'bg-muted font-semibold'
                    )}
                    aria-pressed={selectedId === category.id}
                    disabled={pending !== null}
                    onClick={() => onSelect(category.id)}
                  >
                    {category.nome}
                  </Button>

                  {!editing ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            ref={(node) => {
                              if (node) editButtonRefs.current.set(category.id, node)
                              else editButtonRefs.current.delete(category.id)
                            }}
                            type="button"
                            intent="informational"
                            appearance="ghost"
                            size="icon"
                            className="size-11 shrink-0"
                            aria-label={`Editar categoria ${category.nome}`}
                            disabled={pending !== null}
                            onClick={() => openEdit(category)}
                          />
                        }
                      >
                        <Pencil aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>Editar categoria</TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>

                {editing ? (
                  <form
                    className="flex min-w-0 flex-wrap items-end gap-2 border-t py-3"
                    aria-busy={pending !== null}
                    onSubmit={(event) => submitRename(event, category)}
                    onKeyDown={(event) => handleEscape(event, category.id)}
                  >
                    <div className="min-w-0 flex-1 basis-48">
                      <label
                        htmlFor={`category-name-${category.id}`}
                        className="text-xs font-medium"
                      >
                        Nome da categoria {category.nome}
                      </label>
                      <Input
                        ref={inputRef}
                        id={`category-name-${category.id}`}
                        className="mt-1 min-h-11"
                        value={draft}
                        required
                        disabled={pending !== null}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : undefined}
                        onChange={(event) => setDraft(event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      intent="destructive"
                      appearance="ghost"
                      className="min-h-11"
                      aria-label={`Cancelar edição de ${category.nome}`}
                      disabled={pending !== null}
                      onClick={() => closeEditor(category.id)}
                    >
                      <X aria-hidden="true" />
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      intent="destructive"
                      appearance="ghost"
                      className="min-h-11"
                      aria-label={`Excluir categoria ${category.nome}`}
                      disabled={pending !== null}
                      onClick={() => void deleteCategory(category)}
                    >
                      <Trash2 aria-hidden="true" />
                      Excluir
                    </Button>
                    <Button
                      type="submit"
                      intent="positive"
                      appearance="solid"
                      className="min-h-11"
                      aria-label={`Salvar categoria ${category.nome}`}
                      disabled={pending !== null}
                    >
                      <Check aria-hidden="true" />
                      {pending === 'rename' ? 'Salvando...' : 'Salvar'}
                    </Button>
                    {error ? (
                      <p
                        id={errorId}
                        className="basis-full text-sm text-destructive"
                        role="alert"
                      >
                        {error}
                      </p>
                    ) : null}
                  </form>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </AdminPanel>
  )
}
