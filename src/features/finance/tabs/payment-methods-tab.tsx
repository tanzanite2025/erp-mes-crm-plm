import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Edit2, Plus, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { PaymentMethodActionDialog } from '../components/payment-method-action-dialog'
import { type PaymentMethod } from '../data/schema'
import { financeQueryKeys } from '../query-keys'
import { PaymentMethodCoreService } from '../services/payment-method-core-service'

function comparePaymentMethodsByDefaultThenSortOrder(
  left: PaymentMethod,
  right: PaymentMethod
) {
  if (left.isDefault !== right.isDefault) {
    return left.isDefault ? -1 : 1
  }

  const leftSortOrder = left.sortOrder ?? 0
  const rightSortOrder = right.sortOrder ?? 0
  if (leftSortOrder !== rightSortOrder) {
    return leftSortOrder - rightSortOrder
  }

  return left.code.localeCompare(right.code)
}

export function PaymentMethodsTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)

  const methodsQuery = useQuery({
    queryKey: financeQueryKeys.paymentMethods(),
    queryFn: () => PaymentMethodCoreService.getPaymentMethods(),
  })

  useEffect(() => {
    if (!methodsQuery.error) return
    toast.error(t('finance.paymentMethods.toast.loadFailed'))
  }, [methodsQuery.error, t])

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: financeQueryKeys.paymentMethods(),
    })

  if (isForbiddenError(methodsQuery.error)) {
    return <ForbiddenState />
  }

  const methods = [...(methodsQuery.data ?? [])].sort(
    comparePaymentMethodsByDefaultThenSortOrder
  )
  const isLoading = methodsQuery.isLoading || methodsQuery.isFetching
  const openCreateDialog = () => {
    setEditingMethod(null)
    setIsDialogOpen(true)
  }

  return (
    <div className='animate-in space-y-6 duration-700 fade-in'>
      <IndustrialHeader
        icon={CreditCard}
        title={t('finance.paymentMethods.page.title')}
        description={t('finance.paymentMethods.page.subtitle')}
      />

      <div className='flex flex-col justify-end gap-4 md:flex-row md:items-center'>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void refresh()}
            className='h-9 rounded-full border-dashed text-[10px] font-black tracking-widest uppercase transition-all hover:bg-primary/5 hover:text-primary'
          >
            <RefreshCcw
              className={`mr-2 size-3 ${isLoading ? 'animate-spin' : ''}`}
            />
            {t('finance.paymentMethods.page.refresh')}
          </Button>
          <Button
            size='sm'
            onClick={openCreateDialog}
            className='h-9 rounded-full bg-primary text-[10px] font-black tracking-widest uppercase shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95'
          >
            <Plus className='mr-2 size-3' />
            {t('finance.paymentMethods.page.add')}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 items-start gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5'>
        {methods.map((method) => (
          <Card
            key={method.id}
            className={cn(
              'group h-fit self-start rounded-[20px] border-dashed border-primary/20 bg-muted/5 transition-all hover:bg-muted/10 sm:rounded-[24px]',
              method.isDefault
                ? 'border-primary/70 bg-primary/[0.04] shadow-[0_16px_40px_rgba(37,99,235,0.12)] ring-2 ring-primary/25 dark:bg-primary/10 dark:shadow-[0_18px_44px_rgba(37,99,235,0.18)]'
                : ''
            )}
          >
            <CardHeader className='p-3 pb-1.5 sm:p-4 sm:pb-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='flex size-8 items-center justify-center rounded-xl bg-primary/10 sm:size-9 sm:rounded-2xl'>
                    <CreditCard className='size-3.5 text-primary sm:size-4' />
                  </div>
                  <div>
                    <CardTitle className='text-sm font-black tracking-tighter uppercase italic'>
                      {method.name}
                    </CardTitle>
                    <CardDescription className='font-mono text-[8px] font-black tracking-widest text-muted-foreground uppercase opacity-50'>
                      {method.code}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => {
                    setEditingMethod(method)
                    setIsDialogOpen(true)
                  }}
                  className='size-8 rounded-full opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100'
                >
                  <Edit2 className='size-3' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='p-3 pt-0 pb-3 sm:p-4 sm:pt-0 sm:pb-4'>
              <div className='space-y-1.5 sm:space-y-2'>
                <div className='min-h-0 rounded-xl border border-dashed border-muted/20 bg-background px-2.5 py-1.5 text-[10px] leading-relaxed font-medium break-words text-muted-foreground/80 sm:rounded-2xl sm:px-3 sm:py-2'>
                  {method.description ||
                    t('finance.paymentMethods.card.emptyDescription')}
                </div>
                <div className='flex flex-wrap items-center gap-1.5 sm:gap-2'>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[8px] font-black tracking-widest uppercase ${method.isDefault ? 'border border-primary/20 bg-primary/10 text-primary' : 'bg-muted text-muted-foreground opacity-50'}`}
                  >
                    {method.isDefault
                      ? t('finance.paymentMethods.card.defaultBadge')
                      : t('finance.paymentMethods.card.optionalBadge')}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[8px] font-black tracking-widest uppercase ${method.status === 'Active' ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600' : 'border border-amber-500/20 bg-amber-500/10 text-amber-600'}`}
                  >
                    {method.status === 'Active'
                      ? t('finance.paymentMethods.status.active')
                      : t('finance.paymentMethods.status.inactive')}
                  </span>
                  {method.isSystem ? (
                    <span className='rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[8px] font-black tracking-widest text-blue-600 uppercase'>
                      {t('finance.paymentMethods.card.systemBadge')}
                    </span>
                  ) : null}
                </div>
                <p className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                  {t('finance.paymentMethods.card.sortOrder', {
                    sortOrder: method.sortOrder ?? 0,
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className='rounded-[32px] border-dashed border-blue-500/20 bg-blue-500/5 p-6'>
        <div className='flex items-start gap-4 text-blue-600'>
          <div className='rounded-full bg-white/50 p-3 shadow-sm'>
            <CreditCard className='size-5' />
          </div>
          <div className='space-y-1'>
            <h4 className='text-xs font-black tracking-tight uppercase italic'>
              {t('finance.paymentMethods.guard.title')}
            </h4>
            <p className='max-w-3xl text-[10px] leading-relaxed font-medium opacity-80'>
              {t('finance.paymentMethods.guard.content')}
            </p>
          </div>
        </div>
      </Card>

      <PaymentMethodActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingMethod={editingMethod}
      />
    </div>
  )
}
