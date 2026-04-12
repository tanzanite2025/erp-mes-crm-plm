import { useQuery } from '@tanstack/react-query'
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
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
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
  const { data: customers = [] } = useGetCustomers({ enabled: open })
  const { data: products = [] } = useGetProducts({ enabled: open })
  const { units = [] } = useUnitsQuery({ enabled: open })
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
