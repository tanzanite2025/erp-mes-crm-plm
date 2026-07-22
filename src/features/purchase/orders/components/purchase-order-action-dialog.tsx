import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { requireCommandActor } from '@/lib/command-actor'
import { useLanguage } from '@/context/language-provider'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { MaterialUpsertDialog } from '@/features/material-archive/components/material-upsert-dialog'
import { useGetSuppliers } from '@/features/purchase/suppliers'
import { getPurchaseStatusDisplayMeta } from '../data/purchase-status'
import { type PurchaseOrder, type PurchaseOrderListItem } from '../data/schema'
import { usePurchaseOrderDialogResources } from '../hooks/use-purchase-order-dialog-resources'
import { usePurchaseOrderForm } from '../hooks/use-purchase-order-form'
import { usePurchaseOrderMaterialShortcuts } from '../hooks/use-purchase-order-material-shortcuts'
import { usePurchaseOrderSavePreparation } from '../hooks/use-purchase-order-save-preparation'
import {
  useGetPurchaseOrderDetail,
  usePurchaseOrderMutations,
} from '../hooks/use-purchase-orders'
import { PurchaseOrderEvidenceSection } from './parts/purchase-order-evidence-section'
import { PurchaseOrderHeaderFields } from './parts/purchase-order-header-fields'
import { PurchaseOrderLinesEditor } from './parts/purchase-order-lines-editor'
import { PurchaseOrderActionDialogShell } from './purchase-order-action-dialog-shell'

function isDetailedPurchaseOrder(
  order?: PurchaseOrder | PurchaseOrderListItem | null
): order is PurchaseOrder {
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
  const { allowsAction } = usePermissionActions()
  const user = useAuthStore((state) => state.user)
  const { data: suppliers = [] } = useGetSuppliers({ enabled: open })
  const { data: detailedOrder } = useGetPurchaseOrderDetail(
    summaryOrder?.id || ''
  )

  const activeOrder =
    detailedOrder ||
    (isDetailedPurchaseOrder(summaryOrder) ? summaryOrder : null)
  const { materials, isMetaLoading } = usePurchaseOrderDialogResources(open)

  const {
    formData,
    handleHeaderChange,
    handleAddLine,
    handleRemoveLine,
    updateLine,
    validate,
    commit,
    isFinanceLoading,
  } = usePurchaseOrderForm(activeOrder, open)
  const { prepareSaveExecution } = usePurchaseOrderSavePreparation({
    initialOrder: activeOrder,
    formData,
    commit,
  })

  const { createMutation, saveMutation } = usePurchaseOrderMutations()
  const materialShortcuts = usePurchaseOrderMaterialShortcuts({
    lines: formData.lines || [],
    updateLine,
  })

  const handleSave = async () => {
    if (!allowsAction('action_trading_purchase_order_manage')) return
    if (!validate()) return

    try {
      const saveExecution = prepareSaveExecution()

      if (saveExecution.mode === 'noop') {
        onOpenChange(false)
      } else if (saveExecution.mode === 'update') {
        const actor = requireCommandActor(
          { operator: user?.accountNo, actorId: user?.id },
          'PurchaseOrderActionDialog.handleSave'
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

  const isDataLoading =
    isMetaLoading || isFinanceLoading || (!!summaryOrder && !activeOrder)
  const dialogTitle = summaryOrder
    ? t('purchase.orders.dialogEditTitle')
    : t('purchase.orders.dialogCreateTitle')
  const totalAmount = useMemo(
    () => formData.amount?.toLocaleString() ?? '0',
    [formData.amount]
  )
  const statusMeta = useMemo(
    () => getPurchaseStatusDisplayMeta(formData.status || 'Draft', t),
    [formData.status, t]
  )

  return (
    <PurchaseOrderActionDialogShell
      open={open}
      title={dialogTitle}
      description={t('purchase.orders.dialogDescription')}
      headerAccessory={
        <>
          {formData.orderNo ? (
            <span className='font-mono text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
              {formData.orderNo}
            </span>
          ) : null}
          <AuditStatusDisplay meta={statusMeta} badgeClassName='px-3 py-1.5' />
          {activeOrder?.id ? (
            <AuditTimelineTriggerButton
              module={AUDIT_MODULES.purchaseOrder}
              targetId={activeOrder.id}
              targetName={activeOrder.orderNo}
              iconOnly
              className='size-9 rounded-full border-dashed'
            />
          ) : null}
        </>
      }
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
      />

      <PurchaseOrderLinesEditor
        lines={formData.lines || []}
        materials={materials}
        isLoading={isDataLoading}
        canMaintainMaterials={materialShortcuts.canMaintainMaterials}
        canOpenMaterialArchive={materialShortcuts.canOpenMaterialArchive}
        currency={formData.currency || 'CNY'}
        onAddLine={handleAddLine}
        onCreateMaterialForLine={materialShortcuts.openMaterialCreateDialog}
        onOpenMaterialArchive={materialShortcuts.openMaterialArchive}
        onRemoveLine={handleRemoveLine}
        onLineChange={updateLine}
      />

      <PurchaseOrderEvidenceSection
        evidences={formData.evidences || []}
        onChange={(evidences) => {
          handleHeaderChange('evidences', evidences)
        }}
      />

      <MaterialUpsertDialog
        open={materialShortcuts.isMaterialCreateDialogOpen}
        onOpenChange={materialShortcuts.handleMaterialCreateDialogOpenChange}
        material={null}
        onSave={materialShortcuts.saveMaterialAndFillPurchaseLine}
      />
    </PurchaseOrderActionDialogShell>
  )
}
