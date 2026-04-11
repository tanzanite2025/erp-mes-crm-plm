import { useCallback, useEffect, useState } from 'react'
import { CreditCard, Edit2, Plus, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { type PaymentMethod } from '../data/schema'
import { PaymentMethodActionDialog } from '../components/payment-method-action-dialog'
import { PaymentMethodCoreService } from '../services/payment-method-core-service'

export function PaymentMethodsTab() {
  const { t } = useLanguage()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [error, setError] = useState<unknown>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await PaymentMethodCoreService.getPaymentMethods()
      setMethods(data)
    } catch (loadError) {
      setError(loadError)
      toast.error(t('finance.paymentMethods.toast.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='space-y-6 animate-in fade-in duration-700'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
          <h2 className='text-lg font-black italic tracking-tighter uppercase'>{t('finance.paymentMethods.page.title')}</h2>
          <p className='text-[10px] text-muted-foreground font-black tracking-widest uppercase opacity-60'>
            {t('finance.paymentMethods.page.subtitle')}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={loadData}
            className='rounded-full h-9 font-black text-[10px] uppercase tracking-widest border-dashed hover:bg-primary/5 hover:text-primary transition-all'
          >
            <RefreshCcw className={`size-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('finance.paymentMethods.page.refresh')}
          </Button>
          <Button
            size='sm'
            onClick={() => {
              setEditingMethod(null)
              setIsDialogOpen(true)
            }}
            className='rounded-full h-9 font-black text-[10px] uppercase tracking-widest bg-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all'
          >
            <Plus className='size-3 mr-2' />
            {t('finance.paymentMethods.page.add')}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
        {methods.map((method) => (
          <Card key={method.id} className='rounded-[24px] border-dashed border-primary/20 bg-muted/5 group hover:bg-muted/10 transition-all'>
            <CardHeader className='pb-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='size-9 rounded-2xl bg-primary/10 flex items-center justify-center'>
                    <CreditCard className='size-4 text-primary' />
                  </div>
                  <div>
                    <CardTitle className='text-sm font-black italic tracking-tighter uppercase'>
                      {method.name}
                    </CardTitle>
                    <CardDescription className='text-[8px] font-black tracking-widest font-mono text-muted-foreground uppercase opacity-50'>
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
                  className='size-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary'
                >
                  <Edit2 className='size-3' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='pt-2'>
              <div className='space-y-3'>
                <div className='p-3 bg-background rounded-2xl border border-dashed border-muted/20 text-[10px] font-medium leading-relaxed min-h-[60px] text-muted-foreground/80'>
                  {method.description || t('finance.paymentMethods.card.emptyDescription')}
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${method.isDefault ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground opacity-50'}`}>
                    {method.isDefault ? t('finance.paymentMethods.card.defaultBadge') : t('finance.paymentMethods.card.optionalBadge')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${method.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                    {method.status === 'Active' ? t('finance.paymentMethods.status.active') : t('finance.paymentMethods.status.inactive')}
                  </span>
                  {method.isSystem ? (
                    <span className='px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 border border-blue-500/20'>
                      {t('finance.paymentMethods.card.systemBadge')}
                    </span>
                  ) : null}
                </div>
                <p className='text-[8px] font-black tracking-widest uppercase text-muted-foreground/40'>
                  {t('finance.paymentMethods.card.sortOrder', { sortOrder: method.sortOrder ?? 0 })}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className='rounded-[32px] border-dashed border-blue-500/20 bg-blue-500/5 p-6'>
        <div className='flex gap-4 items-start text-blue-600'>
          <div className='p-3 rounded-full bg-white/50 shadow-sm'>
            <CreditCard className='size-5' />
          </div>
          <div className='space-y-1'>
            <h4 className='text-xs font-black italic tracking-tight uppercase'>{t('finance.paymentMethods.guard.title')}</h4>
            <p className='text-[10px] font-medium leading-relaxed max-w-3xl opacity-80'>
              {t('finance.paymentMethods.guard.content')}
            </p>
          </div>
        </div>
      </Card>

      <PaymentMethodActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingMethod={editingMethod}
        onSuccess={loadData}
      />
    </div>
  )
}
