import { useEffect, useState } from 'react'
import { ClipboardList, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { type DictionaryEntry } from '@/features/basic-settings/data/schema'
import { DictionaryCoreService } from '@/features/basic-settings/services/dictionary-core-service'
import { unitService, type Unit } from '@/features/basic-settings/services/unit-service'
import { ProductionDBService } from '@/features/engineering-db/services/production-db-service'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { auditUtils } from '@/lib/audit-utils'
import { useAuthStore } from '@/stores/auth-store'
import { type SalesOrder } from '../data/schema'
import { useGetCustomers } from '../customer'
import { useSalesOrderMutations } from '../sales'
import { useSalesOrderForm } from '../hooks/use-sales-order-form'
import { OrderFooterStats } from './parts/order-footer-stats'
import { OrderHeaderFields } from './parts/order-header-fields'
import { OrderLinesEditor } from './parts/order-lines-editor'

interface SalesOrderActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: SalesOrder | null
}

export function SalesOrderActionDialog({
  open,
  onOpenChange,
  order,
}: SalesOrderActionDialogProps) {
  const { t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const user = useAuthStore((state) => state.user)
  const { data: customers = [] } = useGetCustomers({ enabled: open })
  const { data: products = [] } = useGetProducts({ enabled: open })
  const [dictEntries, setDictEntries] = useState<DictionaryEntry[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [drillingOptions, setDrillingOptions] = useState<{ label: string; value: string }[]>([])
  const [labelingOptions, setLabelingOptions] = useState<{ label: string; value: string }[]>([])

  useEffect(() => {
    const loadMetadata = async () => {
      await DictionaryCoreService.init()
      const [unitList, drillingList, labelingList] = await Promise.all([
        unitService.getUnits(),
        ProductionDBService.getDrilling(),
        ProductionDBService.getLabeling(),
      ])
      setDictEntries(DictionaryCoreService.getEntries())
      setUnits(unitList || [])
      setDrillingOptions(drillingList?.map((item) => ({ label: item.name, value: item.id })) || [])
      setLabelingOptions(labelingList?.map((item) => ({ label: item.name, value: item.id })) || [])
    }

    loadMetadata()

    const handleDictsUpdate = async () => {
      setDictEntries(DictionaryCoreService.getEntries())
    }

    const handleUnitsUpdate = async () => {
      const unitList = await unitService.getUnits()
      setUnits(unitList || [])
    }

    window.addEventListener('xdfc_dictionary_updated', handleDictsUpdate)
    window.addEventListener('xdfc_units_updated', handleUnitsUpdate)

    return () => {
      window.removeEventListener('xdfc_dictionary_updated', handleDictsUpdate)
      window.removeEventListener('xdfc_units_updated', handleUnitsUpdate)
    }
  }, [])

  const {
    formData,
    setFormData,
    handleClassificationChange,
    handleAddLine,
    handleRemoveLine,
    updateLine,
    validate,
    prepareToSave,
    commit,
  } = useSalesOrderForm(order, open)

  const { createMutation, patchMutation, customerChangeMutation, deliveryDateChangeMutation, orderNameChangeMutation, purchaseOrderNoChangeMutation, requirementsChangeMutation, classificationTypeChangeMutation, linesChangeMutation, lineContentChangeMutation, lineAddMutation, lineRemoveMutation } = useSalesOrderMutations()

  const handleActualSave = async () => {
    if (!allowsAction('action_trading_sales_order_manage')) return
    if (!validate()) return

    // 预处理数据（如生成正式条码）
    const finalData = await prepareToSave()
    if (!finalData) return

    try {
      if (order) {
        // SDRTS: 提交增量差异
        const delta = commit()
        // 如果没有实际变更，直接关闭
        if (Object.keys(delta).length === 0) {
          onOpenChange(false)
          return
        }

        const deltaKeys = Object.keys(delta)
        const isCustomerOnlyChange =
          deltaKeys.length > 0 && deltaKeys.every((key) => key === 'customerId' || key === 'customerName')
        const isLinesOnlyChange =
          deltaKeys.length > 0 && deltaKeys.every((key) => key === 'lines' || key === 'quantity' || key === 'amount')
        const isClassificationTypeOnlyChange =
          deltaKeys.length > 0 && deltaKeys.every((key) => key === 'classification' || key === 'type' || key === 'barcode')
        const isDeliveryDateOnlyChange = deltaKeys.length > 0 && deltaKeys.every((key) => key === 'deliveryDate')
        const isOrderNameOnlyChange = deltaKeys.length > 0 && deltaKeys.every((key) => key === 'orderName')
        const isPurchaseOrderNoOnlyChange = deltaKeys.length > 0 && deltaKeys.every((key) => key === 'purchaseOrderNo')
        const isRequirementsOnlyChange = deltaKeys.length > 0 && deltaKeys.every((key) => key === 'requirements')
        const hasLineStructureChange = (() => {
          if (!order || !isLinesOnlyChange) return false
          const previousLineNos = (order.lines || []).map((line) => line.lineNo).sort((a, b) => a - b)
          const nextLineNos = (finalData.lines || []).map((line) => line.lineNo).sort((a, b) => a - b)
          if (previousLineNos.length !== nextLineNos.length) return true
          return previousLineNos.some((lineNo, index) => lineNo !== nextLineNos[index])
        })()
        const isPureLineAdd = (() => {
          if (!order || !isLinesOnlyChange || !hasLineStructureChange) return false
          const previousLines = order.lines || []
          const nextLines = finalData.lines || []
          if (nextLines.length <= previousLines.length) return false

          const previousByLineNo = new Map(previousLines.map((line) => [line.lineNo, line]))
          let addedCount = 0

          for (const line of nextLines) {
            const previousLine = previousByLineNo.get(line.lineNo)
            if (!previousLine) {
              addedCount++
              continue
            }

            if (JSON.stringify(previousLine) !== JSON.stringify(line)) {
              return false
            }
          }

          return addedCount > 0
        })()
        const isPureLineRemove = (() => {
          if (!order || !isLinesOnlyChange || !hasLineStructureChange) return false
          const previousLines = order.lines || []
          const nextLines = finalData.lines || []
          if (nextLines.length >= previousLines.length) return false

          const nextByLineNo = new Map(nextLines.map((line) => [line.lineNo, line]))
          let removedCount = 0

          for (const line of previousLines) {
            const nextLine = nextByLineNo.get(line.lineNo)
            if (!nextLine) {
              removedCount++
              continue
            }

            if (JSON.stringify(nextLine) !== JSON.stringify(line)) {
              return false
            }
          }

          return removedCount > 0
        })()

        if (isCustomerOnlyChange) {
          await customerChangeMutation.mutateAsync({
            orderId: order.id,
            customerId: finalData.customerId,
            customerName: finalData.customerName || '',
            operator: user?.accountNo || 'Unknown',
            actorId: user?.id,
            expectedVersion: order.version,
          })
          onOpenChange(false)
          return
        }

        if (isLinesOnlyChange) {
          if (!hasLineStructureChange) {
            await lineContentChangeMutation.mutateAsync({
              orderId: order.id,
              lines: finalData.lines || [],
              operator: user?.accountNo || 'Unknown',
              actorId: user?.id,
              expectedVersion: order.version,
            })
            onOpenChange(false)
            return
          }

          if (isPureLineAdd) {
            await lineAddMutation.mutateAsync({
              orderId: order.id,
              lines: finalData.lines || [],
              operator: user?.accountNo || 'Unknown',
              actorId: user?.id,
              expectedVersion: order.version,
            })
            onOpenChange(false)
            return
          }

          if (isPureLineRemove) {
            await lineRemoveMutation.mutateAsync({
              orderId: order.id,
              lines: finalData.lines || [],
              operator: user?.accountNo || 'Unknown',
              actorId: user?.id,
              expectedVersion: order.version,
            })
            onOpenChange(false)
            return
          }

          await linesChangeMutation.mutateAsync({
            orderId: order.id,
            lines: finalData.lines || [],
            operator: user?.accountNo || 'Unknown',
            actorId: user?.id,
            expectedVersion: order.version,
          })
          onOpenChange(false)
          return
        }

        if (isClassificationTypeOnlyChange) {
          await classificationTypeChangeMutation.mutateAsync({
            orderId: order.id,
            classification: finalData.classification,
            type: finalData.type,
            barcode: finalData.barcode,
            operator: user?.accountNo || 'Unknown',
            actorId: user?.id,
            expectedVersion: order.version,
          })
          onOpenChange(false)
          return
        }

        if (isDeliveryDateOnlyChange) {
          await deliveryDateChangeMutation.mutateAsync({
            orderId: order.id,
            deliveryDate: finalData.deliveryDate || '',
            operator: user?.accountNo || 'Unknown',
            actorId: user?.id,
            expectedVersion: order.version,
          })
          onOpenChange(false)
          return
        }

        if (isOrderNameOnlyChange) {
          await orderNameChangeMutation.mutateAsync({
            orderId: order.id,
            orderName: finalData.orderName || '',
            operator: user?.accountNo || 'Unknown',
            actorId: user?.id,
            expectedVersion: order.version,
          })
          onOpenChange(false)
          return
        }

        if (isPurchaseOrderNoOnlyChange) {
          await purchaseOrderNoChangeMutation.mutateAsync({
            orderId: order.id,
            purchaseOrderNo: finalData.purchaseOrderNo || '',
            operator: user?.accountNo || 'Unknown',
            actorId: user?.id,
            expectedVersion: order.version,
          })
          onOpenChange(false)
          return
        }

        if (isRequirementsOnlyChange) {
          await requirementsChangeMutation.mutateAsync({
            orderId: order.id,
            requirements: finalData.requirements || '',
            operator: user?.accountNo || 'Unknown',
            actorId: user?.id,
            expectedVersion: order.version,
          })
          onOpenChange(false)
          return
        }

        await patchMutation.mutateAsync({
          id: order.id,
          delta,
          version: order.version,
        })
      } else {
        // 新建订单: 提交全量数据
        const stampedData = auditUtils.stamp(finalData, 'create')
        await createMutation.mutateAsync(stampedData)
      }
      onOpenChange(false)
    } catch (_error) {
      // 错误已由 mutation 的 onError 处理（toast）
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='max-h-[92vh] max-w-[calc(100%-1rem)] overflow-y-auto border-none p-0 shadow-2xl transition-all duration-300 sm:max-w-[95vw] lg:max-w-[1200px]'
      >
        <div className='sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur-sm sm:px-6 sm:py-2.5'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-black uppercase tracking-tight italic sm:text-lg'>
              <ClipboardList className='size-4 text-primary sm:size-5' />
              {order ? t('tradingSalesOrder.dialog.editTitle') : t('tradingSalesOrder.dialog.createTitle')}
            </DialogTitle>
            <DialogDescription className='hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 sm:block'>
              {t('tradingSalesOrder.dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => onOpenChange(false)}
            className='rounded-full transition-colors hover:bg-muted'
          >
            <X className='size-4' />
          </Button>
        </div>

        <div className='space-y-4 px-6 pb-6 pt-1'>
          <OrderHeaderFields
            formData={formData}
            setFormData={setFormData}
            customers={customers}
            onClassificationChange={handleClassificationChange}
          />

          <OrderLinesEditor
            lines={formData.lines || []}
            products={products}
            dictEntries={dictEntries}
            units={units}
            drillingOptions={drillingOptions}
            labelingOptions={labelingOptions}
            currency={formData.currency}
            onAddLine={handleAddLine}
            onRemoveLine={handleRemoveLine}
            onLineChange={updateLine}
          />

          <section className='grid gap-2'>
            <Label className='flex items-center gap-2 pl-1 text-[10px] font-black uppercase text-secondary'>
              <Tag className='size-3' />
              {t('tradingSalesOrder.dialog.memoLabel')}
            </Label>
            <Textarea
              placeholder={t('tradingSalesOrder.dialog.memoPlaceholder')}
              rows={3}
              className='resize-none rounded-[24px] border-muted/60 p-3 text-xs font-medium leading-relaxed transition-shadow focus:shadow-xl'
              value={formData.requirements}
              onChange={(e) => setFormData((prev: Partial<SalesOrder>) => ({ ...prev, requirements: e.target.value }))}
            />
          </section>
        </div>

        <OrderFooterStats formData={formData} onCancel={() => onOpenChange(false)} onSave={handleActualSave} />
      </DialogContent>
    </Dialog>
  )
}
