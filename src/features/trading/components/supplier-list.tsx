import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  User,
  Phone,
  MapPin,
  Building2,
  ExternalLink,
  Star,
  Box,
  CheckCircle2,
  Loader2,
  MessageCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { type DeltaSet } from '@/lib/delta/types'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AuditStamp } from '@/components/common/audit-stamp'
import { ForbiddenState } from '@/components/forbidden-state'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { canOpenWeChat, openWeChat } from '@/features/contact-channels'
import { type Supplier, type SupplierFormValues, type SupplierStatus } from '../data/schema'
import { tradingQueryKeys } from '../query-keys'
import { useGetSupplierList, useSupplierMutations } from '../supplier'
import { requireTradingCommandActor } from '../utils/command-actor'
import { SupplierActionDialog } from './supplier-action-dialog'

export function SupplierList() {
  const { locale, t } = useLanguage()
  const queryClient = useQueryClient()
  const { allowsAction } = useNonBlockingPermissionActions()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | 'All'>(
    'All'
  )
  const { data: supplierList, isLoading, isError, error } = useGetSupplierList()
  const user = useAuthStore((state) => state.user)
  const { createMutation, saveMutation, deleteMutation } =
    useSupplierMutations()
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  )
  const suppliers = supplierList?.items ?? []
  const supplierStats = supplierList?.metadata?.stats
  const supplierStatsAvailable =
    typeof supplierStats?.total === 'number' &&
    typeof supplierStats?.active === 'number' &&
    typeof supplierStats?.pendingReview === 'number'
  const supplierStatsMissingLabel =
    locale === 'zh-CN'
      ? '统计暂不可用，请稍后刷新后重试。'
      : 'Stats are temporarily unavailable. Please refresh and try again later.'

  const filteredSuppliers = (suppliers || []).filter((supplier) => {
    const matchesSearch =
      (supplier.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
      (supplier.code?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
      (supplier.contactPerson?.toLowerCase() ?? '').includes(
        searchTerm.toLowerCase()
      )

    const matchesStatus =
      statusFilter === 'All' || supplier.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleAddClick = () => {
    if (!allowsAction('action_trading_supplier_manage')) return
    setSelectedSupplier(null)
    setIsActionDialogOpen(true)
  }

  const handleEditClick = (supplier: Supplier) => {
    if (!allowsAction('action_trading_supplier_manage')) return
    setSelectedSupplier(supplier)
    setIsActionDialogOpen(true)
  }

  const handleSaveSupplier = (payload: {
    mode: 'create'
    data: SupplierFormValues
  } | {
    mode: 'edit'
    delta: DeltaSet
    finalData: Supplier
  }) => {
    if (!allowsAction('action_trading_supplier_manage')) return

    if (payload.mode === 'edit') {
      if (!selectedSupplier) {
        return
      }
      const actor = requireTradingCommandActor(
        { operator: user?.accountNo, actorId: user?.id },
        'SupplierList.handleSaveSupplier'
      )
      saveMutation.mutate({
        id: selectedSupplier.id,
        delta: payload.delta,
        finalData: payload.finalData,
        operator: actor.operator,
        actorId: actor.actorId,
        expectedVersion: selectedSupplier.version,
      })
      return
    }

    if (payload.mode === 'create') {
      createMutation.mutate(payload.data)
    }
  }

  const handleDeleteSupplier = (id: string) => {
    if (!allowsAction('action_trading_supplier_delete')) return
    if (confirm(t('purchase.suppliers.deleteConfirm'))) {
      deleteMutation.mutate(id)
    }
  }

  const getRatingLabel = (rating: number) => {
    if (rating >= 90) return t('purchase.suppliers.ratings.strategic')
    if (rating >= 70) return t('purchase.suppliers.ratings.preferred')
    if (rating >= 50) return t('purchase.suppliers.ratings.standard')
    return t('purchase.suppliers.ratings.probation')
  }

  const handleOpenWeChat = (supplier: Supplier) => {
    if (!canOpenWeChat(supplier.wechat)) {
      toast.error('该供应商未填写微信号')
      return
    }

    openWeChat(supplier.wechat)
  }

  const getStatusBadge = (status: SupplierStatus) => {
    switch (status) {
      case 'Active':
        return (
          <Badge className='border-emerald-500/20 bg-emerald-500/10 text-[10px] font-black tracking-widest text-emerald-600 uppercase'>
            {t('purchase.suppliers.statusActive')}
          </Badge>
        )
      case 'Inactive':
        return (
          <Badge className='border-rose-500/20 bg-rose-500/10 text-[10px] font-black tracking-widest text-rose-600 uppercase'>
            {t('purchase.suppliers.statusInactive')}
          </Badge>
        )
      case 'OnReview':
        return (
          <Badge className='border-amber-500/20 bg-amber-500/10 text-[10px] font-black tracking-widest text-amber-600 uppercase'>
            {t('purchase.suppliers.statusReview')}
          </Badge>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className='flex h-[60vh] animate-in flex-col items-center justify-center space-y-4 duration-500 fade-in'>
        <div className='relative'>
          <Loader2 className='size-10 animate-spin text-primary opacity-20' />
          <Star className='absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-primary' />
        </div>
        <p className='animate-pulse text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase'>
          {t('purchase.suppliers.loading')}
        </p>
      </div>
    )
  }

  if (isError) {
    if (isForbiddenError(error)) {
      return <ForbiddenState />
    }

    const errorMsg =
      error instanceof Error
        ? error.message
        : t('purchase.suppliers.loadingFailed')
    return (
      <div className='flex h-72 flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-rose-300/50 bg-rose-50/40 px-6 text-center'>
        <Star className='mb-4 size-16 text-rose-400/40' />
        <p className='mb-3 text-[10px] font-black tracking-[0.3em] text-rose-600 uppercase'>
          {t('purchase.suppliers.loadingFailed')}
        </p>
        <p className='mb-6 text-xs font-bold text-rose-700/70'>{errorMsg}</p>
        <Button
          variant='outline'
          onClick={() =>
            void queryClient.invalidateQueries({
              queryKey: tradingQueryKeys.supplierList(),
            })
          }
          className='h-12 rounded-full border-2 border-dashed px-10 text-[10px] font-black tracking-widest uppercase'
        >
          {t('common.actions.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-6 duration-700 fade-in md:gap-8'>
      {!supplierStatsAvailable && (
        <div className='rounded-[24px] border border-amber-300/60 bg-amber-50/80 px-4 py-3 text-xs font-bold text-amber-800'>
          {supplierStatsMissingLabel}
        </div>
      )}

      <div className='grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3'>
        <div className='flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-dashed border-muted/60 bg-muted/5 px-4 py-2.5'>
          <div className='flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10'>
            <Building2 className='size-4 text-primary' />
          </div>
          <span className='min-w-0 flex-1 truncate text-xs font-bold text-muted-foreground'>
            {t('purchase.suppliers.totalSuppliers')}
          </span>
          <div className='flex shrink-0 items-center gap-2'>
            <span className='text-2xl font-black tracking-tight tabular-nums'>
              {supplierStatsAvailable ? supplierStats.total : '—'}
            </span>
          </div>
        </div>
        <div className='flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-dashed border-muted/60 bg-muted/5 px-4 py-2.5'>
          <div className='flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10'>
            <Star className='size-4 text-emerald-500' />
          </div>
          <span className='min-w-0 flex-1 truncate text-xs font-bold text-muted-foreground'>
            {t('purchase.suppliers.keyNodes')}
          </span>
          <div className='flex shrink-0 items-center gap-2'>
            <span className='text-2xl font-black tracking-tight text-emerald-500 tabular-nums'>
              {supplierStatsAvailable ? supplierStats.active : '—'}
            </span>
          </div>
        </div>
        <div className='flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-dashed border-muted/60 bg-muted/5 px-4 py-2.5'>
          <div className='flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10'>
            <Box className='size-4 text-amber-500' />
          </div>
          <span className='min-w-0 flex-1 truncate text-xs font-bold text-muted-foreground'>
            {t('purchase.suppliers.qualificationFlow')}
          </span>
          <div className='flex shrink-0 items-center gap-2'>
            <span className='text-2xl font-black tracking-tight text-amber-500 tabular-nums'>
              {supplierStatsAvailable ? supplierStats.pendingReview : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className='flex flex-col items-center justify-between gap-4 px-1 md:flex-row'>
        <div className='relative w-full md:w-96'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t('purchase.suppliers.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='h-12 rounded-2xl border-none bg-muted/50 pl-10 text-sm font-medium shadow-inner transition-all focus-visible:ring-1 focus-visible:ring-primary/20'
          />
        </div>
        <div className='flex w-full flex-col items-center gap-3 sm:flex-row md:w-auto'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className={cn(
                  'h-11 w-full rounded-full px-6 text-[10px] font-black tracking-widest uppercase transition-all sm:w-auto',
                  statusFilter !== 'All'
                    ? 'bg-primary/10 text-primary'
                    : 'opacity-60'
                )}
              >
                <Filter className='mr-2 size-4' />{' '}
                {t('purchase.suppliers.filterLabel')}:{' '}
                {statusFilter === 'All'
                  ? t('purchase.suppliers.filterAll')
                  : statusFilter === 'Active'
                    ? t('purchase.suppliers.filterActive')
                    : statusFilter === 'OnReview'
                      ? t('purchase.suppliers.filterReview')
                      : t('purchase.suppliers.filterInactive')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='start'
              className='w-56 rounded-[20px] border-2 p-2 shadow-xl'
            >
              <DropdownMenuLabel className='px-3 py-2 text-[10px] font-black uppercase opacity-40'>
                {t('purchase.suppliers.filterLabel')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className='bg-muted/50' />
              <DropdownMenuItem
                onClick={() => setStatusFilter('All')}
                className='flex items-center justify-between rounded-lg px-4 py-2 text-[10px] font-black tracking-widest uppercase'
              >
                {t('purchase.suppliers.filterAll')}
                {statusFilter === 'All' && (
                  <CheckCircle2 className='size-3 text-primary' />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter('Active')}
                className='mt-1 flex items-center justify-between rounded-lg px-4 py-2 text-[10px] font-black tracking-widest text-emerald-600 uppercase'
              >
                {t('purchase.suppliers.filterActive')}
                {statusFilter === 'Active' && (
                  <CheckCircle2 className='size-3 text-emerald-500' />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter('OnReview')}
                className='mt-1 flex items-center justify-between rounded-lg px-4 py-2 text-[10px] font-black tracking-widest text-amber-600 uppercase'
              >
                {t('purchase.suppliers.filterReview')}
                {statusFilter === 'OnReview' && (
                  <CheckCircle2 className='size-3 text-amber-500' />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter('Inactive')}
                className='mt-1 flex items-center justify-between rounded-lg px-4 py-2 text-[10px] font-black tracking-widest text-rose-600 uppercase'
              >
                {t('purchase.suppliers.filterInactive')}
                {statusFilter === 'Inactive' && (
                  <CheckCircle2 className='size-3 text-rose-500' />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={handleAddClick}
            className='h-11 w-full rounded-full bg-primary px-8 text-[10px] font-black tracking-widest text-primary-foreground uppercase shadow-xl shadow-primary/20 transition-all active:scale-95 sm:w-auto'
          >
            <Plus className='mr-2 size-4' />{' '}
            {t('purchase.suppliers.addSupplier')}
          </Button>
        </div>
      </div>

      {filteredSuppliers.length > 0 ? (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          {filteredSuppliers.map((supplier) => (
            <Card
              key={supplier.id}
              className='group relative cursor-default overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/5 transition-all hover:bg-muted/30'
            >
              <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
              <CardHeader className='relative border-b border-dashed border-muted/50 p-3 pb-3 md:p-4 md:pb-3.5'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5 md:gap-3'>
                    <div className='flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary shadow-inner md:size-10 md:text-base'>
                      {supplier.name.substring(0, 1)}
                    </div>
                    <div>
                      <div className='flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2'>
                        <h4 className='text-sm font-black tracking-tight text-foreground italic md:text-base'>
                          {supplier.name}
                        </h4>
                        <div className='flex'>
                          {getStatusBadge(supplier.status)}
                        </div>
                      </div>
                      <p className='mt-0.5 text-[8px] font-black tracking-widest text-muted-foreground uppercase opacity-50 md:text-[9px]'>
                        ID: {supplier.code}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-9 w-9 rounded-xl hover:bg-muted/50'
                      >
                        <MoreHorizontal className='size-4 text-muted-foreground' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align='end'
                      className='rounded-[20px] border-2 p-2 shadow-xl'
                    >
                      <DropdownMenuItem
                        onClick={() => handleEditClick(supplier)}
                        className='rounded-lg px-4 py-2 text-[10px] font-black tracking-widest uppercase'
                      >
                        {t('purchase.suppliers.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='mt-1 rounded-lg px-4 py-2 text-[10px] font-black tracking-widest text-rose-500 uppercase focus:bg-rose-500/10 focus:text-rose-500'
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSupplier(supplier.id)
                        }}
                      >
                        {t('purchase.suppliers.terminate')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className='relative space-y-3 p-3 pt-3 md:space-y-3.5 md:p-4 md:pt-4'>
                <div className='flex flex-col gap-2.5 sm:grid sm:grid-cols-2 md:gap-3'>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40 md:text-[9px]'>
                      <User className='size-3' />
                      {t('purchase.suppliers.liaison')}
                    </div>
                    <p className='text-[12px] font-black text-foreground md:text-[13px]'>
                      {supplier.contactPerson}
                    </p>
                  </div>
                  <div className='space-y-1 sm:text-right'>
                    <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40 sm:justify-end md:text-[9px]'>
                      <Phone className='size-3' />
                      {t('purchase.suppliers.hotline')}
                    </div>
                    <p className='text-[12px] font-black text-foreground md:text-[13px]'>
                      {supplier.contactPhone}
                    </p>
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40 md:text-[9px]'>
                    <Box className='size-3' />
                    {t('purchase.suppliers.offerings')}
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {supplier.mainProducts.map((product) => (
                      <Badge
                        key={product}
                        variant='secondary'
                        className='rounded-full border-none bg-primary/5 px-2 py-0.5 text-[7px] font-black tracking-tighter text-primary uppercase shadow-sm md:px-3 md:text-[8px]'
                      >
                        {product}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className='space-y-1 border-t border-dashed border-muted/50 pt-2.5'>
                  <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40 md:text-[9px]'>
                    <MapPin className='size-3' />
                    {t('purchase.suppliers.address')}
                  </div>
                  <p className='truncate text-[10px] leading-relaxed font-bold text-muted-foreground md:text-[11px]'>
                    {supplier.address}
                  </p>
                </div>

                <div className='space-y-1 border-t border-dashed border-muted/50 pt-2.5'>
                  <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40 md:text-[9px]'>
                    <MessageCircle className='size-3' />
                    {t('purchase.suppliers.communication')} /{' '}
                    {t('purchase.suppliers.wechat')}
                  </div>
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <p className='text-[10px] font-bold break-all text-muted-foreground md:text-[11px]'>
                      {supplier.wechat || t('purchase.suppliers.unfilled')}
                    </p>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      disabled={!canOpenWeChat(supplier.wechat)}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleOpenWeChat(supplier)
                      }}
                      className='h-8 w-full rounded-full text-[9px] font-black tracking-widest uppercase sm:w-auto'
                    >
                      {t('purchase.suppliers.openWechat')}
                      <ExternalLink className='ms-2 size-3' />
                    </Button>
                  </div>
                </div>

                <div className='flex flex-col justify-between gap-2.5 border-t border-dashed border-muted/50 pt-2.5 sm:flex-row sm:items-center'>
                  <div className='flex items-center justify-between gap-1.5 sm:flex-col sm:items-start sm:justify-start'>
                    <span className='text-[8px] font-black tracking-[0.2em] text-muted-foreground/40 uppercase italic'>
                      {t('purchase.suppliers.rating')}
                    </span>
                    <div className='flex flex-col items-start'>
                      <div className='flex items-center gap-1.5 text-base font-black tracking-tighter text-amber-500 italic tabular-nums md:text-lg'>
                        <Star className='size-3.5 animate-pulse fill-amber-500 text-amber-500 md:size-4' />
                        {supplier.rating.toFixed(1)}
                      </div>
                      <span className='mt-0.5 text-[7px] leading-none font-black tracking-widest text-amber-600/60 uppercase'>
                        {getRatingLabel(supplier.rating)}
                      </span>
                    </div>
                  </div>
                  <div className='flex w-full flex-col gap-1.5 sm:w-auto sm:flex-row sm:items-center'>
                    <AuditTimelineTriggerButton
                      module={AUDIT_MODULES.supplier}
                      targetId={supplier.id}
                      targetName={supplier.name || supplier.code}
                      label={t('common.audit.trigger')}
                      className='h-9 w-full rounded-full px-5 text-[8px] sm:w-auto md:text-[9px]'
                    />
                    <Button
                      variant='secondary'
                      size='sm'
                      className='h-9 w-full rounded-full bg-muted/20 px-5 text-[8px] font-black tracking-widest text-muted-foreground uppercase transition-colors hover:bg-muted/30 sm:w-auto md:text-[9px]'
                    >
                      {t('purchase.suppliers.dossier')}
                      <ExternalLink className='ms-2 size-3 opacity-50' />
                    </Button>
                  </div>
                </div>

                <AuditStamp
                  module={AUDIT_MODULES.supplier}
                  targetId={supplier.id}
                  createdAt={supplier.createdAt}
                  updatedAt={supplier.updatedAt}
                  className='border-primary/10 pt-1.5'
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className='group flex h-72 flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-muted/50 bg-muted/5 text-muted-foreground/20 transition-all hover:bg-muted/10'>
          <Star className='mb-4 size-16 opacity-10 transition-all duration-700 group-hover:scale-110 group-hover:opacity-20' />
          <p className='mb-6 animate-pulse text-[10px] font-black tracking-[0.3em] uppercase'>
            {t('purchase.suppliers.empty')}
          </p>
          <Button
            variant='outline'
            onClick={handleAddClick}
            className='h-12 rounded-full border-2 border-dashed px-10 text-[10px] font-black tracking-widest uppercase transition-all duration-500 hover:bg-primary hover:text-primary-foreground'
          >
            {t('purchase.suppliers.firstVendor')}
          </Button>
        </div>
      )}

      <SupplierActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        supplier={selectedSupplier}
        onSave={handleSaveSupplier}
      />
    </div>
  )
}
