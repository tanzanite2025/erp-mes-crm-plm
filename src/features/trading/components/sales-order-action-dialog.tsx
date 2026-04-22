import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Loader2, X } from 'lucide-react'
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
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import { DocumentFooterStats } from '@/features/sales-document/components/document-footer-stats'
import { DocumentHeaderFields } from '@/features/sales-document/components/document-header-fields'
import { DocumentLinesEditor } from '@/features/sales-document/components/document-lines-editor'
import { DocumentNotesSection } from '@/features/sales-document/components/document-notes-section'
import { PRODUCT_APPEARANCES_QUERY_KEY } from '@/features/engineering/query-keys'
import { productAppearanceService } from '@/features/engineering/services/product-appearance-service'
import {
  ENGINEERING_DB_DRILLING_QUERY_KEY,
  ENGINEERING_DB_LABELING_QUERY_KEY,
} from '@/features/engineering-db/query-keys'
import { ProductionDBService } from '@/features/engineering-db/services/production-db-service'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { type SalesOrder } from '../data/schema'
import { useGetCustomers } from '../customer'
import { useSalesOrderDrawingOptions } from '../hooks/use-sales-order-drawing-options'
import { useSalesOrderForm } from '../hooks/use-sales-order-form'
import { useSalesOrderSave } from '../hooks/use-sales-order-save'

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
  const { data: customers = [] } = useGetCustomers({ enabled: open })
  const { data: products = [] } = useGetProducts({ enabled: open })
  const { units = [] } = useUnitsQuery({ enabled: open })
  const appearancesQuery = useQuery({
    queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
    queryFn: () => productAppearanceService.getProductAppearances(),
    enabled: open,
  })
  const drillingQuery = useQuery({
    queryKey: ENGINEERING_DB_DRILLING_QUERY_KEY,
    queryFn: () => ProductionDBService.getDrilling(),
    enabled: open,
  })
  const labelingQuery = useQuery({
    queryKey: ENGINEERING_DB_LABELING_QUERY_KEY,
    queryFn: () => ProductionDBService.getLabeling(),
    enabled: open,
  })

  const drillingOptions = useSalesOrderDrawingOptions(drillingQuery.data)
  const labelingOptions = useSalesOrderDrawingOptions(labelingQuery.data)

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
  } = useSalesOrderForm(order, open)

  const { handleSave } = useSalesOrderSave({
    order,
    validate,
    prepareToSave,
    commit,
    onSaved: () => onOpenChange(false),
  })

  const handleActualSave = async () => {
    if (!allowsAction('action_trading_sales_order_manage')) return
    await handleSave()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        showCloseButton={false}
        className='max-h-[92vh] w-[95vw] max-w-[95vw] overflow-y-auto border-none p-0 shadow-2xl transition-all duration-300 sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw]'
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

        {isInitializing ? (
          <div className='flex min-h-[420px] flex-col items-center justify-center gap-3 px-6 py-12 opacity-60'>
            <Loader2 className='size-8 animate-spin text-primary' />
            <p className='text-[10px] font-black uppercase tracking-widest'>
              {t('tradingSalesOrder.detail.loading')}
            </p>
          </div>
        ) : initError ? (
          <div className='px-6 py-6'>
            <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-rose-300/50 bg-rose-50/40 px-6 text-center'>
              <p className='text-[10px] font-black uppercase tracking-[0.3em] text-rose-600'>
                {t('tradingSalesOrder.toasts.saveFailed')}
              </p>
              <p className='mt-3 max-w-xl text-xs font-bold text-rose-700/80'>
                {initError instanceof Error ? initError.message : t('tradingSalesOrder.toasts.saveFailed')}
              </p>
              <Button
                variant='outline'
                className='mt-5 rounded-full border-dashed px-8 text-[10px] font-black uppercase tracking-widest'
                onClick={() => void retryInit()}
              >
                {t('common.actions.retry')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className='space-y-4 px-6 pb-6 pt-1'>
              <DocumentHeaderFields
                formData={formData}
                setFormData={setFormData}
                customers={customers}
                onClassificationChange={handleClassificationChange}
              />

              <DocumentLinesEditor
                appearances={appearancesQuery.data ?? []}
                lines={formData.lines || []}
                products={products}
                units={units}
                drillingOptions={drillingOptions}
                labelingOptions={labelingOptions}
                currency={formData.currency}
                onAddLine={handleAddLine}
                onRemoveLine={handleRemoveLine}
                onLineChange={updateLine}
              />

              <DocumentNotesSection
                value={formData.requirements || ''}
                onChange={(value) => setFormData((prev) => ({ ...prev, requirements: value }))}
              />
            </div>

            <DocumentFooterStats formData={formData} onCancel={() => onOpenChange(false)} onSave={handleActualSave} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
