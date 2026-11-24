import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ForbiddenState } from '@/components/forbidden-state'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import type { ProductionProcessStep } from '../data/production-process'
import { productionResourceQueryKeys } from '../data/production-resource-query-keys'
import { useProductionProcessesQuery } from '../hooks/use-production-resources'
import { productionProcessesService } from '../services/production-processes-service'
import { productionResourceSync } from '../services/production-resource-sync'
import { normalizeProductionProcessStepCode } from '../utils/production-code-normalization'

export type ProductionProcessLibraryConfigurationInteractionState = {
  hasUnsavedChanges: boolean
  isSaving: boolean
}

type ProductionProcessLibraryConfigurationContentProps = {
  onInteractionStateChange?: (
    state: ProductionProcessLibraryConfigurationInteractionState
  ) => void
  onProcessSaved?: (process: ProductionProcessStep) => void
}

type ProductionProcessLibraryEditorDraft = {
  id: string
  code: string
  name: string
  description: string
  sortOrder: string
  isActive: boolean
}

function createProductionProcessLibraryEditorDraft(
  process?: ProductionProcessStep
): ProductionProcessLibraryEditorDraft {
  return {
    id: process?.id ?? '',
    code: process?.code ?? '',
    name: process?.name ?? '',
    description: process?.description ?? '',
    sortOrder: String(process?.sortOrder ?? 0),
    isActive: process?.isActive ?? true,
  }
}

export function ProductionProcessLibraryConfigurationContent(
  props: ProductionProcessLibraryConfigurationContentProps
) {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  return (
    <ProductionProcessLibraryConfigurationEditor key={actorId} {...props} />
  )
}

function ProductionProcessLibraryConfigurationEditor({
  onInteractionStateChange,
  onProcessSaved,
}: ProductionProcessLibraryConfigurationContentProps) {
  const { t } = useLanguage()
  const { allowsPermission, isChecking } = usePermissionActions()
  const canRead = !isChecking && allowsPermission('menu_prod_config')
  const canManage = canRead && allowsPermission('perm_manage')
  const queryClient = useQueryClient()
  const query = useProductionProcessesQuery({ enabled: canRead })
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(createProductionProcessLibraryEditorDraft)
  const [originalDraft, setOriginalDraft] = useState(
    createProductionProcessLibraryEditorDraft
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const mutationInProgress = useRef(false)
  const hasUnsavedChanges =
    editorOpen && JSON.stringify(draft) !== JSON.stringify(originalDraft)
  const processes = useMemo(
    () =>
      [...(query.data ?? [])].sort(
        (left, right) =>
          (left.sortOrder ?? 0) - (right.sortOrder ?? 0) ||
          left.name.localeCompare(right.name)
      ),
    [query.data]
  )
  const filteredProcesses = processes.filter((process) =>
    [process.code, process.name, process.description]
      .join(' ')
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  )

  useEffect(() => {
    onInteractionStateChange?.({ hasUnsavedChanges, isSaving })
  }, [hasUnsavedChanges, isSaving, onInteractionStateChange])

  async function beginEditingProductionProcessLibraryEntry(
    process?: ProductionProcessStep
  ) {
    if (!canManage || mutationInProgress.current) return
    if (
      hasUnsavedChanges &&
      !(await requestApplicationConfirmation(
        t('productionArchitecture.processLibrary.discardChanges')
      ))
    )
      return
    const nextDraft = createProductionProcessLibraryEditorDraft(process)
    setDraft(nextDraft)
    setOriginalDraft(nextDraft)
    setSaveError('')
    setEditorOpen(true)
  }

  async function cancelEditingProductionProcessLibraryEntry() {
    if (mutationInProgress.current) return
    if (
      hasUnsavedChanges &&
      !(await requestApplicationConfirmation(
        t('productionArchitecture.processLibrary.discardChanges')
      ))
    )
      return
    setEditorOpen(false)
    setSaveError('')
  }

  async function saveProductionProcessLibraryEntry(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    if (!canManage || mutationInProgress.current) return
    const code = normalizeProductionProcessStepCode(draft.code)
    const sortOrder = Number(draft.sortOrder)
    if (
      !code ||
      !draft.name.trim() ||
      !draft.sortOrder.trim() ||
      !Number.isInteger(sortOrder) ||
      sortOrder < 0 ||
      sortOrder > 1000000
    ) {
      setSaveError(t('productionArchitecture.processLibrary.validation'))
      return
    }
    mutationInProgress.current = true
    setIsSaving(true)
    setSaveError('')
    let saved: ProductionProcessStep
    try {
      saved = await productionProcessesService.saveStep({
        id: draft.id,
        code,
        name: draft.name.trim(),
        description: draft.description.trim(),
        sortOrder,
        isActive: draft.isActive,
      })
      queryClient.setQueryData<ProductionProcessStep[]>(
        productionResourceQueryKeys.processes(),
        (current) => [
          ...(current ?? []).filter((process) => process.id !== saved.id),
          saved,
        ]
      )
      productionResourceSync.emitProcessesUpdated({ invalidate: false })
      setEditorOpen(false)
      toast.success(t('productionArchitecture.processLibrary.saved'))
    } catch (error) {
      failLoudly(error, 'ProductionProcessLibraryConfiguration.save', {
        silentUI: true,
      })
      setSaveError(
        error instanceof Error
          ? error.message
          : t('productionArchitecture.processLibrary.saveFailed')
      )
      return
    } finally {
      mutationInProgress.current = false
      setIsSaving(false)
    }
    onProcessSaved?.(saved)
  }

  async function deleteProductionProcessLibraryEntry(
    process: ProductionProcessStep
  ) {
    if (!canManage || mutationInProgress.current || hasUnsavedChanges) return
    if (
      !(await requestApplicationConfirmation(
        t('productionArchitecture.processLibrary.confirmDelete', {
          name: process.name,
        })
      ))
    )
      return
    if (mutationInProgress.current) return
    mutationInProgress.current = true
    setIsSaving(true)
    setSaveError('')
    try {
      await productionProcessesService.deleteStep(process.id)
      queryClient.setQueryData<ProductionProcessStep[]>(
        productionResourceQueryKeys.processes(),
        (current) => (current ?? []).filter((entry) => entry.id !== process.id)
      )
      productionResourceSync.emitProcessesUpdated({ invalidate: false })
      if (draft.id === process.id) setEditorOpen(false)
      toast.success(t('productionArchitecture.processLibrary.deleted'))
    } catch (error) {
      failLoudly(error, 'ProductionProcessLibraryConfiguration.delete', {
        silentUI: true,
      })
      setSaveError(
        error instanceof Error
          ? error.message
          : t('productionArchitecture.processLibrary.saveFailed')
      )
    } finally {
      mutationInProgress.current = false
      setIsSaving(false)
    }
  }

  if (isChecking)
    return (
      <p role='status'>{t('productionArchitecture.processLibrary.loading')}</p>
    )
  if (!canRead) return <ForbiddenState />

  return (
    <div className='grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]'>
      <section
        className='min-w-0 space-y-4'
        aria-label={t('productionArchitecture.processLibrary.list')}
      >
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-sm font-semibold'>
            {t('productionArchitecture.processLibrary.list')}
          </h2>
          {canManage && (
            <Button
              type='button'
              disabled={isSaving || Boolean(query.error) || query.isPending}
              onClick={() => void beginEditingProductionProcessLibraryEntry()}
            >
              <Plus className='size-4' />
              {t('productionArchitecture.processLibrary.create')}
            </Button>
          )}
        </div>
        <Input
          aria-label={t('productionArchitecture.processLibrary.search')}
          placeholder={t('productionArchitecture.processLibrary.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {query.error ? (
          <div role='alert' className='space-y-2 text-sm text-destructive'>
            <p>{query.error.message}</p>
            <Button
              type='button'
              variant='outline'
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              {t('productionArchitecture.processLibrary.retry')}
            </Button>
          </div>
        ) : query.isPending ? (
          <p role='status'>
            {t('productionArchitecture.processLibrary.loading')}
          </p>
        ) : filteredProcesses.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            {t(
              search.trim()
                ? 'productionArchitecture.processLibrary.noMatches'
                : 'productionArchitecture.processLibrary.empty'
            )}
          </p>
        ) : (
          filteredProcesses.map((process) => (
            <article
              key={process.id}
              className='min-w-0 space-y-3 rounded-xl border p-4'
            >
              <div className='flex flex-wrap items-center gap-2'>
                <h3 className='text-sm font-semibold wrap-anywhere'>
                  {process.name}
                </h3>
                <Badge
                  variant='outline'
                  className='max-w-full wrap-anywhere whitespace-normal'
                >
                  {process.code}
                </Badge>
                <Badge variant='secondary'>
                  {t(
                    process.isActive
                      ? 'productionArchitecture.processLibrary.active'
                      : 'productionArchitecture.processLibrary.inactive'
                  )}
                </Badge>
              </div>
              <p className='text-sm wrap-anywhere whitespace-pre-wrap text-muted-foreground'>
                {process.description ||
                  t('productionArchitecture.processLibrary.noDescription')}
              </p>
              {canManage && (
                <div className='flex flex-wrap gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={isSaving}
                    aria-label={t(
                      'productionArchitecture.processLibrary.editEntry',
                      { name: process.name }
                    )}
                    onClick={() =>
                      void beginEditingProductionProcessLibraryEntry(process)
                    }
                  >
                    <Pencil className='size-4' />
                    {t('productionArchitecture.processLibrary.edit')}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={isSaving || hasUnsavedChanges}
                    aria-label={t(
                      'productionArchitecture.processLibrary.deleteEntry',
                      { name: process.name }
                    )}
                    onClick={() =>
                      void deleteProductionProcessLibraryEntry(process)
                    }
                  >
                    <Trash2 className='size-4' />
                    {t('productionArchitecture.processLibrary.delete')}
                  </Button>
                </div>
              )}
            </article>
          ))
        )}
      </section>
      {canManage && editorOpen && (
        <form
          onSubmit={saveProductionProcessLibraryEntry}
          className='min-w-0 space-y-4 rounded-xl border p-4'
          aria-label={t(
            draft.id
              ? 'productionArchitecture.processLibrary.edit'
              : 'productionArchitecture.processLibrary.create'
          )}
        >
          <h2 className='text-sm font-semibold'>
            {t(
              draft.id
                ? 'productionArchitecture.processLibrary.edit'
                : 'productionArchitecture.processLibrary.create'
            )}
          </h2>
          <fieldset disabled={isSaving} className='min-w-0 space-y-4'>
            <label className='grid min-w-0 gap-2 text-sm'>
              {t('productionArchitecture.processLibrary.code')}
              <Input
                value={draft.code}
                required
                maxLength={50}
                onChange={(event) =>
                  setDraft({ ...draft, code: event.target.value })
                }
              />
            </label>
            <label className='grid min-w-0 gap-2 text-sm'>
              {t('productionArchitecture.processLibrary.name')}
              <Input
                value={draft.name}
                required
                maxLength={255}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <label className='grid min-w-0 gap-2 text-sm'>
              {t('productionArchitecture.processLibrary.description')}
              <Textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </label>
            <label className='grid min-w-0 gap-2 text-sm'>
              {t('productionArchitecture.processLibrary.sortOrder')}
              <Input
                type='number'
                required
                min={0}
                max={1000000}
                step={1}
                value={draft.sortOrder}
                onChange={(event) =>
                  setDraft({ ...draft, sortOrder: event.target.value })
                }
              />
            </label>
            <label className='flex items-center justify-between gap-3 text-sm'>
              {t('productionArchitecture.processLibrary.active')}
              <Switch
                checked={draft.isActive}
                onCheckedChange={(isActive) => setDraft({ ...draft, isActive })}
              />
            </label>
            <div className='flex flex-wrap gap-2'>
              <Button type='submit'>
                {t(
                  isSaving
                    ? 'productionArchitecture.processLibrary.saving'
                    : 'productionArchitecture.processLibrary.save'
                )}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() =>
                  void cancelEditingProductionProcessLibraryEntry()
                }
              >
                {t('productionArchitecture.processLibrary.cancel')}
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      {saveError && (
        <p role='alert' className='text-sm wrap-anywhere text-destructive'>
          {saveError}
        </p>
      )}
    </div>
  )
}
