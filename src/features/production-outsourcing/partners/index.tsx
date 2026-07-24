import { useState } from 'react'
import {
  Building2,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { ForbiddenState } from '@/components/forbidden-state'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { useGetSuppliers } from '@/features/purchase/suppliers'
import type {
  OutsourcePartner,
  OutsourcePartnerFormValues,
  OutsourcePartnerStatus,
} from '../data/outsource-partner'
import {
  useOutsourcePartnerMutations,
  useOutsourcePartners,
} from '../hooks/use-outsource-partners'
import { OutsourcePartnerDialog } from './outsource-partner-dialog'

function statusTone(status: OutsourcePartnerStatus) {
  if (status === 'ACTIVE') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
  }
  if (status === 'ON_REVIEW') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-600'
  }
  return 'border-muted bg-muted text-muted-foreground'
}

export function OutsourcePartnerManagement() {
  const { t } = useLanguage()
  const { allowsAction, isChecking } = usePermissionActions()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OutsourcePartnerStatus | 'ALL'>('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<OutsourcePartner | null>(
    null
  )
  const canManage = allowsAction('action_outsource_partner_manage')
  const partnersQuery = useOutsourcePartners({ search, status })
  const suppliersQuery = useGetSuppliers()
  const { createMutation, updateMutation, deleteMutation } =
    useOutsourcePartnerMutations()
  const partners = partnersQuery.data?.items ?? []
  const stats = partnersQuery.data?.metadata
  const isSaving = createMutation.isPending || updateMutation.isPending

  const openCreate = () => {
    setEditingPartner(null)
    setDialogOpen(true)
  }

  const openEdit = (partner: OutsourcePartner) => {
    setEditingPartner(partner)
    setDialogOpen(true)
  }

  const handleSubmit = (values: OutsourcePartnerFormValues) => {
    if (!canManage) {
      return
    }
    if (editingPartner) {
      updateMutation.mutate(
        { partner: editingPartner, values },
        { onSuccess: () => setDialogOpen(false) }
      )
      return
    }
    createMutation.mutate(values, { onSuccess: () => setDialogOpen(false) })
  }

  const handleDelete = (partner: OutsourcePartner) => {
    if (!canManage) {
      return
    }
    if (
      window.confirm(
        t('productionOutsourcing.partners.deleteConfirm', {
          name: partner.name,
        })
      )
    ) {
      deleteMutation.mutate(partner.id)
    }
  }

  if (isForbiddenError(partnersQuery.error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-4 pb-8 duration-500 fade-in'>
      <div className='rounded-2xl border bg-card p-4 shadow-sm'>
        <div className='flex items-start gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <Building2 className='size-5' />
          </div>
          <div className='min-w-0'>
            <h3 className='text-lg font-semibold tracking-tight'>
              {t('productionOutsourcing.partners.title')}
            </h3>
            <p className='mt-1 max-w-4xl text-sm leading-6 text-muted-foreground'>
              {t('productionOutsourcing.partners.description')}
            </p>
          </div>
        </div>
      </div>

      <div className='grid gap-3 md:grid-cols-4'>
        <Card className='rounded-2xl shadow-sm'>
          <CardContent className='flex min-h-16 items-center justify-between gap-3 p-4'>
            <span className='text-sm font-medium text-muted-foreground'>
              {t('productionOutsourcing.partners.stats.total')}
            </span>
            <span className='text-2xl font-semibold tracking-tight tabular-nums'>
              {stats?.total ?? '—'}
            </span>
          </CardContent>
        </Card>
        <Card className='rounded-2xl shadow-sm'>
          <CardContent className='flex min-h-16 items-center justify-between gap-3 p-4'>
            <span className='text-sm font-medium text-muted-foreground'>
              {t('productionOutsourcing.partners.stats.active')}
            </span>
            <span className='text-2xl font-semibold tracking-tight text-emerald-600 tabular-nums'>
              {stats?.active ?? '—'}
            </span>
          </CardContent>
        </Card>
        <Card className='rounded-2xl shadow-sm'>
          <CardContent className='flex min-h-16 items-center justify-between gap-3 p-4'>
            <span className='text-sm font-medium text-muted-foreground'>
              {t('productionOutsourcing.partners.stats.onReview')}
            </span>
            <span className='text-2xl font-semibold tracking-tight text-amber-600 tabular-nums'>
              {stats?.onReview ?? '—'}
            </span>
          </CardContent>
        </Card>
        <Card className='rounded-2xl shadow-sm'>
          <CardContent className='flex min-h-16 items-center justify-between gap-3 p-4'>
            <span className='text-sm font-medium text-muted-foreground'>
              {t('productionOutsourcing.partners.stats.inactive')}
            </span>
            <span className='text-2xl font-semibold tracking-tight text-muted-foreground tabular-nums'>
              {stats?.inactive ?? '—'}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className='flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm md:flex-row md:items-center md:justify-between'>
        <div className='flex flex-1 flex-col gap-3 md:flex-row md:items-center'>
          <div className='relative w-full md:max-w-sm'>
            <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/50' />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(
                'productionOutsourcing.partners.searchPlaceholder'
              )}
              className='h-10 rounded-xl bg-background pl-10 text-sm'
            />
          </div>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as OutsourcePartnerStatus | 'ALL')
            }
            className='h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:w-44 dark:bg-input/30'
          >
            <option value='ALL'>
              {t('productionOutsourcing.partners.filters.all')}
            </option>
            <option value='ACTIVE'>
              {t('productionOutsourcing.partners.statuses.ACTIVE')}
            </option>
            <option value='ON_REVIEW'>
              {t('productionOutsourcing.partners.statuses.ON_REVIEW')}
            </option>
            <option value='INACTIVE'>
              {t('productionOutsourcing.partners.statuses.INACTIVE')}
            </option>
          </select>
        </div>
        <Button
          onClick={openCreate}
          disabled={!canManage || isChecking}
          title={
            canManage
              ? undefined
              : t('productionOutsourcing.partners.noManagePermission')
          }
          className='h-10 rounded-xl px-5'
        >
          <Plus className='mr-2 size-4' />
          {t('productionOutsourcing.partners.actions.add')}
        </Button>
      </div>

      {partnersQuery.isLoading ? (
        <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-3'>
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className='h-48 rounded-2xl' />
          ))}
        </div>
      ) : partnersQuery.isError ? (
        <Card className='rounded-2xl border-rose-300/60 bg-rose-50/70 shadow-sm dark:bg-rose-950/20'>
          <CardContent className='flex flex-col items-center gap-3 py-12 text-center'>
            <Building2 className='size-10 text-rose-400/50' />
            <p className='text-sm font-medium text-rose-600'>
              {t('productionOutsourcing.partners.loadingFailed')}
            </p>
            <Button
              variant='outline'
              className='rounded-xl'
              onClick={() => void partnersQuery.refetch()}
            >
              {t('common.actions.retry')}
            </Button>
          </CardContent>
        </Card>
      ) : partners.length === 0 ? (
        <Card className='rounded-2xl shadow-sm'>
          <CardContent className='flex flex-col items-center gap-3 py-14 text-center'>
            <Building2 className='size-10 text-muted-foreground/30' />
            <p className='text-sm text-muted-foreground'>
              {t('productionOutsourcing.partners.empty')}
            </p>
            <Button
              onClick={openCreate}
              disabled={!canManage || isChecking}
              variant='outline'
              className='rounded-xl'
            >
              {t('productionOutsourcing.partners.actions.add')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-3'>
          {partners.map((partner) => (
            <Card
              key={partner.id}
              className='overflow-hidden rounded-2xl shadow-sm transition-colors hover:bg-muted/20'
            >
              <CardHeader className='space-y-3 border-b bg-muted/20 p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <CardTitle className='truncate text-base font-semibold tracking-tight'>
                      {partner.name}
                    </CardTitle>
                    <p className='mt-1 font-mono text-xs text-muted-foreground'>
                      {partner.code} · v{partner.version}
                    </p>
                  </div>
                  <Badge
                    variant='outline'
                    className={`text-xs font-medium ${statusTone(partner.status)}`}
                  >
                    {t(
                      `productionOutsourcing.partners.statuses.${partner.status}`
                    )}
                  </Badge>
                </div>
                {partner.supplierNameSnapshot ? (
                  <p className='truncate rounded-xl bg-background px-3 py-2 text-xs text-muted-foreground'>
                    {t('productionOutsourcing.partners.fields.supplier')}：
                    {partner.supplierNameSnapshot}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className='space-y-4 p-4'>
                <div className='grid grid-cols-2 gap-3 text-xs'>
                  <div className='rounded-xl bg-muted/30 p-3'>
                    <div className='flex items-center gap-1 text-xs font-medium text-muted-foreground'>
                      <ShieldCheck className='size-3' />
                      {t('productionOutsourcing.partners.fields.qualityGrade')}
                    </div>
                    <p className='mt-1 text-sm font-semibold'>
                      {partner.qualityGrade
                        ? t(
                            `productionOutsourcing.partners.qualityGrades.${partner.qualityGrade}`
                          )
                        : t(
                            'productionOutsourcing.partners.qualityGrades.NONE'
                          )}
                    </p>
                  </div>
                  <div className='rounded-xl bg-muted/30 p-3'>
                    <div className='flex items-center gap-1 text-xs font-medium text-muted-foreground'>
                      <Clock3 className='size-3' />
                      {t('productionOutsourcing.partners.fields.leadTimeDays')}
                    </div>
                    <p className='mt-1 text-sm font-semibold'>
                      {t('productionOutsourcing.partners.leadTimeValue', {
                        count: partner.leadTimeDays,
                      })}
                    </p>
                  </div>
                </div>

                <div className='space-y-1 rounded-xl bg-muted/30 p-3 text-sm'>
                  <p className='font-medium text-foreground'>
                    {partner.contactPerson || '-'}
                    {partner.contactPhone ? ` · ${partner.contactPhone}` : ''}
                  </p>
                  <p className='line-clamp-1 text-xs text-muted-foreground'>
                    {partner.address ||
                      t('productionOutsourcing.partners.noAddress')}
                  </p>
                </div>

                <div className='flex flex-wrap justify-end gap-2 border-t pt-3'>
                  <AuditTimelineTriggerButton
                    module={AUDIT_MODULES.outsourcePartner}
                    targetId={partner.id}
                    targetName={partner.name || partner.code}
                    label={t('common.audit.trigger')}
                    className='h-9 rounded-xl text-xs'
                  />
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={!canManage || isChecking}
                    title={
                      canManage
                        ? undefined
                        : t('productionOutsourcing.partners.noManagePermission')
                    }
                    onClick={() => openEdit(partner)}
                    className='rounded-xl'
                  >
                    <Pencil className='mr-2 size-3.5' />
                    {t('common.actions.edit')}
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    disabled={
                      !canManage || isChecking || deleteMutation.isPending
                    }
                    title={
                      canManage
                        ? undefined
                        : t('productionOutsourcing.partners.noManagePermission')
                    }
                    onClick={() => handleDelete(partner)}
                    className='rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive'
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

      <OutsourcePartnerDialog
        open={dialogOpen}
        partner={editingPartner}
        suppliers={suppliersQuery.data ?? []}
        isSaving={isSaving}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
