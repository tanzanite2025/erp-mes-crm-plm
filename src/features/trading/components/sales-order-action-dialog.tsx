import { ClipboardList, Loader2, X } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { DocumentFooterStats } from '@/features/sales-document/components/document-footer-stats'
import { DocumentHeaderFields } from '@/features/sales-document/components/document-header-fields'
import { DocumentLinesEditor } from '@/features/sales-document/components/document-lines-editor'
import { useSalesDocumentReferenceResources } from '@/features/sales-document/hooks/use-sales-document-reference-resources'
import { DocumentNotesSection } from '@/features/sales-document/components/document-notes-section'
import { createLogger } from '@/lib/logger'
import { type SalesOrder } from '../data/schema'
import { useSalesOrderForm } from '../hooks/use-sales-order-form'
import { useSalesOrderSave } from '../hooks/use-sales-order-save'
import { isSalesOrderSnapshotOnly } from '../utils/sales-order-actions'

const logger = createLogger('SalesOrderActionDialog')

interface SalesOrderActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: SalesOrder | null
  onSaved?: (order: SalesOrder) => void
}

export function SalesOrderActionDialog({
  open,
  onOpenChange,
  order,
  onSaved,
}: SalesOrderActionDialogProps) {
  const { t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const {
    readResource: dialogResource,
    resources: dialogResources,
    retry: retryResources,
  } = useSalesDocumentReferenceResources({
    enabled: open,
    scope: 'SalesOrderActionDialog',
  })
  const readOnlySnapshot = isSalesOrderSnapshotOnly(order)

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
    isInitializing,
    initError,
    retryInit,
  } = useSalesOrderForm(
    order,
    open,
    dialogResources.products,
    dialogResources.productDisplayProjectionMap,
    dialogResources.drillingOptions,
    dialogResources.labelingOptions,
    dialogResources.engineeringSpecs
  )

  const { handleSave } = useSalesOrderSave({
    order,
    validate,
    prepareToSave,
    commit,
    canSave: !readOnlySnapshot,
    onSaved: (savedOrder) => {
      onSaved?.(savedOrder)
      onOpenChange(false)
    },
  })

  const handleActualSave = async () => {
    if (!allowsAction('action_trading_sales_order_manage')) return
    await handleSave()
  }

  const handleRetryResources = () => {
    void retryResources().catch((error) => {
      logger.error('Failed to retry sales order dialog resources', error)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        showCloseButton={false}
        className='max-h-[95vh] w-[95vw] max-w-[95vw] overflow-y-auto border-none p-0 shadow-2xl transition-all duration-300 sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw]'
      >
        <div className='sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-background/95 px-4 py-2 backdrop-blur-sm sm:px-6 sm:py-2.5'>
          <DialogHeader className='min-w-0 flex-1 gap-1 sm:flex-row sm:items-center sm:gap-3'>
            <DialogTitle className='flex shrink-0 items-center gap-2 text-base font-black tracking-tight uppercase italic sm:text-lg'>
              <ClipboardList className='size-4 text-primary sm:size-5' />
              {order
                ? t('tradingSalesOrder.dialog.editTitle')
                : t('tradingSalesOrder.dialog.createTitle')}
            </DialogTitle>
            <DialogDescription className='hidden min-w-0 truncate text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase sm:block'>
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

        {dialogResource.status === 'error' ? (
          <div className='px-6 py-6'>
            <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-rose-300/50 bg-rose-50/40 px-6 text-center'>
              <p className='text-[10px] font-black tracking-[0.3em] text-rose-600 uppercase'>
                订单弹窗基础数据加载失败
              </p>
              <p className='mt-3 max-w-xl text-xs font-bold text-rose-700/80'>
                {dialogResource.error.message || '请重试后再加载客户、产品与单位字典。'}
              </p>
              <Button
                variant='outline'
                className='mt-5 rounded-full border-dashed px-8 text-[10px] font-black tracking-widest uppercase'
                onClick={handleRetryResources}
              >
                {t('common.actions.retry')}
              </Button>
            </div>
          </div>
        ) : dialogResource.status === 'loading' || isInitializing ? (
          <div className='flex min-h-[420px] flex-col items-center justify-center gap-3 px-6 py-12 opacity-60'>
            <Loader2 className='size-8 animate-spin text-primary' />
            <p className='text-[10px] font-black tracking-widest uppercase'>
              {t('tradingSalesOrder.detail.loading')}
            </p>
          </div>
        ) : initError ? (
          <div className='px-6 py-6'>
            <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-rose-300/50 bg-rose-50/40 px-6 text-center'>
              <p className='text-[10px] font-black tracking-[0.3em] text-rose-600 uppercase'>
                {t('tradingSalesOrder.toasts.saveFailed')}
              </p>
              <p className='mt-3 max-w-xl text-xs font-bold text-rose-700/80'>
                {initError instanceof Error
                  ? initError.message
                  : t('tradingSalesOrder.toasts.saveFailed')}
              </p>
              <Button
                variant='outline'
                className='mt-5 rounded-full border-dashed px-8 text-[10px] font-black tracking-widest uppercase'
                onClick={() => void retryInit()}
              >
                {t('common.actions.retry')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <fieldset
              disabled={readOnlySnapshot}
              className='space-y-3 px-6 pt-1 pb-2 disabled:cursor-not-allowed disabled:opacity-75'
            >
              <DocumentHeaderFields
                formData={formData}
                setFormData={setFormData}
                customers={dialogResources.customers}
                onClassificationChange={handleClassificationChange}
                readOnly={readOnlySnapshot}
                compactEvidence
                denseContractFields
              />

              <DocumentLinesEditor
                appearances={dialogResources.appearances}
                lines={formData.lines || []}
                products={dialogResources.products}
                productDisplayLabelMap={dialogResources.productDisplayLabelMap}
                productDisplayProjectionMap={dialogResources.productDisplayProjectionMap}
                units={dialogResources.units}
                drillingOptions={dialogResources.drillingOptions}
                labelingOptions={dialogResources.labelingOptions}
                currency={formData.currency}
                onAddLine={handleAddLine}
                onRemoveLine={handleRemoveLine}
                onLineChange={updateLine}
                readOnly={readOnlySnapshot}
              />

              <DocumentNotesSection
                value={formData.requirements || ''}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, requirements: value }))
                }
                readOnly={readOnlySnapshot}
              />
            </fieldset>

            <DocumentFooterStats
              formData={formData}
              onCancel={() => onOpenChange(false)}
              onSave={handleActualSave}
              canSave={!readOnlySnapshot}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
