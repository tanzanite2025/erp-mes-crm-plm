import { useEffect, useMemo, useState } from 'react'
import { Phone, Truck, User, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TrackingNumberInput } from '@/components/tracking-number-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { useLanguage } from '@/context/language-provider'
import { useGetSalesOrders } from '@/features/trading/sales'
import { ShipmentCoreService, type ShipmentRecord } from '@/features/warehouse/shipment'
import { getCarrierLabelKey, type LogisticsRecord, type SaveLogisticsRecordInput } from '../data/schema'
import { useLogisticsMutations } from '../hooks/use-logistics'
import { getPreferredCarriers } from '../utils/carriers'
import { inferCarrierFromTrackingNo } from '../utils/tracking-no'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'

interface LogisticsActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: LogisticsRecord | null
  defaultOrderNo?: string
  defaultShipmentId?: string
}

export function LogisticsActionDialog({
  open,
  onOpenChange,
  record,
  defaultOrderNo = '',
  defaultShipmentId = '',
}: LogisticsActionDialogProps) {
  const { t } = useLanguage()
  const { saveMutation } = useLogisticsMutations()
  const { data } = useGetSalesOrders(1, 1000, { enabled: open })
  const salesOrders = useMemo(() => data?.items ?? [], [data?.items])
  const sanitizedDefaultOrderNo = defaultOrderNo.trim()
  
  const initialValues = useMemo<SaveLogisticsRecordInput>(() => {
    if (record) return record
    return {
        orderNo: sanitizedDefaultOrderNo,
        carrier: '',
        trackingNo: '',
        status: 'Pending' as const,
        type: 'Shipment' as const,
        contactPerson: '',
        contactPhone: '',
        shipmentId: defaultShipmentId || '',
        lastLocation: '',
        events: [],
        version: 1,
        isDeleted: false,
    }
  }, [record, sanitizedDefaultOrderNo, defaultShipmentId])

  const { data: formData, tracker } = useDeltaTracker(initialValues, open)

  const [associatedShipments, setAssociatedShipments] = useState<ShipmentRecord[]>([])
  const [isLoadingShipments, setIsLoadingShipments] = useState(false)
  const [isCarrierTouched, setIsCarrierTouched] = useState(false)
  const [inferredCarrier, setInferredCarrier] = useState('')
  const preferredCarriers = getPreferredCarriers()

  const orderOptions = useMemo(
    () =>
      salesOrders
        .map((order) => ({
          label: `${order.orderNo} (${order.customerName})`,
          value: order.orderNo.trim(),
        }))
        .filter((order) => order.value !== ''),
    [salesOrders]
  )

  const carrierOptions = useMemo(
    () =>
      preferredCarriers.map((carrier) => ({
        value: carrier,
        label: getCarrierLabelKey(carrier) ? t(getCarrierLabelKey(carrier)!) : carrier,
      })),
    [preferredCarriers, t]
  )

  useEffect(() => {
    if (!open) {
        setIsCarrierTouched(false)
        setInferredCarrier('')
    }
  }, [open])

  useEffect(() => {
    const loadShipments = async () => {
      if (!formData.orderNo) {
        setAssociatedShipments([])
        return
      }

      setIsLoadingShipments(true)
      try {
        const history = await ShipmentCoreService.getShipmentHistory()
        const filtered = history.filter(
          (shipment: ShipmentRecord) => shipment.orderNo === formData.orderNo && shipment.status === 'COMMITTED'
        )
        setAssociatedShipments(filtered)
      } finally {
        setIsLoadingShipments(false)
      }
    }

    void loadShipments()
  }, [formData.orderNo])

  const handleTrackingNoChange = (trackingNo: string) => {
    const autoDetectedCarrier = inferCarrierFromTrackingNo(trackingNo)
    setInferredCarrier(autoDetectedCarrier || '')
    
    formData.trackingNo = trackingNo
    if (!isCarrierTouched && autoDetectedCarrier) {
        formData.carrier = autoDetectedCarrier
    } else if (!isCarrierTouched && !autoDetectedCarrier && inferredCarrier && formData.carrier === inferredCarrier) {
        formData.carrier = ''
    }
  }

  const handleSave = async () => {
    if (!formData.orderNo) return alert(t('trading.logistics.dialog.validationOrder'))
    if (!formData.carrier) return alert(t('trading.logistics.dialog.validationCarrier'))
    if (!formData.trackingNo) return alert(t('trading.logistics.dialog.validationTracking'))

    const delta = tracker.commit()
    const isEdit = !!record
    const isDirty = Object.keys(delta).length > 0

    if (isEdit && !isDirty) {
        onOpenChange(false)
        return
    }

    if (isEdit && record?.id) {
      await saveMutation.mutateAsync({
        mode: 'patch',
        patchInput: {
          id: record.id,
          version: record.version,
          delta,
        },
      })
    } else {
      await saveMutation.mutateAsync({
        mode: 'create',
        createInput: {
          orderNo: formData.orderNo,
          salesOrderId: formData.salesOrderId,
          purchaseOrderId: formData.purchaseOrderId,
          productId: formData.productId,
          shipmentId: formData.shipmentId,
          type: formData.type,
          carrier: formData.carrier,
          trackingNo: formData.trackingNo,
          status: formData.status,
          lastLocation: formData.lastLocation,
          contactPerson: formData.contactPerson,
          contactPhone: formData.contactPhone,
          events: formData.events,
          version: formData.version,
          isDeleted: formData.isDeleted,
        } satisfies SaveLogisticsRecordInput,
      })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='max-w-[500px] border-none shadow-2xl p-0 rounded-[32px] overflow-hidden'
      >
        <div className='bg-primary/5 px-8 py-6 border-b border-dashed border-primary/20 relative'>
          <DialogHeader>
            <DialogTitle className='text-lg font-black uppercase tracking-tight flex items-center gap-2'>
              <Truck className='size-5 text-primary' />
              {record
                ? t('trading.logistics.dialog.editTitle')
                : t('trading.logistics.dialog.createTitle')}
            </DialogTitle>
            <DialogDescription className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60'>
              {t('trading.logistics.dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => onOpenChange(false)}
            className='absolute right-4 top-4 rounded-full'
          >
            <X className='size-4' />
          </Button>
        </div>

        <div className='p-8 space-y-5'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-secondary pl-1'>
                {t('trading.logistics.dialog.orderLabel')}
              </Label>
              <SelectDropdown
                placeholder={t('trading.logistics.dialog.orderPlaceholder')}
                items={orderOptions}
                defaultValue={formData.orderNo}
                onValueChange={(value) => {
                  formData.orderNo = value
                  formData.shipmentId = ''
                }}
                className='h-11 rounded-2xl font-black bg-muted/20 border-none'
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-secondary pl-1'>
                {t('trading.logistics.dialog.shipmentLabel')}
              </Label>
              <SelectDropdown
                placeholder={
                  isLoadingShipments
                    ? t('trading.logistics.dialog.shipmentPlaceholderLoading')
                    : associatedShipments.length > 0
                      ? t('trading.logistics.dialog.shipmentPlaceholderAvailable')
                      : t('trading.logistics.dialog.shipmentPlaceholderEmpty')
                }
                items={associatedShipments.map((shipment) => ({
                  label: t('trading.logistics.dialog.shipmentOption', {
                    materialId: shipment.materialId.slice(0, 8),
                    quantity: shipment.quantity,
                  }),
                  value: shipment.id,
                }))}
                defaultValue={formData.shipmentId}
                onValueChange={(value) => { formData.shipmentId = value }}
                className='h-11 rounded-2xl font-bold bg-muted/20 border-none'
                disabled={associatedShipments.length === 0}
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-secondary pl-1'>
                {t('trading.logistics.dialog.carrierLabel')}
              </Label>
              <SelectDropdown
                placeholder={t('trading.logistics.dialog.carrierPlaceholder')}
                items={carrierOptions}
                defaultValue={formData.carrier}
                onValueChange={(value) => {
                  setIsCarrierTouched(true)
                  setInferredCarrier('')
                  formData.carrier = value
                }}
                className='h-11 rounded-2xl font-bold bg-muted/20 border-none'
              />
              <div className='flex flex-wrap gap-2 pt-2'>
                {preferredCarriers.slice(0, 2).map((carrier) => {
                  const isActive = formData.carrier === carrier
                  return (
                    <Button
                      key={carrier}
                      type='button'
                      variant='outline'
                      onClick={() => {
                        setIsCarrierTouched(true)
                        setInferredCarrier('')
                        formData.carrier = carrier
                      }}
                      className={`h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                        isActive
                          ? 'border-primary bg-primary text-white hover:bg-primary/90 hover:text-white'
                          : 'border-dashed border-primary/30 bg-background text-primary/70 hover:border-primary/50 hover:text-primary'
                      }`}
                    >
                      {getCarrierLabelKey(carrier) ? t(getCarrierLabelKey(carrier)!) : carrier}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-secondary pl-1'>
                {t('trading.logistics.dialog.trackingLabel')}
              </Label>
              <TrackingNumberInput
                value={formData.trackingNo || ''}
                onValueChange={handleTrackingNoChange}
                placeholder={t('trading.logistics.dialog.trackingPlaceholder')}
                inputClassName='h-11 rounded-2xl font-bold bg-muted/20 border-none'
              />
              {inferredCarrier ? (
                <p className='pl-1 text-[10px] font-bold text-emerald-700'>
                  {t('trading.logistics.dialog.inferredCarrier', {
                    carrier: getCarrierLabelKey(inferredCarrier)
                      ? t(getCarrierLabelKey(inferredCarrier)!)
                      : inferredCarrier,
                  })}
                </p>
              ) : null}
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-secondary pl-1'>
                {t('trading.logistics.dialog.contactLabel')}
              </Label>
              <div className='relative'>
                <User className='absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' />
                <Input
                  value={formData.contactPerson || ''}
                  onChange={(event) => { formData.contactPerson = event.target.value }}
                  placeholder={t('trading.logistics.dialog.contactPlaceholder')}
                  className='pl-9 h-11 rounded-2xl font-bold bg-muted/20 border-none'
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-secondary pl-1'>
                {t('trading.logistics.dialog.phoneLabel')}
              </Label>
              <div className='relative'>
                <Phone className='absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground' />
                <Input
                  value={formData.contactPhone || ''}
                  onChange={(event) => { formData.contactPhone = event.target.value }}
                  placeholder={t('trading.logistics.dialog.phonePlaceholder')}
                  className='pl-9 h-11 rounded-2xl font-bold bg-muted/20 border-none'
                />
              </div>
            </div>
          </div>
        </div>

        <div className='px-8 py-5 border-t flex items-center justify-end gap-3'>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='font-black text-[11px] uppercase p-5 rounded-2xl'
          >
            {t('trading.logistics.dialog.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className='font-black text-[11px] uppercase p-5 px-8 rounded-2xl shadow-xl shadow-primary/20 bg-primary'
          >
            {t('trading.logistics.dialog.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
