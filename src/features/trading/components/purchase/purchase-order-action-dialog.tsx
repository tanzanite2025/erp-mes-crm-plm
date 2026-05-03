import { useMemo } from 'react'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useAuthStore } from '@/stores/auth-store'
import { type PurchaseOrder, type PurchaseOrderListItem } from '../../data/schema'
import { useGetPurchaseOrderDetail, usePurchaseOrderMutations } from '../../purchase'
import { useGetSuppliers } from '../../supplier'
import { usePurchaseOrderForm } from '../../hooks/use-purchase-order-form'
import { usePurchaseOrderDialogResources } from '../../hooks/use-purchase-order-dialog-resources'
import { usePurchaseOrderSavePreparation } from '../../hooks/use-purchase-order-save-preparation'
import { requireTradingCommandActor } from '../../utils/command-actor'
import { PurchaseOrderHeaderFields } from './parts/purchase-order-header-fields'
import { PurchaseOrderLinesEditor } from './parts/purchase-order-lines-editor'
import { PurchaseOrderActionDialogShell } from './purchase-order-action-dialog-shell'

function isDetailedPurchaseOrder(order?: PurchaseOrder | PurchaseOrderListItem | null): order is PurchaseOrder {
  return Boolean(order && 'lines' in order && Array.isArray(order.lines))
}

interface PurchaseOrderActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: PurchaseOrder | PurchaseOrderListItem | null
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
  const { data: detailedOrder } = useGetPurchaseOrderDetail(
    summaryOrder?.id || ''
  )

  const activeOrder = detailedOrder || (isDetailedPurchaseOrder(summaryOrder) ? summaryOrder : null)
  const { units, materials, isMetaLoading } = usePurchaseOrderDialogResources(open)

  const { formData, handleHeaderChange, handleAddLine, handleRemoveLine, updateLine, validate, commit, isFinanceLoading } =
    usePurchaseOrderForm(activeOrder, open)
  const { prepareSaveExecution } = usePurchaseOrderSavePreparation({
    initialOrder: activeOrder,
    formData,
    commit,
  })

  const { createMutation, saveMutation } = usePurchaseOrderMutations()

  const handleSave = async () => {
    if (!allowsAction('action_trading_purchase_order_manage')) return
    if (!validate()) return

    try {
      const saveExecution = prepareSaveExecution()

      if (saveExecution.mode === 'noop') {
          onOpenChange(false)
      } else if (saveExecution.mode === 'update') {
        const actor = requireTradingCommandActor(
          { operator: user?.accountNo, actorId: user?.id },
          'PurchaseOrderActionDialog.handleSave',
        )
        await saveMutation.mutateAsync({
          orderId: saveExecution.orderId,
          delta: saveExecution.delta,
          finalData: saveExecution.submitValues,
          operator: actor.operator,
          actorId: actor.actorId,
          expectedVersion: saveExecution.expectedVersion,
        })
      } else {
        await createMutation.mutateAsync(saveExecution.submitValues)
      }
      onOpenChange(false)
    } catch (_error) {
      // 错误已处理
    }
  }

  const isDataLoading = isMetaLoading || isFinanceLoading || (!!summaryOrder && !activeOrder)
  const dialogTitle = summaryOrder
    ? t('purchase.orders.dialogEditTitle')
    : t('purchase.orders.dialogCreateTitle')
  const totalAmount = useMemo(() => (formData.amount?.toLocaleString() ?? '0'), [formData.amount])

  return (
    <PurchaseOrderActionDialogShell
      open={open}
      title={
        <div className='flex items-center justify-between gap-3'>
          <span>{dialogTitle}</span>
          {activeOrder?.id ? (
            <AuditTimelineTriggerButton
              module={AUDIT_MODULES.purchaseOrder}
              targetId={activeOrder.id}
              targetName={activeOrder.orderNo}
              iconOnly
              className='size-9 rounded-full border-dashed'
            />
          ) : null}
        </div>
      }
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
