import { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { type Supplier, type SupplierStatus } from '../data/schema'
import { SupplierActionDialog } from './supplier-action-dialog'
import { useGetSuppliers, useSupplierMutations } from '../hooks/use-trading'
import { cn } from '@/lib/utils'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'

export function SupplierList() {
  const { t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | 'All'>('All')
  const {
    data: suppliers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useGetSuppliers()
  const { saveMutation, deleteMutation } = useSupplierMutations()
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  const filteredSuppliers = (suppliers || []).filter((supplier) => {
    const matchesSearch =
      (supplier.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
      (supplier.code?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
      (supplier.contactPerson?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'All' || supplier.status === statusFilter

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

  const handleSaveSupplier = (data: Partial<Supplier>) => {
    if (!allowsAction('action_trading_supplier_manage')) return
    saveMutation.mutate(data)
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

  const getStatusBadge = (status: SupplierStatus) => {
    switch (status) {
      case 'Active':
        return (
          <Badge className='bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-black uppercase tracking-widest'>
            {t('purchase.suppliers.statusActive')}
          </Badge>
        )
      case 'Inactive':
        return (
          <Badge className='bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-black uppercase tracking-widest'>
            {t('purchase.suppliers.statusInactive')}
          </Badge>
        )
      case 'OnReview':
        return (
          <Badge className='bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-black uppercase tracking-widest'>
            {t('purchase.suppliers.statusReview')}
          </Badge>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className='h-[60vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500'>
        <div className='relative'>
          <Loader2 className='size-10 text-primary animate-spin opacity-20' />
          <Star className='size-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' />
        </div>
        <p className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse'>
          {t('purchase.suppliers.loading')}
        </p>
      </div>
    )
  }

  if (isError) {
    if (isForbiddenError(error)) {
      return <ForbiddenState />
    }

    const errorMsg = error instanceof Error ? error.message : t('purchase.suppliers.loadingFailed')
    return (
      <div className='rounded-[40px] border-2 border-dashed border-rose-300/50 h-72 flex flex-col items-center justify-center text-center px-6 bg-rose-50/40'>
        <Star className='size-16 mb-4 text-rose-400/40' />
        <p className='text-[10px] font-black uppercase tracking-[0.3em] mb-3 text-rose-600'>
          {t('purchase.suppliers.loadingFailed')}
        </p>
        <p className='mb-6 text-xs font-bold text-rose-700/70'>
          {errorMsg}
        </p>
        <Button
          variant='outline'
          onClick={() => void refetch()}
          className='h-12 rounded-full border-dashed border-2 font-black text-[10px] uppercase tracking-widest px-10'
        >
          {t('common.actions.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6'>
        <div className='p-5 md:p-6 rounded-[24px] bg-muted/5 border-2 border-dashed border-muted/50 flex flex-col justify-between h-32 md:h-36 relative overflow-hidden group'>
          <div className='absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity'>
            <Building2 className='size-12 md:size-16' />
          </div>
          <span className='text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 italic'>
            {t('purchase.suppliers.totalSuppliers')}
          </span>
          <div className='flex items-end justify-between relative'>
            <span className='text-3xl md:text-4xl font-black italic tracking-tighter tabular-nums'>
              {suppliers.length}
            </span>
            <div className='p-1.5 md:p-2 bg-primary/10 rounded-xl'>
              <Building2 className='size-4 md:size-5 text-primary' />
            </div>
          </div>
        </div>
        <div className='p-5 md:p-6 rounded-[24px] bg-muted/5 border-2 border-dashed border-muted/50 flex flex-col justify-between h-32 md:h-36 relative overflow-hidden group'>
          <div className='absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity'>
            <Star className='size-12 md:size-16' />
          </div>
          <span className='text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 italic'>
            {t('purchase.suppliers.keyNodes')}
          </span>
          <div className='flex items-end justify-between relative'>
            <span className='text-3xl md:text-4xl font-black italic tracking-tighter tabular-nums text-emerald-500'>
              {suppliers.filter((supplier) => supplier.status === 'Active').length}
            </span>
            <div className='p-1.5 md:p-2 bg-emerald-500/10 rounded-xl'>
              <Star className='size-4 md:size-5 text-emerald-500' />
            </div>
          </div>
        </div>
        <div className='p-5 md:p-6 rounded-[24px] bg-muted/5 border-2 border-dashed border-muted/50 flex flex-col justify-between h-32 md:h-36 relative overflow-hidden group'>
          <div className='absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity'>
            <Box className='size-12 md:size-16' />
          </div>
          <span className='text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 italic'>
            {t('purchase.suppliers.qualificationFlow')}
          </span>
          <div className='flex items-end justify-between relative'>
            <span className='text-3xl md:text-4xl font-black italic tracking-tighter tabular-nums text-amber-500'>
              {suppliers.filter((supplier) => supplier.status === 'OnReview').length}
            </span>
            <div className='p-1.5 md:p-2 bg-amber-500/10 rounded-xl'>
              <Box className='size-4 md:size-5 text-amber-500' />
            </div>
          </div>
        </div>
      </div>

      <div className='flex flex-col md:flex-row items-center justify-between gap-4 px-1'>
        <div className='relative w-full md:w-96'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
          <Input
            placeholder={t('purchase.suppliers.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-10 h-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-sm font-medium transition-all shadow-inner'
          />
        </div>
        <div className='flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className={cn(
                  'h-11 w-full sm:w-auto px-6 rounded-full font-black text-[10px] uppercase tracking-widest transition-all',
                  statusFilter !== 'All' ? 'bg-primary/10 text-primary' : 'opacity-60'
                )}
              >
                <Filter className='mr-2 size-4' /> {t('purchase.suppliers.filterLabel')}:{' '}
                {statusFilter === 'All'
                  ? t('purchase.suppliers.filterAll')
                  : statusFilter === 'Active'
                    ? t('purchase.suppliers.filterActive')
                    : statusFilter === 'OnReview'
                      ? t('purchase.suppliers.filterReview')
                      : t('purchase.suppliers.filterInactive')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='rounded-[20px] border-2 shadow-xl p-2 w-56'>
              <DropdownMenuLabel className='text-[10px] font-black uppercase opacity-40 px-3 py-2'>
                {t('purchase.suppliers.filterLabel')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className='bg-muted/50' />
              <DropdownMenuItem
                onClick={() => setStatusFilter('All')}
                className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2 flex items-center justify-between'
              >
                {t('purchase.suppliers.filterAll')}
                {statusFilter === 'All' && <CheckCircle2 className='size-3 text-primary' />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter('Active')}
                className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2 mt-1 flex items-center justify-between text-emerald-600'
              >
                {t('purchase.suppliers.filterActive')}
                {statusFilter === 'Active' && <CheckCircle2 className='size-3 text-emerald-500' />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter('OnReview')}
                className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2 mt-1 flex items-center justify-between text-amber-600'
              >
                {t('purchase.suppliers.filterReview')}
                {statusFilter === 'OnReview' && <CheckCircle2 className='size-3 text-amber-500' />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter('Inactive')}
                className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2 mt-1 flex items-center justify-between text-rose-600'
              >
                {t('purchase.suppliers.filterInactive')}
                {statusFilter === 'Inactive' && <CheckCircle2 className='size-3 text-rose-500' />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={handleAddClick}
            className='h-11 w-full sm:w-auto px-8 rounded-full bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95'
          >
            <Plus className='mr-2 size-4' /> {t('purchase.suppliers.addSupplier')}
          </Button>
        </div>
      </div>

      {filteredSuppliers.length > 0 ? (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {filteredSuppliers.map((supplier) => (
            <Card
              key={supplier.id}
              className='group hover:bg-muted/30 transition-all border-dashed border-muted/50 bg-muted/5 rounded-[24px] overflow-hidden cursor-default relative'
              onClick={() => handleEditClick(supplier)}
            >
              <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
              <CardHeader className='p-4 md:p-6 pb-4 border-b border-dashed border-muted/50 relative'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3 md:gap-4'>
                    <div className='size-10 md:size-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-base md:text-lg shadow-inner'>
                      {supplier.name.substring(0, 1)}
                    </div>
                    <div>
                      <div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3'>
                        <h4 className='text-sm md:text-base font-black tracking-tight italic text-foreground'>
                          {supplier.name}
                        </h4>
                        <div className='flex'>{getStatusBadge(supplier.status)}</div>
                      </div>
                      <p className='text-[8px] md:text-[10px] font-black text-muted-foreground uppercase mt-1 tracking-widest opacity-50'>
                        ID: {supplier.code}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant='ghost' size='icon' className='h-9 w-9 rounded-xl hover:bg-muted/50'>
                        <MoreHorizontal className='size-4 text-muted-foreground' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='rounded-[20px] border-2 shadow-xl p-2'>
                      <DropdownMenuItem
                        onClick={() => handleEditClick(supplier)}
                        className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2'
                      >
                        {t('purchase.suppliers.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2 mt-1 text-rose-500 focus:text-rose-500 focus:bg-rose-500/10'
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
              <CardContent className='pt-5 md:pt-6 p-4 md:p-6 space-y-5 relative'>
                <div className='flex flex-col sm:grid sm:grid-cols-2 gap-4 md:gap-6'>
                  <div className='space-y-1.5'>
                    <div className='flex items-center gap-2 text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
                      <User className='size-3' />
                      {t('purchase.suppliers.liaison')}
                    </div>
                    <p className='text-[12px] md:text-[13px] font-black text-foreground'>
                      {supplier.contactPerson}
                    </p>
                  </div>
                  <div className='space-y-1.5 sm:text-right'>
                    <div className='flex items-center gap-2 text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 sm:justify-end italic'>
                      <Phone className='size-3' />
                      {t('purchase.suppliers.hotline')}
                    </div>
                    <p className='text-[12px] md:text-[13px] font-black text-foreground'>
                      {supplier.contactPhone}
                    </p>
                  </div>
                </div>

                <div className='space-y-2.5'>
                  <div className='flex items-center gap-2 text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
                    <Box className='size-3' />
                    {t('purchase.suppliers.offerings')}
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {supplier.mainProducts.map((product) => (
                      <Badge
                        key={product}
                        variant='secondary'
                        className='rounded-full text-[7px] md:text-[8px] font-black px-2 md:px-3 py-0.5 bg-primary/5 text-primary border-none shadow-sm uppercase tracking-tighter'
                      >
                        {product}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className='space-y-1.5 pt-4 border-t border-dashed border-muted/50'>
                  <div className='flex items-center gap-2 text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
                    <MapPin className='size-3' />
                    {t('purchase.suppliers.address')}
                  </div>
                  <p className='text-[10px] md:text-[11px] font-bold text-muted-foreground truncate leading-relaxed'>
                    {supplier.address}
                  </p>
                </div>

                <div className='pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-dashed border-muted/50'>
                  <div className='flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1.5'>
                    <span className='text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] italic'>
                      {t('purchase.suppliers.rating')}
                    </span>
                    <div className='flex flex-col items-start'>
                      <div className='flex items-center gap-1.5 text-base md:text-lg font-black italic tracking-tighter tabular-nums text-amber-500'>
                        <Star className='size-3.5 md:size-4 fill-amber-500 text-amber-500 animate-pulse' />
                        {supplier.rating.toFixed(1)}
                      </div>
                      <span className='text-[7px] font-black uppercase tracking-widest text-amber-600/60 leading-none mt-0.5'>
                        {getRatingLabel(supplier.rating)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant='secondary'
                    size='sm'
                    className='h-9 w-full sm:w-auto px-5 rounded-full font-black text-[8px] md:text-[9px] uppercase tracking-widest bg-muted/20 text-muted-foreground hover:bg-muted/30 transition-colors'
                  >
                    {t('purchase.suppliers.dossier')}
                    <ExternalLink className='ms-2 size-3 opacity-50' />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className='rounded-[40px] border-2 border-dashed border-muted/50 h-72 flex flex-col items-center justify-center text-muted-foreground/20 bg-muted/5 group transition-all hover:bg-muted/10'>
          <Star className='size-16 mb-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-700' />
          <p className='text-[10px] font-black uppercase tracking-[0.3em] mb-6 animate-pulse'>
            {t('purchase.suppliers.empty')}
          </p>
          <Button
            variant='outline'
            onClick={handleAddClick}
            className='h-12 rounded-full border-dashed border-2 font-black text-[10px] uppercase tracking-widest px-10 hover:bg-primary hover:text-primary-foreground transition-all duration-500'
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
