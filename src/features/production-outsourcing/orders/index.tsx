import { useState } from 'react'
import type { TranslationKey } from '@/locales'
import {
  ClipboardList,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  industrialPanelClassName,
  industrialPanelGradientClassName,
} from '@/components/uds/industrial-panel'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { OutsourceStatCard } from '../components/outsource-stat-card'
import {
  outsourceOrderSourceTypes,
  type OutsourceOrder,
  type OutsourceOrderFormValues,
  type OutsourceOrderSourceType,
  type OutsourceOrderStatus,
} from '../data/outsource-order'
import {
  useOutsourceOrderMutations,
  useOutsourceOrders,
} from '../hooks/use-outsource-orders'
import { useOutsourcePartners } from '../hooks/use-outsource-partners'
import { OutsourceOrderDialog } from './outsource-order-dialog'

function statusTone(status: OutsourceOrderStatus) {
  if (status === 'CLOSED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
  }
  if (status === 'CANCELED') {
    return 'border-rose-500/30 bg-rose-500/10 text-rose-600'
  }
  if (status === 'RETURNED') {
    return 'border-violet-500/30 bg-violet-500/10 text-violet-600'
  }
  if (status === 'SENT' || status === 'IN_PROCESS') {
    return 'border-blue-500/30 bg-blue-500/10 text-blue-600'
  }
  if (status === 'RELEASED') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-600'
  }
  return 'border-muted bg-muted text-muted-foreground'
}

function sourceTone(sourceType: OutsourceOrderSourceType) {
  if (sourceType === 'SALES_ORDER') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-600'
  }
  if (sourceType === 'PRODUCTION_PLAN') {
    return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600'
  }
  return 'border-muted bg-muted text-muted-foreground'
}

function sourceLabelKey(sourceType: OutsourceOrderSourceType): TranslationKey {
  return `productionOutsourcing.orders.sourceTypes.${sourceType}` as TranslationKey
}

function statusLabelKey(status: OutsourceOrderStatus): TranslationKey {
  return `productionOutsourcing.orders.statuses.${status}` as TranslationKey
}

export function OutsourceOrderManagement() {
  const { t } = useLanguage()
  const { allowsAction, isChecking } = usePermissionActions()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OutsourceOrderStatus | 'ALL'>('ALL')
  const [sourceType, setSourceType] = useState<
    OutsourceOrderSourceType | 'ALL'
  >('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OutsourceOrder | null>(null)
  const canManage = allowsAction('action_outsource_order_manage')
  const ordersQuery = useOutsourceOrders({ search, status, sourceType })
  const partnersQuery = useOutsourcePartners()
  const {
    createMutation,
    updateMutation,
    releaseMutation,
    cancelMutation,
    deleteMutation,
  } = useOutsourceOrderMutations()
  const orders = ordersQuery.data?.items ?? []
  const stats = ordersQuery.data?.metadata
  const partners = partnersQuery.data?.items ?? []
  const isSaving = createMutation.isPending || updateMutation.isPending

  const openCreate = () => {
    setEditingOrder(null)
    setDialogOpen(true)
  }

  const openEdit = (order: OutsourceOrder) => {
    setEditingOrder(order)
    setDialogOpen(true)
  }

  const handleSubmit = (values: OutsourceOrderFormValues) => {
    if (!canManage) {
      return
    }
    if (editingOrder) {
      updateMutation.mutate(
        { order: editingOrder, values },
        { onSuccess: () => setDialogOpen(false) }
      )
      return
    }
    createMutation.mutate(values, { onSuccess: () => setDialogOpen(false) })
  }

  const handleDelete = (order: OutsourceOrder) => {
    if (!canManage) {
      return
    }
    if (
      window.confirm(
        t('productionOutsourcing.orders.deleteConfirm', {
          orderNo: order.orderNo,
        })
      )
    ) {
      deleteMutation.mutate(order.id)
    }
  }

  const handleRelease = (order: OutsourceOrder) => {
    if (!canManage) {
      return
    }
    releaseMutation.mutate(order)
  }

  const handleCancel = (order: OutsourceOrder) => {
    if (!canManage) {
      return
    }
    if (
      window.confirm(
        t('productionOutsourcing.orders.cancelConfirm', {
          orderNo: order.orderNo,
        })
      )
    ) {
      cancelMutation.mutate(order)
    }
  }

  if (isForbiddenError(ordersQuery.error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-4 pb-8 duration-500 fade-in'>
      <IndustrialHeader
        icon={ClipboardList}
        title={t('productionOutsourcing.orders.title')}
        description={t('productionOutsourcing.orders.description')}
      />

      <div className='grid gap-3 md:grid-cols-5'>
        <OutsourceStatCard
          label={t('productionOutsourcing.orders.stats.total')}
          value={stats?.total ?? '—'}
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.orders.stats.released')}
          value={stats?.released ?? '—'}
          className='bg-amber-500/5'
          labelClassName='text-amber-600'
          valueClassName='text-amber-600'
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.orders.stats.active')}
          value={stats?.active ?? '—'}
          className='bg-blue-500/5'
          labelClassName='text-blue-600'
          valueClassName='text-blue-600'
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.orders.stats.returned')}
          value={stats?.returned ?? '—'}
          className='bg-violet-500/5'
          labelClassName='text-violet-600'
          valueClassName='text-violet-600'
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.orders.stats.closed')}
          value={stats?.closed ?? '—'}
          className='bg-emerald-500/5'
          labelClassName='text-emerald-600'
          valueClassName='text-emerald-600'
        />
      </div>

      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div className='flex flex-1 flex-col gap-3 md:flex-row md:items-center'>
          <div className='relative w-full md:max-w-sm'>
            <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/50' />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('productionOutsourcing.orders.searchPlaceholder')}
              className='pl-10'
            />
          </div>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as OutsourceOrderStatus | 'ALL')
            }
            className='h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:w-44 md:text-sm dark:bg-input/30'
          >
            <option value='ALL'>
              {t('productionOutsourcing.orders.filters.allStatus')}
            </option>
            {[
              'DRAFT',
              'RELEASED',
              'SENT',
              'IN_PROCESS',
              'RETURNED',
              'CLOSED',
              'CANCELED',
            ].map((item) => (
              <option key={item} value={item}>
                {t(statusLabelKey(item as OutsourceOrderStatus))}
              </option>
            ))}
          </select>
          <select
            value={sourceType}
            onChange={(event) =>
              setSourceType(
                event.target.value as OutsourceOrderSourceType | 'ALL'
              )
            }
            className='h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:w-44 md:text-sm dark:bg-input/30'
          >
            <option value='ALL'>
              {t('productionOutsourcing.orders.filters.allSource')}
            </option>
            {outsourceOrderSourceTypes.map((item) => (
              <option key={item} value={item}>
                {t(sourceLabelKey(item))}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={openCreate}
          disabled={!canManage || isChecking}
          title={
            canManage
              ? undefined
              : t('productionOutsourcing.orders.noManagePermission')
          }
          className='h-9 w-full rounded-full px-4 text-xs font-medium md:w-auto'
        >
          <Plus className='size-4' />
          {t('productionOutsourcing.orders.actions.add')}
        </Button>
      </div>

      {ordersQuery.isLoading ? (
        <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-3'>
          {[1, 2, 3].map((item) => (
            <Skeleton
              key={item}
              className={cn(industrialPanelClassName, 'h-52')}
            />
          ))}
        </div>
      ) : ordersQuery.isError ? (
        <Card
          className={cn(
            industrialPanelClassName,
            'border-rose-300/60 bg-rose-50/70 dark:bg-rose-950/20'
          )}
        >
          <div className={industrialPanelGradientClassName} />
          <CardContent className='relative z-10 flex flex-col items-center gap-3 py-12 text-center'>
            <ClipboardList className='size-10 text-rose-400/50' />
            <p className='text-sm font-medium text-rose-600'>
              {t('productionOutsourcing.orders.loadingFailed')}
            </p>
            <Button
              variant='outline'
              className='h-9 rounded-full px-4 text-xs font-medium'
              onClick={() => void ordersQuery.refetch()}
            >
              {t('common.actions.retry')}
            </Button>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card className={industrialPanelClassName}>
          <div className={industrialPanelGradientClassName} />
          <CardContent className='relative z-10 flex flex-col items-center gap-3 py-14 text-center'>
            <ClipboardList className='size-10 text-muted-foreground/30' />
            <p className='text-sm text-muted-foreground'>
              {t('productionOutsourcing.orders.empty')}
            </p>
            <Button
              onClick={openCreate}
              disabled={!canManage || isChecking}
              variant='outline'
              className='h-9 rounded-full px-4 text-xs font-medium'
            >
              {t('productionOutsourcing.orders.actions.add')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-3'>
          {orders.map((order) => (
            <Card
              key={order.id}
              className={cn(
                industrialPanelClassName,
                'transition-colors hover:bg-muted/10'
              )}
            >
              <div className={industrialPanelGradientClassName} />
              <CardHeader className='relative z-10 space-y-3 border-b border-dashed border-muted/20 bg-background/20 p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <CardTitle className='truncate text-base font-semibold tracking-tight'>
                      {order.orderNo}
                    </CardTitle>
                    <p className='mt-1 truncate text-xs text-muted-foreground'>
                      {order.partnerNameSnapshot ||
                        t('productionOutsourcing.orders.partnerUnknown')}
                    </p>
                  </div>
                  <Badge
                    variant='outline'
                    className={`text-xs font-medium ${statusTone(order.status)}`}
                  >
                    {t(statusLabelKey(order.status))}
                  </Badge>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Badge
                    variant='outline'
                    className={`text-xs font-medium ${sourceTone(order.sourceType)}`}
                  >
                    {t(sourceLabelKey(order.sourceType))}
                  </Badge>
                  {order.sourceNo ? (
                    <Badge variant='outline' className='text-xs font-medium'>
                      {order.sourceNo}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className='relative z-10 space-y-4 p-4'>
                <div className='grid grid-cols-2 gap-3 text-xs'>
                  <div className='rounded-xl bg-muted/30 p-3'>
                    <p className='text-xs font-medium text-muted-foreground'>
                      {t('productionOutsourcing.orders.fields.totalQuantity')}
                    </p>
                    <p className='mt-1 text-lg font-semibold tabular-nums'>
                      {order.totalQuantity} {order.uom}
                    </p>
                  </div>
                  <div className='rounded-xl bg-muted/30 p-3'>
                    <p className='text-xs font-medium text-muted-foreground'>
                      {t(
                        'productionOutsourcing.orders.fields.plannedReturnDate'
                      )}
                    </p>
                    <p className='mt-1 text-sm font-semibold'>
                      {order.plannedReturnDate || '-'}
                    </p>
                  </div>
                </div>

                <div className='space-y-2 rounded-md bg-muted/30 p-3'>
                  {(order.lines.length > 0 ? order.lines.slice(0, 2) : []).map(
                    (line) => (
                      <div key={line.id} className='grid gap-1 text-sm'>
                        <div className='flex items-center justify-between gap-3'>
                          <span className='min-w-0 truncate font-medium'>
                            {line.productName || line.productCode || '-'}
                          </span>
                          <span className='shrink-0 text-xs text-muted-foreground'>
                            {line.quantity} {line.uom}
                          </span>
                        </div>
                        {line.processName ? (
                          <span className='truncate text-xs text-muted-foreground'>
                            {t(
                              'productionOutsourcing.orders.fields.processName'
                            )}
                            ：
                            {line.processCode
                              ? `${line.processCode} · ${line.processName}`
                              : line.processName}
                          </span>
                        ) : null}
                      </div>
                    )
                  )}
                  {order.lines.length > 2 ? (
                    <p className='text-xs text-muted-foreground'>
                      {t('productionOutsourcing.orders.moreLines', {
                        count: order.lines.length - 2,
                      })}
                    </p>
                  ) : null}
                  {order.lines.length === 0 ? (
                    <p className='text-xs text-muted-foreground'>
                      {t('productionOutsourcing.orders.noLines')}
                    </p>
                  ) : null}
                </div>

                <div className='flex flex-wrap justify-end gap-2 border-t pt-3'>
                  <AuditTimelineTriggerButton
                    module={AUDIT_MODULES.outsourceOrder}
                    targetId={order.id}
                    targetName={order.orderNo}
                    label={t('common.audit.trigger')}
                    className='rounded-full border-solid text-xs font-medium tracking-normal normal-case'
                  />
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={
                      !canManage || isChecking || order.status !== 'DRAFT'
                    }
                    title={
                      !canManage
                        ? t('productionOutsourcing.orders.noManagePermission')
                        : order.status !== 'DRAFT'
                          ? t('productionOutsourcing.orders.draftOnlyAction')
                          : undefined
                    }
                    onClick={() => openEdit(order)}
                    className='rounded-full'
                  >
                    <Pencil className='mr-2 size-3.5' />
                    {t('common.actions.edit')}
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={
                      !canManage ||
                      isChecking ||
                      releaseMutation.isPending ||
                      order.status !== 'DRAFT'
                    }
                    title={
                      !canManage
                        ? t('productionOutsourcing.orders.noManagePermission')
                        : order.status !== 'DRAFT'
                          ? t('productionOutsourcing.orders.draftOnlyAction')
                          : undefined
                    }
                    onClick={() => handleRelease(order)}
                    className='rounded-full'
                  >
                    {releaseMutation.isPending ? (
                      <Loader2 className='mr-2 size-3.5 animate-spin' />
                    ) : (
                      <PlayCircle className='mr-2 size-3.5' />
                    )}
                    {t('productionOutsourcing.orders.actions.release')}
                  </Button>
                  {order.status === 'RELEASED' ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      disabled={
                        !canManage || isChecking || cancelMutation.isPending
                      }
                      title={
                        canManage
                          ? undefined
                          : t('productionOutsourcing.orders.noManagePermission')
                      }
                      onClick={() => handleCancel(order)}
                      className='rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive'
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className='mr-2 size-3.5 animate-spin' />
                      ) : (
                        <XCircle className='mr-2 size-3.5' />
                      )}
                      {t('productionOutsourcing.orders.actions.cancel')}
                    </Button>
                  ) : null}
                  <Button
                    variant='ghost'
                    size='sm'
                    disabled={
                      !canManage ||
                      isChecking ||
                      deleteMutation.isPending ||
                      order.status !== 'DRAFT'
                    }
                    title={
                      !canManage
                        ? t('productionOutsourcing.orders.noManagePermission')
                        : order.status !== 'DRAFT'
                          ? t('productionOutsourcing.orders.draftOnlyAction')
                          : undefined
                    }
                    onClick={() => handleDelete(order)}
                    className='rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive'
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className='mr-2 size-3.5 animate-spin' />
                    ) : (
                      <Trash2 className='mr-2 size-3.5' />
                    )}
                    {t('common.actions.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OutsourceOrderDialog
        open={dialogOpen}
        order={editingOrder}
        partners={partners}
        isSaving={isSaving}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
