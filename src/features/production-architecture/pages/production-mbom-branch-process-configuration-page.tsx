import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  GitBranch,
  RotateCcw,
  Save,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import {
  getProductionBOMBranchDisplayName,
  getProductionBOMBranchIdentityKey,
} from '@/features/production-shared/data/production-bom-branch'
import { productionResourceQueryKeys } from '@/features/production-shared/data/production-resource-query-keys'
import type { ProductionRouteBOMBranch } from '@/features/production-shared/data/production-route'
import { useProductionProcessesQuery } from '@/features/production-shared/hooks/use-production-resources'
import { productionMBOMBranchProcessSelectionService } from '@/features/production-shared/services/production-mbom-branch-process-selection-service'
import { productionRoutesService } from '@/features/production-shared/services/production-routes-service'

const logger = createLogger('ProductionMBOMBranchProcessConfiguration')
const EMPTY_BRANCHES: ProductionRouteBOMBranch[] = []

function selectedProcessLibraryIds(branch?: ProductionRouteBOMBranch) {
  return (branch?.processes ?? []).map((process) => process.id)
}

function sameSelection(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  )
}

export function ProductionMBOMBranchProcessConfigurationPage() {
  const { t } = useLanguage()
  const { allowsPermission, isChecking } = usePermissionActions()
  const canRead = !isChecking && allowsPermission('menu_prod_config')
  const canManage = canRead && allowsPermission('perm_manage')
  const queryClient = useQueryClient()
  const [selectedBranchKey, setSelectedBranchKey] = useState('')
  const [branchSearch, setBranchSearch] = useState('')
  const [processSearch, setProcessSearch] = useState('')
  const [draftByBranchKey, setDraftByBranchKey] = useState<
    Record<string, string[]>
  >({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const submitInProgress = useRef(false)
  const branchQuery = useQuery({
    queryKey: productionResourceQueryKeys.routeBOMBranches(),
    queryFn: productionRoutesService.getBOMBranches,
    enabled: canRead,
  })
  const processQuery = useProductionProcessesQuery({ enabled: canRead })
  const branches = branchQuery.data ?? EMPTY_BRANCHES

  const orderedBranches = useMemo(
    () =>
      [...branches].sort((left, right) =>
        getProductionBOMBranchDisplayName(left).localeCompare(
          getProductionBOMBranchDisplayName(right),
          'zh-CN'
        )
      ),
    [branches]
  )
  const visibleBranches = orderedBranches.filter((branch) =>
    getProductionBOMBranchDisplayName(branch)
      .toLowerCase()
      .includes(branchSearch.trim().toLowerCase())
  )
  const processes = useMemo(
    () =>
      [...(processQuery.data ?? [])]
        .filter((process) => process.isActive !== false)
        .sort(
          (left, right) =>
            (left.sortOrder ?? 0) - (right.sortOrder ?? 0) ||
            left.name.localeCompare(right.name)
        ),
    [processQuery.data]
  )
  const visibleProcesses = processes.filter((process) =>
    `${process.code} ${process.name} ${process.description}`
      .toLowerCase()
      .includes(processSearch.trim().toLowerCase())
  )

  useEffect(() => {
    if (orderedBranches.length === 0) {
      setSelectedBranchKey('')
      return
    }
    if (
      !orderedBranches.some(
        (branch) =>
          getProductionBOMBranchIdentityKey(branch) === selectedBranchKey
      )
    ) {
      setSelectedBranchKey(
        getProductionBOMBranchIdentityKey(orderedBranches[0])
      )
    }
  }, [orderedBranches, selectedBranchKey])

  const selectedBranch = orderedBranches.find(
    (branch) => getProductionBOMBranchIdentityKey(branch) === selectedBranchKey
  )
  const persistedProcessIds = selectedProcessLibraryIds(selectedBranch)
  const selectedProcessIds = selectedBranchKey
    ? (draftByBranchKey[selectedBranchKey] ?? persistedProcessIds)
    : []
  const hasUnsavedChanges = !sameSelection(
    selectedProcessIds,
    persistedProcessIds
  )
  const selectedProcessSet = new Set(selectedProcessIds)
  const selectedProcesses = selectedProcessIds.flatMap((processId) => {
    const process = processes.find((candidate) => candidate.id === processId)
    return process ? [process] : []
  })

  async function saveSelection() {
    if (!selectedBranch || !canManage || submitInProgress.current) return
    submitInProgress.current = true
    setIsSaving(true)
    setSaveError('')
    try {
      const savedProcesses =
        await productionMBOMBranchProcessSelectionService.replace({
          productId: selectedBranch.productId,
          bomOwnerType: selectedBranch.bomOwnerType,
          bomOwnerCustomerId: selectedBranch.bomOwnerCustomerId,
          bomVersionLevel: selectedBranch.bomVersionLevel,
          processStepIds: selectedProcessIds,
        })
      queryClient.setQueryData<ProductionRouteBOMBranch[]>(
        productionResourceQueryKeys.routeBOMBranches(),
        (current) =>
          current?.map((branch) =>
            getProductionBOMBranchIdentityKey(branch) === selectedBranchKey
              ? { ...branch, processes: savedProcesses }
              : branch
          )
      )
      setDraftByBranchKey((current) => {
        const next = { ...current }
        delete next[selectedBranchKey]
        return next
      })
      await queryClient.invalidateQueries({
        queryKey: productionResourceQueryKeys.routeBOMBranches(),
      })
      toast.success(t('productionArchitecture.branchProcesses.saved'))
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('productionArchitecture.branchProcesses.saveFailed')
      setSaveError(message)
      logger.error('Failed to save MBOM branch process selection', error)
      toast.error(message)
    } finally {
      submitInProgress.current = false
      setIsSaving(false)
    }
  }

  function toggleProcess(processId: string) {
    setDraftByBranchKey((current) => {
      const selected = current[selectedBranchKey] ?? persistedProcessIds
      const nextSelection = selected.includes(processId)
        ? selected.filter((id) => id !== processId)
        : [...selected, processId]
      return { ...current, [selectedBranchKey]: nextSelection }
    })
    setSaveError('')
  }

  function moveSelectedProcess(processId: string, direction: -1 | 1) {
    setDraftByBranchKey((current) => {
      const selected = current[selectedBranchKey] ?? persistedProcessIds
      const index = selected.indexOf(processId)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= selected.length) {
        return current
      }

      const nextSelection = [...selected]
      const [movedProcessId] = nextSelection.splice(index, 1)
      nextSelection.splice(nextIndex, 0, movedProcessId)
      return { ...current, [selectedBranchKey]: nextSelection }
    })
    setSaveError('')
  }

  function discardSelectionChanges() {
    setDraftByBranchKey((current) => {
      const next = { ...current }
      delete next[selectedBranchKey]
      return next
    })
    setSaveError('')
  }

  if (isChecking) {
    return <Skeleton className='h-72 w-full' />
  }
  if (!canRead) {
    return <ForbiddenState />
  }
  if (
    isForbiddenError(branchQuery.error) ||
    isForbiddenError(processQuery.error)
  ) {
    return <ForbiddenState />
  }

  return (
    <div className='flex flex-col gap-6 pb-10'>
      <IndustrialHeader
        icon={GitBranch}
        title={t('productionArchitecture.branchProcesses.title')}
        description={t('productionArchitecture.branchProcesses.description')}
      />

      <div className='grid min-w-0 gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]'>
        <section className='min-w-0 border-t border-border pt-4'>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <h2 className='text-sm font-semibold'>
              {t('productionArchitecture.branchProcesses.branchList')}
            </h2>
            <span className='text-xs text-muted-foreground'>
              {orderedBranches.length}
            </span>
          </div>
          <label className='relative mb-3 block'>
            <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={branchSearch}
              onChange={(event) => setBranchSearch(event.target.value)}
              placeholder={t(
                'productionArchitecture.branchProcesses.searchBranches'
              )}
              className='h-10 pl-9'
              aria-label={t(
                'productionArchitecture.branchProcesses.searchBranches'
              )}
            />
          </label>
          {branchQuery.isLoading ? (
            <div className='space-y-2'>
              <Skeleton className='h-14 w-full' />
              <Skeleton className='h-14 w-full' />
              <Skeleton className='h-14 w-full' />
            </div>
          ) : branchQuery.error ? (
            <div className='space-y-3 text-sm text-destructive' role='alert'>
              <p>{branchQuery.error.message}</p>
              <Button
                type='button'
                variant='outline'
                onClick={() => void branchQuery.refetch()}
              >
                {t('productionArchitecture.branchProcesses.retryBranches')}
              </Button>
            </div>
          ) : orderedBranches.length === 0 ? (
            <p className='py-6 text-sm text-muted-foreground'>
              {t('productionArchitecture.branchProcesses.noBranches')}
            </p>
          ) : visibleBranches.length === 0 ? (
            <p className='py-6 text-sm text-muted-foreground'>
              {t('productionArchitecture.branchProcesses.noBranchMatches')}
            </p>
          ) : (
            <div className='max-h-[60vh] space-y-1 overflow-y-auto pr-1'>
              {visibleBranches.map((branch) => {
                const identityKey = getProductionBOMBranchIdentityKey(branch)
                const isSelected = identityKey === selectedBranchKey
                return (
                  <button
                    key={identityKey}
                    type='button'
                    aria-pressed={isSelected}
                    disabled={isSaving}
                    onClick={() => setSelectedBranchKey(identityKey)}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-transparent hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <span className='min-w-0'>
                      <span className='block truncate text-sm font-medium'>
                        {getProductionBOMBranchDisplayName(branch)}
                      </span>
                    </span>
                    <span className='shrink-0 text-xs text-muted-foreground'>
                      {selectedProcessLibraryIds(branch).length}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className='min-w-0 border-t border-border pt-4'>
          {selectedBranch ? (
            <>
              <div className='mb-3 flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <h2 className='text-sm font-semibold'>
                    {t(
                      'productionArchitecture.branchProcesses.allowedProcesses'
                    )}
                  </h2>
                  <p className='mt-1 text-xs break-words text-muted-foreground'>
                    {getProductionBOMBranchDisplayName(selectedBranch)}
                  </p>
                </div>
                <span className='text-xs text-muted-foreground'>
                  {t('productionArchitecture.branchProcesses.selectedCount', {
                    count: selectedProcessIds.length,
                  })}
                </span>
              </div>
              <section
                className='mb-4 space-y-2'
                aria-label={t(
                  'productionArchitecture.branchProcesses.defaultOrder'
                )}
              >
                <h3 className='text-xs font-medium text-muted-foreground'>
                  {t('productionArchitecture.branchProcesses.defaultOrder')}
                </h3>
                {selectedProcesses.length === 0 ? (
                  <p className='rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground'>
                    {t(
                      'productionArchitecture.branchProcesses.noSelectedProcesses'
                    )}
                  </p>
                ) : (
                  <ol className='space-y-1'>
                    {selectedProcesses.map((process, index) => (
                      <li
                        key={process.id}
                        className='flex min-h-10 items-center gap-2 rounded-md border border-border px-2 py-1'
                      >
                        <span className='w-6 shrink-0 text-center text-xs text-muted-foreground'>
                          {index + 1}
                        </span>
                        <span className='min-w-0 flex-1 truncate text-sm'>
                          {process.name}
                        </span>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='size-8 rounded-full'
                          aria-label={`${t('productionArchitecture.branchProcesses.moveUp')} ${process.name}`}
                          title={t(
                            'productionArchitecture.branchProcesses.moveUp'
                          )}
                          disabled={!canManage || isSaving || index === 0}
                          onClick={() => moveSelectedProcess(process.id, -1)}
                        >
                          <ArrowUp aria-hidden='true' className='size-4' />
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='size-8 rounded-full'
                          aria-label={`${t('productionArchitecture.branchProcesses.moveDown')} ${process.name}`}
                          title={t(
                            'productionArchitecture.branchProcesses.moveDown'
                          )}
                          disabled={
                            !canManage ||
                            isSaving ||
                            index === selectedProcesses.length - 1
                          }
                          onClick={() => moveSelectedProcess(process.id, 1)}
                        >
                          <ArrowDown aria-hidden='true' className='size-4' />
                        </Button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              <label className='relative mb-3 block'>
                <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  value={processSearch}
                  onChange={(event) => setProcessSearch(event.target.value)}
                  placeholder={t(
                    'productionArchitecture.branchProcesses.searchProcesses'
                  )}
                  className='h-10 pl-9'
                  aria-label={t(
                    'productionArchitecture.branchProcesses.searchProcesses'
                  )}
                />
              </label>

              {processQuery.isLoading ? (
                <div className='space-y-2'>
                  <Skeleton className='h-14 w-full' />
                  <Skeleton className='h-14 w-full' />
                </div>
              ) : processQuery.error ? (
                <div
                  className='space-y-3 text-sm text-destructive'
                  role='alert'
                >
                  <p>{processQuery.error.message}</p>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => void processQuery.refetch()}
                  >
                    {t('productionArchitecture.branchProcesses.retryProcesses')}
                  </Button>
                </div>
              ) : processes.length === 0 ? (
                <p className='py-6 text-sm text-muted-foreground'>
                  {t('productionArchitecture.branchProcesses.noProcesses')}
                </p>
              ) : visibleProcesses.length === 0 ? (
                <p className='py-6 text-sm text-muted-foreground'>
                  {t('productionArchitecture.branchProcesses.noProcessMatches')}
                </p>
              ) : (
                <div className='grid gap-2 sm:grid-cols-2'>
                  {visibleProcesses.map((process) => (
                    <label
                      key={process.id}
                      className='flex min-w-0 cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-3'
                    >
                      <input
                        type='checkbox'
                        checked={selectedProcessSet.has(process.id)}
                        disabled={!canManage || isSaving}
                        onChange={() => toggleProcess(process.id)}
                        className='mt-1 size-4 shrink-0 accent-primary'
                      />
                      <span className='min-w-0 flex-1'>
                        <span className='block truncate text-sm font-medium'>
                          {process.name}
                        </span>
                        <span className='block text-xs break-words text-muted-foreground'>
                          {[process.code, process.description]
                            .filter(Boolean)
                            .join(' · ') ||
                            t(
                              'productionArchitecture.branchProcesses.noDescription'
                            )}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {saveError ? (
                <p className='mt-3 text-sm text-destructive' role='alert'>
                  {saveError}
                </p>
              ) : null}
              <div className='mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  className='rounded-full'
                  disabled={!hasUnsavedChanges || isSaving}
                  onClick={discardSelectionChanges}
                >
                  <RotateCcw aria-hidden='true' />
                  {t('productionArchitecture.branchProcesses.discard')}
                </Button>
                <Button
                  type='button'
                  className='rounded-full'
                  disabled={!canManage || !hasUnsavedChanges || isSaving}
                  onClick={() => void saveSelection()}
                >
                  <Save aria-hidden='true' />
                  {isSaving
                    ? t('productionArchitecture.branchProcesses.saving')
                    : t('productionArchitecture.branchProcesses.save')}
                </Button>
              </div>
            </>
          ) : (
            <p className='py-6 text-sm text-muted-foreground'>
              {branchQuery.isLoading
                ? t('productionArchitecture.branchProcesses.loadingBranches')
                : t('productionArchitecture.branchProcesses.selectBranch')}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
