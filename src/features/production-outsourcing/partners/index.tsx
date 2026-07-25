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
import { OutsourceStatCard } from '../components/outsource-stat-card'
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
  return 'border-slate-500/30 bg-slate-500/10 text-slate-500'
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
    <div className='flex animate-in flex-col gap-5 pb-10 duration-700 fade-in'>
      <div className='rounded-[30px] border border-dashed border-primary/20 bg-primary/5 p-5'>
        <div className='flex items-center gap-2 text-primary'>
          <Building2 className='size-4' />
          <h3 className='text-lg font-black tracking-tighter uppercase italic'>
            {t('productionOutsourcing.partners.title')}
          </h3>
        </div>
        <p className='mt-1 max-w-4xl text-[10px] font-bold tracking-wide text-muted-foreground'>
          {t('productionOutsourcing.partners.description')}
        </p>
      </div>

      <div className='grid gap-3 md:grid-cols-4'>
        <OutsourceStatCard
          label={t('productionOutsourcing.partners.stats.total')}
          value={stats?.total ?? '—'}
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.partners.stats.active')}
          value={stats?.active ?? '—'}
          className='bg-emerald-500/5'
          labelClassName='text-emerald-600'
          valueClassName='text-emerald-600'
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.partners.stats.onReview')}
          value={stats?.onReview ?? '—'}
          className='bg-amber-500/5'
          labelClassName='text-amber-600'
          valueClassName='text-amber-600'
        />
        <OutsourceStatCard
          label={t('productionOutsourcing.partners.stats.inactive')}
          value={stats?.inactive ?? '—'}
          className='bg-slate-500/5'
          valueClassName='text-muted-foreground'
        />
      </div>

      <div className='flex flex-col gap-3 rounded-[24px] border border-dashed border-muted/60 bg-muted/5 p-3 md:flex-row md:items-center md:justify-between'>
        <div className='flex flex-1 flex-col gap-3 md:flex-row md:items-center'>
          <div className='relative w-full md:max-w-sm'>
            <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/50' />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(
                'productionOutsourcing.partners.searchPlaceholder'
              )}
              className='h-11 rounded-2xl border-none bg-background pl-10'
            />
          </div>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as OutsourcePartnerStatus | 'ALL')
            }
            className='h-11 w-full rounded-2xl border border-input bg-background px-3 text-xs font-bold shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:w-44 dark:bg-input/30'
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
          className='h-11 rounded-full px-6'
        >
          <Plus className='mr-2 size-4' />
          {t('productionOutsourcing.partners.actions.add')}
        </Button>
      </div>

      {partnersQuery.isLoading ? (
        <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-3'>
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className='h-56 rounded-[24px]' />
          ))}
        </div>
      ) : partnersQuery.isError ? (
        <Card className='rounded-[24px] border-dashed border-rose-300/60 bg-rose-50/70 shadow-none dark:bg-rose-950/20'>
          <CardContent className='flex flex-col items-center gap-3 py-16 text-center'>
            <Building2 className='size-12 text-rose-400/50' />
            <p className='text-xs font-black text-rose-600'>
              {t('productionOutsourcing.partners.loadingFailed')}
            </p>
            <Button
              variant='outline'
              className='rounded-full'
              onClick={() => void partnersQuery.refetch()}
            >
              {t('common.actions.retry')}
            </Button>
          </CardContent>
        </Card>
      ) : partners.length === 0 ? (
        <Card className='rounded-[24px] border-dashed bg-muted/5 shadow-none'>
          <CardContent className='flex flex-col items-center gap-3 py-20 text-center'>
            <Building2 className='size-12 text-muted-foreground/20' />
            <p className='text-sm font-black text-muted-foreground'>
              {t('productionOutsourcing.partners.empty')}
            </p>
            <Button
              onClick={openCreate}
              disabled={!canManage || isChecking}
              variant='outline'
              className='rounded-full'
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
              className='overflow-hidden rounded-[24px] border-dashed bg-muted/5 shadow-none transition-colors hover:bg-muted/10'
            >
              <CardHeader className='space-y-3 pb-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <CardTitle className='truncate text-base font-black tracking-tight'>
                      {partner.name}
                    </CardTitle>
                    <p className='mt-1 font-mono text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                      {partner.code} · v{partner.version}
                    </p>
                  </div>
                  <Badge
                    variant='outline'
                    className={statusTone(partner.status)}
                  >
                    {t(
                      `productionOutsourcing.partners.statuses.${partner.status}`
                    )}
                  </Badge>
                </div>
                {partner.supplierNameSnapshot ? (
                  <p className='truncate rounded-2xl bg-background px-3 py-2 text-[11px] font-bold text-muted-foreground'>
                    {t('productionOutsourcing.partners.fields.supplier')}：
                    {partner.supplierNameSnapshot}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-2 gap-3 text-xs'>
                  <div className='rounded-2xl bg-background p-3'>
                    <div className='flex items-center gap-1 text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
                      <ShieldCheck className='size-3' />
                      {t('productionOutsourcing.partners.fields.qualityGrade')}
                    </div>
                    <p className='mt-1 font-black'>
                      {partner.qualityGrade
                        ? t(
                            `productionOutsourcing.partners.qualityGrades.${partner.qualityGrade}`
                          )
                        : t(
                            'productionOutsourcing.partners.qualityGrades.NONE'
                          )}
                    </p>
                  </div>
                  <div className='rounded-2xl bg-background p-3'>
                    <div className='flex items-center gap-1 text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
                      <Clock3 className='size-3' />
                      {t('productionOutsourcing.partners.fields.leadTimeDays')}
                    </div>
                    <p className='mt-1 font-black'>
                      {t('productionOutsourcing.partners.leadTimeValue', {
                        count: partner.leadTimeDays,
                      })}
                    </p>
                  </div>
                </div>

                <div className='space-y-1 rounded-2xl bg-background p-3 text-xs'>
                  <p className='font-black text-foreground'>
                    {partner.contactPerson || '-'}
                    {partner.contactPhone ? ` · ${partner.contactPhone}` : ''}
                  </p>
                  <p className='line-clamp-1 font-medium text-muted-foreground'>
                    {partner.address ||
                      t('productionOutsourcing.partners.noAddress')}
                  </p>
                </div>

                <div className='flex flex-wrap justify-end gap-2 border-t border-dashed pt-3'>
                  <AuditTimelineTriggerButton
                    module={AUDIT_MODULES.outsourcePartner}
                    targetId={partner.id}
                    targetName={partner.name || partner.code}
                    label={t('common.audit.trigger')}
                    className='h-9 rounded-full text-[9px]'
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
                    className='rounded-full'
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
