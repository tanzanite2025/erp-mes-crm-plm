import { useEffect, useState } from 'react'
import { Calculator, ClipboardList, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { MaterialCoreService } from '@/features/material-archive/services/material-core-service'
import { type Material } from '@/features/material-archive/data/schema'
import { unitService, type Unit } from '@/features/basic-settings/services/unit-service'
import { useAuthStore } from '@/stores/auth-store'
import { type PurchaseOrder } from '../../data/schema'
import { useGetPurchaseOrderDetail, usePurchaseOrderMutations } from '../../purchase'
import { useGetSuppliers } from '../../supplier'
import { usePurchaseOrderForm } from '../../hooks/use-purchase-order-form'
import { PurchaseOrderHeaderFields } from './parts/purchase-order-header-fields'
import { PurchaseOrderLinesEditor } from './parts/purchase-order-lines-editor'

interface PurchaseOrderActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: PurchaseOrder | null
}

export function PurchaseOrderActionDialog({
  open,
  onOpenChange,
  order: summaryOrder,
}: PurchaseOrderActionDialogProps) {
  const { t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const user = useAuthStore((state) => state.user)
  const { data: suppliers = [] } = useGetSuppliers({ enabled: open })
  const { data: detailedOrder, isLoading: isDetailLoading } = useGetPurchaseOrderDetail(
    summaryOrder?.id || ''
  )

  const activeOrder = summaryOrder ? detailedOrder || summaryOrder : null

  const [units, setUnits] = useState<Unit[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [isMetaLoading, setIsMetaLoading] = useState(true)

  useEffect(() => {
    const loadMetadata = async () => {
      setIsMetaLoading(true)
      try {
        const [unitList, materialList] = await Promise.all([
          unitService.getUnits(),
          MaterialCoreService.getMaterialOptions(),
        ])
        setUnits(unitList || [])
        setMaterials(materialList || [])
      } finally {
        setIsMetaLoading(false)
      }
    }

    loadMetadata()
  }, [])

  const { formData, handleHeaderChange, handleAddLine, handleRemoveLine, updateLine, validate, commit } =
    usePurchaseOrderForm(activeOrder, open)

  const { createMutation, patchMutation, expectedDateChangeMutation } = usePurchaseOrderMutations()

  const handleSave = async () => {
    if (!allowsAction('action_trading_purchase_order_manage')) return
    if (!validate()) return

    try {
      if (activeOrder && summaryOrder) {
        // SDRTS: 提交增量
        const delta = commit()
        if (Object.keys(delta).length === 0) {
          onOpenChange(false)
          return
        }

        const deltaKeys = Object.keys(delta)
        const isExpectedDateOnlyChange = deltaKeys.length > 0 && deltaKeys.every((key) => key === 'expectedDate')

        if (activeOrder.version === undefined || activeOrder.version === null) {
          throw new Error(`[CRITICAL] Missing version for SDRTS Patch on PurchaseOrder ${activeOrder.id}`)
        }

        if (isExpectedDateOnlyChange) {
          await expectedDateChangeMutation.mutateAsync({
            orderId: activeOrder.id,
            expectedDate: formData.expectedDate || '',
            operator: user?.accountNo || 'Unknown',
            actorId: user?.id,
            expectedVersion: activeOrder.version,
          })
        } else {
          await patchMutation.mutateAsync({
            id: activeOrder.id,
            delta,
            version: activeOrder.version,
          })
        }
      } else {
        // 新建采购单
        await createMutation.mutateAsync(formData)
      }
      onOpenChange(false)
    } catch (_error) {
      // 错误已处理
    }
  }

  const isDataLoading = isMetaLoading || (!!summaryOrder && isDetailLoading)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[92vh] max-w-[calc(100%-1rem)] overflow-y-auto rounded-[32px] border-none p-0 shadow-2xl lg:max-w-[1100px]'>
        <div className='sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 px-8 py-4 backdrop-blur-sm'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-lg font-black uppercase tracking-tighter text-slate-900 italic dark:text-white lg:text-xl'>
              <ClipboardList className='size-6 text-primary' />
              {summaryOrder
                ? t('purchase.orders.dialogEditTitle')
                : t('purchase.orders.dialogCreateTitle')}
            </DialogTitle>
            <DialogDescription className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60'>
              {t('purchase.orders.dialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <Button variant='ghost' size='icon' onClick={() => onOpenChange(false)} className='rounded-full'>
            <X className='size-4' />
          </Button>
        </div>

        <div className='relative min-h-[400px] space-y-6 p-8'>
          {isDataLoading && (
            <div className='absolute inset-0 z-50 flex flex-col items-center justify-center space-y-4 rounded-[32px] bg-background/60 backdrop-blur-sm animate-in fade-in duration-300'>
              <Loader2 className='size-10 animate-spin text-primary opacity-30' />
              <p className='animate-pulse text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                {t('purchase.orders.dialogSyncing')}
              </p>
            </div>
          )}

          <PurchaseOrderHeaderFields
            formData={formData}
            handleHeaderChange={handleHeaderChange}
            suppliers={suppliers}
          />

          <PurchaseOrderLinesEditor
            lines={formData.lines || []}
            units={units}
            materials={materials}
            isLoading={isDataLoading}
            currency={formData.currency || 'CNY'}
            onAddLine={handleAddLine}
            onRemoveLine={handleRemoveLine}
            onLineChange={updateLine}
          />
        </div>

        <div className='sticky bottom-0 z-20 flex items-center justify-between border-t bg-background/95 px-8 py-5 backdrop-blur-sm'>
          <div className='flex items-center gap-6'>
            <div className='flex items-center gap-2.5 rounded-2xl bg-primary/5 px-4 py-2'>
              <Calculator className='size-4 text-primary' />
              <div className='flex flex-col'>
                <span className='mb-0.5 text-[9px] font-black uppercase leading-none text-muted-foreground'>
                  {t('purchase.orders.dialogTotal')}
                </span>
                <span className='text-[15px] font-black leading-none text-primary'>
                  {formData.amount?.toLocaleString()}{' '}
                  <span className='text-[10px] opacity-60'>{formData.currency}</span>
                </span>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-2xl p-5 text-[11px] font-black uppercase'
            >
              {t('purchase.orders.dialogCancel')}
            </Button>
            <Button
              onClick={handleSave}
              className='rounded-2xl bg-primary p-5 px-8 text-[11px] font-black uppercase shadow-xl shadow-primary/20'
            >
              {t('purchase.orders.dialogSave')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
