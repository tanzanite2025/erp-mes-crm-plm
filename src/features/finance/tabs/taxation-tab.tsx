import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit2, Percent, Plus, ShieldAlert, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
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
import { TaxActionDialog } from '../components/tax-action-dialog'
import { financeQueryKeys } from '../query-keys'
import { taxService, type TaxRate } from '../services/tax-service'

export function TaxationTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null)

  const taxRatesQuery = useQuery({
    queryKey: financeQueryKeys.taxRates(),
    queryFn: () => taxService.getTaxRates(),
  })

  useEffect(() => {
    if (!taxRatesQuery.error) return
    toast.error(t('finance.taxation.toast.loadFailed'))
  }, [taxRatesQuery.error, t])

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: financeQueryKeys.taxRates() })

  const openEdit = (rate: TaxRate) => {
    setEditingRate(rate)
    setIsDialogOpen(true)
  }

  const openAdd = () => {
    setEditingRate(null)
    setIsDialogOpen(true)
  }

  if (isForbiddenError(taxRatesQuery.error)) {
    return <ForbiddenState />
  }

  const getCardNameKey = (code: string): Parameters<typeof t>[0] =>
    `finance.taxation.card.names.${code}` as Parameters<typeof t>[0]
  const getCardDescriptionKey = (code: string): Parameters<typeof t>[0] =>
    `finance.taxation.card.descriptions.${code}` as Parameters<typeof t>[0]
  const rates = taxRatesQuery.data ?? []
  const isLoading = taxRatesQuery.isLoading || taxRatesQuery.isFetching

  return (
    <div className='animate-in space-y-6 duration-700 fade-in'>
      <IndustrialHeader
        icon={Percent}
        title={t('finance.taxation.page.title')}
        description={t('finance.taxation.page.subtitle')}
      />

      <div className='flex flex-col justify-end gap-4 md:flex-row md:items-center'>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void refresh()}
            className='h-9 rounded-full border-dashed text-[10px] font-black tracking-widest uppercase transition-all hover:bg-emerald-500/5 hover:text-emerald-600'
          >
            <RefreshCcw
              className={`mr-2 size-3 ${isLoading ? 'animate-spin' : ''}`}
            />
            {t('finance.taxation.page.refresh')}
          </Button>
          <Button
            size='sm'
            onClick={openAdd}
            className='h-9 rounded-full bg-emerald-600 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 hover:bg-emerald-700 active:scale-95'
          >
            <Plus className='mr-2 size-3' />
            {t('finance.taxation.page.add')}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
        {rates.map((rate) => (
          <Card
            key={rate.id}
            className='group rounded-[24px] border-dashed border-emerald-500/20 bg-emerald-500/5 transition-all hover:bg-emerald-500/10'
          >
            <CardHeader className='pb-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='flex size-9 items-center justify-center rounded-2xl bg-emerald-500/10'>
                    <Percent className='size-4 text-emerald-600' />
                  </div>
                  <div>
                    <CardTitle className='text-sm font-black tracking-tighter text-emerald-800/80 uppercase italic'>
                      {(() => {
                        const translatedName = t(getCardNameKey(rate.code))
                        return translatedName.includes(
                          'finance.taxation.card.names'
                        )
                          ? rate.name
                          : translatedName
                      })()}
                    </CardTitle>
                    <CardDescription className='font-mono text-[8px] font-black tracking-widest text-emerald-600/60 uppercase'>
                      {t('finance.taxation.card.codeLabel', {
                        code: rate.code,
                      })}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => openEdit(rate)}
                  className='size-8 rounded-full opacity-0 transition-all group-hover:opacity-100 hover:bg-emerald-600/10 hover:text-emerald-700'
                >
                  <Edit2 className='size-3' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='pt-2'>
              <div className='space-y-3'>
                <div className='min-h-[60px] rounded-2xl border border-dashed border-emerald-500/20 bg-background p-3 text-[10px] leading-relaxed font-medium text-muted-foreground/80'>
                  {(() => {
                    const translatedDesc = t(getCardDescriptionKey(rate.code))
                    return translatedDesc.includes(
                      'finance.taxation.card.descriptions'
                    )
                      ? rate.description ||
                          t('finance.taxation.card.emptyDescription')
                      : translatedDesc
                  })()}
                </div>
                <div className='flex items-center justify-between gap-2 border-t border-dashed border-muted/20 pt-3'>
                  <span className='rounded-full border border-emerald-500/20 bg-emerald-500/20 px-2 py-0.5 text-[8px] font-black tracking-widest text-emerald-700 uppercase'>
                    {t('finance.taxation.card.ratioLabel', { rate: rate.rate })}
                  </span>
                  <span className='font-mono text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                    {t('finance.taxation.card.validBadge')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className='rounded-[32px] border-dashed border-blue-500/20 bg-blue-500/5 p-6'>
        <div className='flex items-start gap-4 text-blue-600'>
          <div className='rounded-full bg-white/50 p-3 shadow-sm'>
            <ShieldAlert className='size-5' />
          </div>
          <div className='space-y-1'>
            <h4 className='text-xs font-black tracking-tight uppercase italic'>
              {t('finance.taxation.guard.title')}
            </h4>
            <p className='max-w-3xl text-[10px] leading-relaxed font-medium opacity-80'>
              {t('finance.taxation.guard.content')}
            </p>
          </div>
        </div>
      </Card>

      <TaxActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingRate={editingRate}
      />
    </div>
  )
}
