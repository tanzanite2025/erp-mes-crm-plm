import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import type { Unit } from '@/features/basic-settings/services/unit-service'
import {
  ENGINEERING_DB_DRILLING_QUERY_KEY,
  ENGINEERING_DB_LABELING_QUERY_KEY,
} from '@/features/engineering-db/query-keys'
import type { DrillingPlan, LabelingDraft } from '@/features/engineering-db/data/schema'
import { ProductionDBService } from '@/features/engineering-db/services/production-db-service'
import type { ProductAppearance } from '@/features/engineering/data/product-appearance'
import type { Product } from '@/features/engineering/data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { PRODUCT_APPEARANCES_QUERY_KEY } from '@/features/engineering/query-keys'
import { productAppearanceService } from '@/features/engineering/services/product-appearance-service'
import { DocumentFooterStats } from '@/features/sales-document/components/document-footer-stats'
import { DocumentHeaderFields } from '@/features/sales-document/components/document-header-fields'
import { DocumentLinesEditor } from '@/features/sales-document/components/document-lines-editor'
import { DocumentNotesSection } from '@/features/sales-document/components/document-notes-section'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { useGetCustomers } from '../customer'
import { type Customer, type SalesOrder } from '../data/schema'
import { useSalesOrderDrawingOptions } from '../hooks/use-sales-order-drawing-options'
import { useSalesOrderForm } from '../hooks/use-sales-order-form'
import { useSalesOrderSave } from '../hooks/use-sales-order-save'
import { isSalesOrderSnapshotOnly } from '../utils/sales-order-actions'

const logger = createLogger('SalesOrderActionDialog')

type SalesOrderActionDialogResource = CompositeReadResource<{
  customers: Customer[]
  products: Product[]
  units: Unit[]
  appearances: ProductAppearance[]
  drillingPlans: DrillingPlan[]
  labelingPlans: LabelingDraft[]
}>

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
  const customersQuery = useGetCustomers({ enabled: open })
  const productsQuery = useGetProducts({ enabled: open })
  const { readResource: unitsResource, refetch: refetchUnits } = useUnitsQuery({ enabled: open })
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

  const dialogResource = useMemo<SalesOrderActionDialogResource>(() => {
    if (!open) {
      return {
        status: 'ready',
        customers: [],
        products: [],
        units: [],
        appearances: [],
        drillingPlans: [],
        labelingPlans: [],
      }
    }

    const customersFailure = resolveQueryFailure({
      data: customersQuery.data,
      error: customersQuery.error,
      isPending: customersQuery.isPending,
      scope: 'SalesOrderActionDialog.customers',
      missingMessage: '[CRITICAL] Sales order customers missing after load',
      failureMessage: '[CRITICAL] Sales order customers query failed',
    })
    if (customersFailure) {
      return {
        status: 'error',
        error: customersFailure.error,
        scope: customersFailure.scope,
      }
    }

    const productsFailure = resolveQueryFailure({
      data: productsQuery.data,
      error: productsQuery.error,
      isPending: productsQuery.isPending,
      scope: 'SalesOrderActionDialog.products',
      missingMessage: '[CRITICAL] Sales order products missing after load',
      failureMessage: '[CRITICAL] Sales order products query failed',
    })
    if (productsFailure) {
      return {
        status: 'error',
        error: productsFailure.error,
        scope: productsFailure.scope,
      }
    }

    if (unitsResource.status === 'error') {
      return {
        status: 'error',
        error: unitsResource.error,
        scope: unitsResource.scope,
      }
    }

    const appearancesFailure = resolveQueryFailure({
      data: appearancesQuery.data,
      error: appearancesQuery.error,
      isPending: appearancesQuery.isPending,
      scope: 'SalesOrderActionDialog.appearances',
      missingMessage: '[CRITICAL] Sales order appearances missing after load',
      failureMessage: '[CRITICAL] Sales order appearances query failed',
    })
    if (appearancesFailure) {
      return {
        status: 'error',
        error: appearancesFailure.error,
        scope: appearancesFailure.scope,
      }
    }

    const drillingFailure = resolveQueryFailure({
      data: drillingQuery.data,
      error: drillingQuery.error,
      isPending: drillingQuery.isPending,
      scope: 'SalesOrderActionDialog.drilling',
      missingMessage: '[CRITICAL] Sales order drilling plans missing after load',
      failureMessage: '[CRITICAL] Sales order drilling plans query failed',
    })
    if (drillingFailure) {
      return {
        status: 'error',
        error: drillingFailure.error,
        scope: drillingFailure.scope,
      }
    }

    const labelingFailure = resolveQueryFailure({
      data: labelingQuery.data,
      error: labelingQuery.error,
      isPending: labelingQuery.isPending,
      scope: 'SalesOrderActionDialog.labeling',
      missingMessage: '[CRITICAL] Sales order labeling drafts missing after load',
      failureMessage: '[CRITICAL] Sales order labeling drafts query failed',
    })
    if (labelingFailure) {
      return {
        status: 'error',
        error: labelingFailure.error,
        scope: labelingFailure.scope,
      }
    }

    if (
      customersQuery.isPending ||
      productsQuery.isPending ||
      unitsResource.status === 'loading' ||
      appearancesQuery.isPending ||
      drillingQuery.isPending ||
      labelingQuery.isPending
    ) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      customers: (customersQuery.data as Customer[]) ?? [],
      products: (productsQuery.data as Product[]) ?? [],
      units: unitsResource.status === 'ready' ? unitsResource.data : [],
      appearances: (appearancesQuery.data as ProductAppearance[]) ?? [],
      drillingPlans: (drillingQuery.data as DrillingPlan[]) ?? [],
      labelingPlans: (labelingQuery.data as LabelingDraft[]) ?? [],
    }
  }, [
    appearancesQuery.data,
    appearancesQuery.error,
    appearancesQuery.isPending,
    customersQuery.data,
    customersQuery.error,
    customersQuery.isPending,
    drillingQuery.data,
    drillingQuery.error,
    drillingQuery.isPending,
    labelingQuery.data,
    labelingQuery.error,
    labelingQuery.isPending,
    open,
    productsQuery.data,
    productsQuery.error,
    productsQuery.isPending,
    unitsResource,
  ])

  useEffect(() => {
    if (dialogResource.status !== 'error') {
      return
    }

    logger.error(`Failed to load sales order dialog resources: ${dialogResource.scope}`, dialogResource.error)
    failLoudly(dialogResource.error, dialogResource.scope)
  }, [dialogResource])

  const customers = dialogResource.status === 'ready' ? dialogResource.customers : []
  const products = dialogResource.status === 'ready' ? dialogResource.products : []
  const units = dialogResource.status === 'ready' ? dialogResource.units : []
  const appearances = dialogResource.status === 'ready' ? dialogResource.appearances : []
  const drillingOptions = useSalesOrderDrawingOptions(
    dialogResource.status === 'ready' ? dialogResource.drillingPlans : undefined
  )
  const labelingOptions = useSalesOrderDrawingOptions(
    dialogResource.status === 'ready' ? dialogResource.labelingPlans : undefined
  )
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
  } = useSalesOrderForm(order, open, products)

  const { handleSave } = useSalesOrderSave({
    order,
    validate,
    prepareToSave,
    commit,
    canSave: !readOnlySnapshot,
    onSaved: () => onOpenChange(false),
  })

  const handleActualSave = async () => {
    if (!allowsAction('action_trading_sales_order_manage')) return
    await handleSave()
  }

  const handleRetryResources = () => {
    void Promise.all([
      customersQuery.refetch(),
      productsQuery.refetch(),
      refetchUnits(),
      appearancesQuery.refetch(),
      drillingQuery.refetch(),
      labelingQuery.refetch(),
    ])
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
                订单弹窗基础字典加载失败
              </p>
              <p className='mt-3 max-w-xl text-xs font-bold text-rose-700/80'>
                {dialogResource.error.message || '请重试后再加载客户、产品与工艺字典。'}
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
                customers={customers}
                onClassificationChange={handleClassificationChange}
                readOnly={readOnlySnapshot}
                compactEvidence
                denseContractFields
              />

              <DocumentLinesEditor
                appearances={appearances}
                lines={formData.lines || []}
                products={products}
                units={units}
                drillingOptions={drillingOptions}
                labelingOptions={labelingOptions}
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
