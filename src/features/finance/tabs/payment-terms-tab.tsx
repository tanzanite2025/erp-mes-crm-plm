import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCcw, CreditCard, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { PaymentTermActionDialog } from '../components/payment-term-action-dialog'
import { type PaymentTerm } from '../data/schema'
import { financeQueryKeys } from '../query-keys'
import { PaymentTermCoreService } from '../services/payment-term-core-service'

const logger = createLogger('PaymentTermsTab')

function comparePaymentTermsByDefaultThenSortOrder(
  left: PaymentTerm,
  right: PaymentTerm
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

export function PaymentTermsTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null)

  const termsQuery = useQuery({
    queryKey: financeQueryKeys.paymentTerms(),
    queryFn: () => PaymentTermCoreService.getPaymentTerms(),
  })

  useEffect(() => {
    if (!termsQuery.error) return
    logger.error(
      'Failed to load payment terms in PaymentTermsTab',
      termsQuery.error
    )
    toast.error(t('finance.paymentTerms.toast.loadFailed'))
  }, [termsQuery.error, t])

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: financeQueryKeys.paymentTerms() })

  const openEdit = (term: PaymentTerm) => {
    setEditingTerm(term)
    setIsDialogOpen(true)
  }

  const openAdd = () => {
    setEditingTerm(null)
    setIsDialogOpen(true)
  }

  if (isForbiddenError(termsQuery.error)) {
    return <ForbiddenState />
  }

  const getCardLabelKey = (code: string): Parameters<typeof t>[0] =>
    `finance.paymentTerms.card.labels.${code}` as Parameters<typeof t>[0]
  const getCardDescriptionKey = (code: string): Parameters<typeof t>[0] =>
    `finance.paymentTerms.card.descriptions.${code}` as Parameters<typeof t>[0]
  const terms = [...(termsQuery.data ?? [])].sort(
    comparePaymentTermsByDefaultThenSortOrder
  )
  const isLoading = termsQuery.isLoading || termsQuery.isFetching

  return (
    <div className='animate-in space-y-6 duration-700 fade-in'>
      <IndustrialHeader
        icon={CreditCard}
        title={t('finance.paymentTerms.page.title')}
        description={t('finance.paymentTerms.page.subtitle')}
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
            {t('finance.paymentTerms.page.refresh')}
          </Button>
          <Button
            size='sm'
            onClick={openAdd}
            className='h-9 rounded-full bg-primary text-[10px] font-black tracking-widest uppercase shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95'
          >
            <Plus className='mr-2 size-3' />
            {t('finance.paymentTerms.page.addPlan')}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
        {terms.map((term) => (
          <Card
            key={term.id}
            className={cn(
              'group rounded-[24px] border-dashed border-primary/20 bg-muted/5 transition-all hover:bg-muted/10',
              term.isDefault
                ? 'border-primary/70 bg-primary/[0.04] shadow-[0_16px_40px_rgba(37,99,235,0.12)] ring-2 ring-primary/25 dark:bg-primary/10 dark:shadow-[0_18px_44px_rgba(37,99,235,0.18)]'
                : ''
            )}
          >
            <CardHeader className='px-4 pt-3 pb-1'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2.5'>
                  <div className='flex size-7 items-center justify-center rounded-xl bg-primary/10'>
                    <CreditCard className='size-3.5 text-primary' />
                  </div>
                  <div>
                    <CardTitle className='text-sm font-black tracking-tighter uppercase italic'>
                      {(() => {
                        const translatedName = t(getCardLabelKey(term.code))
                        return translatedName.includes(
                          'finance.paymentTerms.card.labels'
                        )
                          ? term.name
                          : translatedName
                      })()}
                    </CardTitle>
                    <CardDescription className='font-mono text-[8px] font-black tracking-widest text-muted-foreground uppercase opacity-50'>
                      {t('finance.paymentTerms.card.codePrefix')}: {term.code}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => openEdit(term)}
                  className='size-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary/10 hover:text-primary'
                >
                  <Edit2 className='size-3' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='pt-1'>
              <div className='space-y-2'>
                <div className='min-h-[36px] rounded-xl border border-dashed border-muted/20 bg-background p-2 text-[10px] leading-relaxed font-medium text-muted-foreground/80'>
                  {(() => {
                    const translatedDesc = t(getCardDescriptionKey(term.code))
                    return translatedDesc.includes(
                      'finance.paymentTerms.card.descriptions'
                    )
                      ? term.description ||
                          t('finance.paymentTerms.card.emptyDescription')
                      : translatedDesc
                  })()}
                </div>
                <div className='flex flex-wrap items-center gap-1.5'>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[8px] font-black tracking-widest uppercase ${term.isDefault ? 'border border-primary/20 bg-primary/10 text-primary' : 'bg-muted text-muted-foreground opacity-50'}`}
                  >
                    {term.isDefault
                      ? t('finance.paymentTerms.card.defaultBadge')
                      : t('finance.paymentTerms.card.optionalBadge')}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[8px] font-black tracking-widest uppercase ${term.status === 'Active' ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600' : 'border border-amber-500/20 bg-amber-500/10 text-amber-600'}`}
                  >
                    {term.status === 'Active'
                      ? t('finance.paymentTerms.status.active')
                      : t('finance.paymentTerms.status.inactive')}
                  </span>
                  {term.isSystem ? (
                    <span className='rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[8px] font-black tracking-widest text-blue-600 uppercase'>
                      {t('finance.paymentTerms.card.systemBadge')}
                    </span>
                  ) : null}
                  <span className='ml-auto text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                    {t('finance.paymentTerms.card.sortOrder', {
                      sortOrder: term.sortOrder ?? 0,
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 业务提示辅助卡片 */}
      <Card className='rounded-[32px] border-dashed border-orange-500/20 bg-orange-500/5 p-6'>
        <div className='flex items-start gap-4 text-orange-600'>
          <div className='rounded-full bg-white/50 p-3 shadow-sm'>
            <CreditCard className='size-5' />
          </div>
          <div className='space-y-1'>
            <h4 className='text-xs font-black tracking-tight uppercase italic'>
              {t('finance.paymentTerms.guard.title')}
            </h4>
            <p className='max-w-3xl text-[10px] leading-relaxed font-medium opacity-80'>
              {t('finance.paymentTerms.guard.content')}{' '}
              {t('finance.paymentTerms.guard.warning')}
            </p>
          </div>
        </div>
      </Card>

      <PaymentTermActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingTerm={editingTerm}
      />
    </div>
  )
}
