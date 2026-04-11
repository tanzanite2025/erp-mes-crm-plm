import { useMemo } from 'react'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useAuthStore } from '@/stores/auth-store'
import { type PurchaseOrder } from '../../data/schema'
import { useGetPurchaseOrderDetail, usePurchaseOrderMutations } from '../../purchase'
import { useGetSuppliers } from '../../supplier'
import { usePurchaseOrderForm } from '../../hooks/use-purchase-order-form'
import { usePurchaseOrderDialogResources } from '../../hooks/use-purchase-order-dialog-resources'
import { PurchaseOrderHeaderFields } from './parts/purchase-order-header-fields'
import { PurchaseOrderLinesEditor } from './parts/purchase-order-lines-editor'
import { PurchaseOrderActionDialogShell } from './purchase-order-action-dialog-shell'

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
  const { units, materials, isMetaLoading } = usePurchaseOrderDialogResources(open)

  const { formData, handleHeaderChange, handleAddLine, handleRemoveLine, updateLine, validate, prepareSubmitData, commit } =
    usePurchaseOrderForm(activeOrder, open)

  const { createMutation, saveMutation } = usePurchaseOrderMutations()

  const handleSave = async () => {
    if (!allowsAction('action_trading_purchase_order_manage')) return
    if (!validate()) return

    try {
      const preparedData = prepareSubmitData()

      if (activeOrder && summaryOrder) {
        // SDRTS: 提交增量
        const delta = commit()
        if (Object.keys(delta).length === 0) {
          onOpenChange(false)
          return
        }

        if (activeOrder.version === undefined || activeOrder.version === null) {
          throw new Error(`[CRITICAL] Missing version for SDRTS Patch on PurchaseOrder ${activeOrder.id}`)
        }

        await saveMutation.mutateAsync({
          orderId: activeOrder.id,
          delta,
          finalData: preparedData,
          operator: user?.accountNo || 'Unknown',
          actorId: user?.id,
          expectedVersion: activeOrder.version,
        })
      } else {
        // 新建采购单
        await createMutation.mutateAsync(preparedData)
      }
      onOpenChange(false)
    } catch (_error) {
      // 错误已处理
    }
  }

  const isDataLoading = isMetaLoading || (!!summaryOrder && isDetailLoading)
  const dialogTitle = summaryOrder
    ? t('purchase.orders.dialogEditTitle')
    : t('purchase.orders.dialogCreateTitle')
  const totalAmount = useMemo(() => (formData.amount?.toLocaleString() ?? '0'), [formData.amount])

  return (
    <PurchaseOrderActionDialogShell
      open={open}
      title={dialogTitle}
      description={t('purchase.orders.dialogDescription')}
      totalLabel={t('purchase.orders.dialogTotal')}
      totalAmount={totalAmount}
      currency={formData.currency || 'CNY'}
      isLoading={isDataLoading}
      syncingText={t('purchase.orders.dialogSyncing')}
      cancelText={t('purchase.orders.dialogCancel')}
      saveText={t('purchase.orders.dialogSave')}
      onOpenChange={onOpenChange}
      onSave={handleSave}
    >
      <PurchaseOrderHeaderFields
        formData={formData}
        handleHeaderChange={handleHeaderChange}
        suppliers={suppliers}
        onEvidencesChange={(evidences) => {
          handleHeaderChange('evidences', evidences)
        }}
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
    </PurchaseOrderActionDialogShell>
  )
}
