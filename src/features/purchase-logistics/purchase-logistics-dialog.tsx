import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Plus, Truck, Package, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { TrackingNumberInput } from '@/components/tracking-number-input'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useLanguage } from '@/context/language-provider'
import { apiFetch } from '@/lib/api-client'
import { type PurchaseOrder } from '@/features/trading/data/schema'
import { getPreferredCarriers } from '@/features/logistics/utils/carriers'
import { inferCarrierFromTrackingNo } from '@/features/logistics/utils/tracking-no'
import {
  queuePurchaseLogisticsOfflineDraft,
  shouldQueuePurchaseLogisticsOfflineDraft,
} from './services/purchase-logistics-offline-draft-service'
import { PurchaseLogisticsService } from './services/purchase-logistics-service'

type PurchaseOrderOption = Pick<PurchaseOrder, 'id' | 'orderNo' | 'supplierName'>

export function PurchaseLogisticsDialog() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    purchaseOrderId: '',
    orderNo: '',
    carrier: '',
    trackingNo: '',
  })
  const [isCarrierTouched, setIsCarrierTouched] = useState(false)
  const [inferredCarrier, setInferredCarrier] = useState('')
  const preferredCarriers = getPreferredCarriers()

  const { data: purchaseOrders } = useQuery<PurchaseOrderOption[] | { items?: PurchaseOrderOption[] }>({
    queryKey: ['pending-purchase-orders'],
    queryFn: () => apiFetch('/purchase-orders?status=Approved'),
  })
  const orders = Array.isArray(purchaseOrders) ? purchaseOrders : purchaseOrders?.items || []

  const mutation = useMutation({
    mutationFn: (data: typeof form) => PurchaseLogisticsService.saveRecord(data),
  })

  const resetForm = () => {
    setOpen(false)
    setForm({ purchaseOrderId: '', orderNo: '', carrier: '', trackingNo: '' })
    setIsCarrierTouched(false)
    setInferredCarrier('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.purchaseOrderId || !form.trackingNo) {
      toast.error(t('purchase.logistics.incomplete'))
      return
    }

    if (!navigator.onLine) {
      queuePurchaseLogisticsOfflineDraft(form)
      toast.success(t('purchase.logistics.offlineQueued'), {
        description: t('purchase.logistics.offlineQueuedDesc', { trackingNo: form.trackingNo }),
        icon: <Truck className='h-4 w-4' />,
      })
      resetForm()
      return
    }

    try {
      await mutation.mutateAsync(form)
      queryClient.invalidateQueries({ queryKey: ['purchase-logistics-list'] })
      toast.success(t('purchase.logistics.bindSuccess'), {
        description: t('purchase.logistics.bindSuccessDesc', { trackingNo: form.trackingNo }),
        icon: <Truck className='h-4 w-4' />,
      })
      resetForm()
    } catch (err) {
      if (shouldQueuePurchaseLogisticsOfflineDraft(err)) {
        const message = err instanceof Error ? err.message : undefined
        queuePurchaseLogisticsOfflineDraft(form, message)
        toast.success(t('purchase.logistics.offlineQueued'), {
          description: t('purchase.logistics.offlineQueuedDesc', { trackingNo: form.trackingNo }),
          icon: <Truck className='h-4 w-4' />,
        })
        resetForm()
        return
      }

      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.error(t('purchase.logistics.bindFailed', { message }))
    }
  }

  const handleTrackingNoChange = (trackingNo: string) => {
    const autoDetectedCarrier = inferCarrierFromTrackingNo(trackingNo)
    setInferredCarrier(autoDetectedCarrier || '')
    setForm((prev) => {
      if (isCarrierTouched) {
        return { ...prev, trackingNo }
      }

      const shouldClearAutoCarrier =
        !autoDetectedCarrier && Boolean(inferredCarrier) && prev.carrier === inferredCarrier

      return {
        ...prev,
        trackingNo,
        carrier: autoDetectedCarrier || (shouldClearAutoCarrier ? '' : prev.carrier),
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='rounded-full h-10 font-black text-[10px] uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20'>
          <Plus className='size-4 me-2' />
          {t('purchase.logistics.bindOrder')}
        </Button>
      </DialogTrigger>
      <DialogContent className='rounded-[32px] sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl'>
        <form onSubmit={handleSubmit}>
          <DialogHeader className='p-8 bg-slate-50 border-b relative'>
            <div className='absolute top-0 right-0 p-4 opacity-5 pointer-events-none'>
              <Package className='size-24 scale-150' />
            </div>
            <DialogTitle className='text-base font-black italic tracking-tighter uppercase mb-1'>
              {t('purchase.logistics.bindDialogTitle')}
            </DialogTitle>
            <DialogDescription className='text-[10px] font-black uppercase tracking-widest text-slate-400'>
              {t('purchase.logistics.bindDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className='p-8 space-y-6'>
            <div className='space-y-2'>
              <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ms-1'>
                {t('purchase.logistics.orderLabel')}
              </label>
              <select
                value={form.purchaseOrderId}
                onChange={(e) => {
                  const selected = orders.find((order) => order.id === e.target.value)
                  setForm((prev) => ({
                    ...prev,
                    purchaseOrderId: e.target.value,
                    orderNo: selected?.orderNo || '',
                  }))
                }}
                className='w-full h-12 rounded-2xl bg-slate-100 border-none px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none appearance-none'
              >
                <option value=''>{t('purchase.logistics.orderPlaceholder')}</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    [{order.orderNo}] {order.supplierName}
                  </option>
                ))}
              </select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ms-1'>
                  {t('purchase.logistics.carrierLabel')}
                </label>
                <Input
                  list='purchase-logistics-carriers'
                  value={form.carrier}
                  onChange={(e) => {
                    setIsCarrierTouched(true)
                    setInferredCarrier('')
                    setForm((prev) => ({ ...prev, carrier: e.target.value }))
                  }}
                  placeholder={t('purchase.logistics.carrierPlaceholder')}
                  className='h-12 rounded-2xl bg-slate-100 border-none'
                />
                <datalist id='purchase-logistics-carriers'>
                  {preferredCarriers.map((carrier) => (
                    <option key={carrier} value={carrier} />
                  ))}
                </datalist>
                <div className='flex flex-wrap gap-2 pt-2'>
                  {preferredCarriers.slice(0, 2).map((carrier) => {
                    const isActive = form.carrier === carrier
                    return (
                      <Button
                        key={carrier}
                        type='button'
                        variant='outline'
                        onClick={() => {
                          setIsCarrierTouched(true)
                          setInferredCarrier('')
                          setForm((prev) => ({ ...prev, carrier }))
                        }}
                        className={`h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white'
                            : 'border-dashed border-slate-300 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                        }`}
                      >
                        {carrier}
                      </Button>
                    )
                  })}
                </div>
              </div>
              <div className='space-y-2'>
                <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ms-1'>
                  {t('purchase.logistics.trackingLabel')}
                </label>
                <TrackingNumberInput
                  value={form.trackingNo}
                  onValueChange={handleTrackingNoChange}
                  placeholder={t('purchase.logistics.trackingPlaceholder')}
                  inputClassName='h-12 rounded-2xl bg-slate-100 border-none'
                />
                {inferredCarrier ? (
                  <p className='pl-1 text-[10px] font-bold text-emerald-700'>
                    {t('purchase.logistics.inferredCarrier', { carrier: inferredCarrier })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className='p-4 rounded-2xl bg-emerald-50 border border-dashed border-emerald-200 flex gap-3 items-start'>
              <Info className='size-4 text-emerald-600 mt-0.5' />
              <p className='text-[9px] font-black uppercase leading-relaxed text-emerald-700 tracking-wider'>
                {t('purchase.logistics.tip')}
              </p>
            </div>
          </div>

          <DialogFooter className='p-6 bg-slate-50 border-t items-center sm:justify-between px-8'>
            <span className='hidden sm:block text-[9px] font-mono text-slate-300 italic tracking-tighter uppercase'>
              XDFC Supply Chain Integrity 1.0
            </span>
            <div className='flex gap-3'>
              <Button
                type='button'
                variant='ghost'
                onClick={() => setOpen(false)}
                className='rounded-full h-11 px-8 text-[10px] font-black uppercase tracking-widest'
              >
                {t('purchase.logistics.cancel')}
              </Button>
              <Button
                disabled={mutation.isPending}
                type='submit'
                className='rounded-full h-11 px-8 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700'
              >
                {t('purchase.logistics.confirmBind')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
