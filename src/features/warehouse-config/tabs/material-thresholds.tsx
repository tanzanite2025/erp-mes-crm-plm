'use client'

import { useMemo, useState } from 'react'
import {
  Boxes,
  Database,
  Edit2,
  Layers3,
  Loader2,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { failLoudly } from '@/lib/safe-catch'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ForbiddenState } from '@/components/forbidden-state'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { MaterialThresholdDialog } from '@/features/warehouse/material-thresholds/components/material-threshold-dialog'
import { useMaterialThresholds } from '@/features/warehouse/material-thresholds/hooks/use-material-thresholds'
import { type InventoryThresholdRule } from '@/features/warehouse/material-thresholds/data/schema'

type RuleFilter = 'ALL' | 'MATERIAL' | 'BOM'
type StatusFilter = 'ALL' | 'ENABLED' | 'DISABLED'

export default function MaterialThresholdsTab() {
  const { allowsAction } = useNonBlockingPermissionActions()
  const { t } = useLanguage()
  const {
    readResource,
    rules,
    targetOptions,
    error,
    refetch,
    createRule,
    updateRule,
    deleteRule,
    isActionLoading,
  } = useMaterialThresholds()

  const [searchTerm, setSearchTerm] = useState('')
  const [ruleFilter, setRuleFilter] = useState<RuleFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<InventoryThresholdRule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryThresholdRule | null>(null)

  const canManage = allowsAction('action_warehouse_category_manage')

  const filteredRules = useMemo(
    () =>
      rules.filter((rule) => {
        const normalizedSearch = searchTerm.trim().toLowerCase()
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [rule.targetNameSnapshot, rule.targetCodeSnapshot, rule.notes]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch)

        const matchesType = ruleFilter === 'ALL' || rule.targetType === ruleFilter
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'ENABLED' ? rule.enabled : !rule.enabled)

        return matchesSearch && matchesType && matchesStatus
      }),
    [rules, ruleFilter, searchTerm, statusFilter]
  )

  const summary = useMemo(
    () => ({
      total: rules.length,
      enabled: rules.filter((rule) => rule.enabled).length,
      material: rules.filter((rule) => rule.targetType === 'MATERIAL').length,
      bom: rules.filter((rule) => rule.targetType === 'BOM').length,
    }),
    [rules]
  )

  const filterOptions: Array<{ value: RuleFilter; label: string }> = [
    { value: 'ALL', label: t('warehouseConfig.materialThresholds.filters.allTargets') },
    { value: 'MATERIAL', label: t('warehouseConfig.materialThresholds.filters.materialOnly') },
    { value: 'BOM', label: t('warehouseConfig.materialThresholds.filters.bomOnly') },
  ]

  const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: 'ALL', label: t('warehouseConfig.materialThresholds.filters.allStatus') },
    { value: 'ENABLED', label: t('warehouseConfig.materialThresholds.filters.enabledOnly') },
    { value: 'DISABLED', label: t('warehouseConfig.materialThresholds.filters.disabledOnly') },
  ]

  const openCreateDialog = () => {
    if (!canManage) {
      return
    }
    setEditingRule(null)
    setDialogOpen(true)
  }

  const openEditDialog = (rule: InventoryThresholdRule) => {
    if (!canManage) {
      return
    }
    setEditingRule(rule)
    setDialogOpen(true)
  }

  const handleDialogSubmit = async (payload: {
    targetType: 'MATERIAL' | 'BOM'
    materialId?: string
    bomId?: string
    thresholdQty: number
    enabled: boolean
    notes: string
  }) => {
    try {
      if (editingRule) {
        await updateRule({ id: editingRule.id, payload })
      } else {
        await createRule(payload)
      }
      setDialogOpen(false)
      setEditingRule(null)
    } catch (error) {
      failLoudly(error, 'MaterialThresholdsTab.handleDialogSubmit')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }
    try {
      await deleteRule(deleteTarget.id)
      setDeleteTarget(null)
    } catch (error) {
      failLoudly(error, 'MaterialThresholdsTab.handleDelete')
    }
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (readResource.status === 'error') {
    return (
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/[0.03] px-6 text-center'>
          <p className='text-[10px] font-black tracking-widest text-rose-700 uppercase'>
            {t('warehouseConfig.materialThresholds.errorTitle')}
          </p>
          <p className='mt-3 max-w-2xl text-[11px] font-bold leading-5 text-rose-700/80'>
            {readResource.error.message}
          </p>
          <Button
            type='button'
            variant='outline'
            className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
            onClick={() => {
              void refetch()
            }}
          >
            {t('warehouseConfig.materialThresholds.actions.retry')}
          </Button>
        </div>
      </div>
    )
  }

  if (readResource.status === 'loading') {
    return (
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-6 text-center'>
          <Loader2 className='size-8 animate-spin text-primary/40' />
          <p className='mt-4 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            {t('warehouseConfig.materialThresholds.loadingTitle')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        <div className='relative overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-8'>
          <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
          <div className='relative z-10 flex items-center gap-3 text-primary'>
            <TriangleAlert className='size-5' />
            <h1 className='text-lg font-black tracking-tighter uppercase italic'>
              {t('warehouseConfig.materialThresholds.title')}
            </h1>
          </div>
          <p className='relative z-10 mt-1 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            {t('warehouseConfig.materialThresholds.subtitle')}
          </p>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {[
            {
              key: 'total',
              label: t('warehouseConfig.materialThresholds.summary.total'),
              value: summary.total,
              accent: 'text-primary bg-primary/10',
              icon: Database,
            },
            {
              key: 'enabled',
              label: t('warehouseConfig.materialThresholds.summary.enabled'),
              value: summary.enabled,
              accent: 'text-emerald-600 bg-emerald-500/10',
              icon: TriangleAlert,
            },
            {
              key: 'material',
              label: t('warehouseConfig.materialThresholds.summary.material'),
              value: summary.material,
              accent: 'text-amber-600 bg-amber-500/10',
              icon: Layers3,
            },
            {
              key: 'bom',
              label: t('warehouseConfig.materialThresholds.summary.bom'),
              value: summary.bom,
              accent: 'text-blue-600 bg-blue-500/10',
              icon: Boxes,
            },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.key}
                className='rounded-[24px] border border-dashed border-muted/50 bg-background p-5'
              >
                <div className='flex items-center justify-between gap-4'>
                  <div>
                    <div className='text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                      {item.label}
                    </div>
                    <div className='mt-2 text-2xl font-black tracking-tighter'>{item.value}</div>
                  </div>
                  <div className={cn('flex size-11 items-center justify-center rounded-2xl', item.accent)}>
                    <Icon className='size-5' />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
          <div className='flex flex-1 flex-col gap-4 lg:flex-row lg:items-center'>
            <div className='relative w-full lg:max-w-sm'>
              <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('warehouseConfig.materialThresholds.searchPlaceholder')}
                className='h-12 rounded-2xl border-none bg-muted/50 pl-10 text-sm font-medium focus-visible:ring-primary/20'
              />
            </div>
            <div className='flex flex-wrap gap-2'>
              {filterOptions.map((item) => (
                <Button
                  key={item.value}
                  type='button'
                  variant='ghost'
                  className={cn(
                    'h-10 rounded-full px-4 text-[10px] font-black tracking-widest uppercase',
                    ruleFilter === item.value
                      ? 'bg-primary/10 text-primary hover:bg-primary/15'
                      : 'bg-muted/40 text-muted-foreground/70 hover:bg-muted/70'
                  )}
                  onClick={() => setRuleFilter(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2'>
            {statusOptions.map((item) => (
              <Button
                key={item.value}
                type='button'
                variant='ghost'
                className={cn(
                  'h-10 rounded-full px-4 text-[10px] font-black tracking-widest uppercase',
                  statusFilter === item.value
                    ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15'
                    : 'bg-muted/40 text-muted-foreground/70 hover:bg-muted/70'
                )}
                onClick={() => setStatusFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
            <Button
              type='button'
              disabled={!canManage}
              onClick={openCreateDialog}
              className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            >
              <Plus className='mr-2 size-4' />
              {t('warehouseConfig.materialThresholds.actions.add')}
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
          {filteredRules.length > 0 ? (
            filteredRules.map((rule) => {
              const isBomRule = rule.targetType === 'BOM'
              const thresholdLabel = isBomRule
                ? t('warehouseConfig.materialThresholds.card.thresholdBom')
                : t('warehouseConfig.materialThresholds.card.thresholdMaterial')
              const thresholdHint = isBomRule
                ? t('warehouseConfig.materialThresholds.card.thresholdBomHint')
                : t('warehouseConfig.materialThresholds.card.thresholdMaterialHint')

              return (
                <div
                  key={rule.id}
                  className='rounded-[24px] border border-dashed border-muted/60 bg-background p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5'
                >
                <div className='flex items-start justify-between gap-4'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h2 className='truncate text-sm font-black tracking-tighter uppercase italic md:text-base'>
                        {rule.targetNameSnapshot}
                      </h2>
                      <Badge
                        className={cn(
                          'h-5 rounded-full border-none px-2 text-[8px] font-black tracking-widest uppercase',
                          rule.enabled
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-muted text-muted-foreground/60'
                        )}
                      >
                        {rule.enabled
                          ? t('warehouseConfig.materialThresholds.card.enabled')
                          : t('warehouseConfig.materialThresholds.card.disabled')}
                      </Badge>
                      <Badge
                        className={cn(
                          'h-5 rounded-full border-none px-2 text-[8px] font-black tracking-widest uppercase',
                          rule.targetType === 'MATERIAL'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-blue-500/10 text-blue-600'
                        )}
                      >
                        {rule.targetType === 'MATERIAL'
                          ? t('warehouseConfig.materialThresholds.card.material')
                          : t('warehouseConfig.materialThresholds.card.bom')}
                      </Badge>
                    </div>
                    <div className='mt-2 text-[8px] font-mono text-muted-foreground/60'>
                      {t('warehouseConfig.materialThresholds.card.code')}: {rule.targetCodeSnapshot || '--'}
                    </div>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      disabled={!canManage}
                      className='size-9 rounded-xl text-muted-foreground/60 hover:bg-primary/10 hover:text-primary'
                      onClick={() => openEditDialog(rule)}
                    >
                      <Edit2 className='size-4' />
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      disabled={!canManage}
                      className='size-9 rounded-xl text-muted-foreground/60 hover:bg-rose-500/10 hover:text-rose-600'
                      onClick={() => setDeleteTarget(rule)}
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  </div>
                </div>

                <div className='mt-5 grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='rounded-2xl bg-muted/30 px-4 py-3'>
                    <div className='text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                      {thresholdLabel}
                    </div>
                    <div className='mt-2 text-xl font-black tracking-tighter'>
                      {rule.thresholdQty}
                      {isBomRule ? (
                        <span className='ml-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                          {t('warehouseConfig.materialThresholds.card.thresholdBomUnit')}
                        </span>
                      ) : null}
                    </div>
                    <div className='mt-2 text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                      {thresholdHint}
                    </div>
                  </div>
                  <div className='rounded-2xl bg-muted/30 px-4 py-3'>
                    <div className='text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                      {t('warehouseConfig.materialThresholds.card.updatedAt')}
                    </div>
                    <div className='mt-2 text-[11px] font-mono text-muted-foreground/80'>
                      {new Date(rule.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className='mt-4 rounded-2xl border border-dashed border-muted/60 bg-muted/10 px-4 py-3'>
                  <div className='text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('warehouseConfig.materialThresholds.card.notes')}
                  </div>
                  <p className='mt-2 text-[11px] leading-5 text-muted-foreground'>
                    {rule.notes || t('warehouseConfig.materialThresholds.card.notesEmpty')}
                  </p>
                </div>
                </div>
              )
            })
          ) : (
            <div className='col-span-full flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-6 text-center'>
              <div className='relative mb-6'>
                <Database className='size-20 opacity-5' />
              </div>
              <p className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                {t('warehouseConfig.materialThresholds.emptyTitle')}
              </p>
              <p className='mt-3 max-w-xl text-[11px] font-bold leading-5 text-muted-foreground/70'>
                {t('warehouseConfig.materialThresholds.emptyDescription')}
              </p>
            </div>
          )}
        </div>
      </div>

      <MaterialThresholdDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingRule(null)
          }
        }}
        rule={editingRule}
        materialOptions={targetOptions.materials}
        bomOptions={targetOptions.boms}
        isSubmitting={isActionLoading}
        onSubmit={handleDialogSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        title={t('warehouseConfig.materialThresholds.deleteConfirmTitle')}
        desc={deleteTarget?.targetNameSnapshot || ''}
        destructive
        handleConfirm={handleDelete}
        isLoading={isActionLoading}
      />
    </>
  )
}
