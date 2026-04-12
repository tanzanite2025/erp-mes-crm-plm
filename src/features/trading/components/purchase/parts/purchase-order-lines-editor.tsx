import { Package, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/language-provider'
import { type MaterialOption } from '@/features/material-archive/data/schema'
import { type Unit } from '@/features/basic-settings/services/unit-service'
import { type PurchaseOrderLine } from '../../../data/schema'
import { usePurchaseOrderLinesEditorViewModel } from '../../../hooks/use-purchase-order-lines-editor-view-model'

interface PurchaseOrderLinesEditorProps {
  lines: PurchaseOrderLine[]
  units: Unit[]
  materials: MaterialOption[]
  isLoading?: boolean
  currency: string
  onAddLine: () => void
  onRemoveLine: (index: number) => void
  onLineChange: (
    index: number,
    field: keyof PurchaseOrderLine,
    value: PurchaseOrderLineFieldValue,
    extraData?: Partial<PurchaseOrderLine>
  ) => void
}

export function PurchaseOrderLinesEditor({
  lines,
  units,
  materials = [],
  isLoading,
  currency,
  onAddLine,
  onRemoveLine,
  onLineChange,
}: PurchaseOrderLinesEditorProps) {
  const { t } = useLanguage()
  const { materialOptions, unitOptions, handleMaterialSelect } = usePurchaseOrderLinesEditorViewModel({
    units,
    materials,
    lines,
    onLineChange,
  })

  return (
    <section className='space-y-4'>
      <div className='flex items-center justify-between px-2'>
        <h3 className='flex items-center gap-2 text-sm font-black uppercase tracking-tighter text-slate-800 italic dark:text-slate-200'>
          <Package className='size-4 text-primary' />
          {t('purchase.orders.linesEditor.title')}
        </h3>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onAddLine}
          className='h-7 rounded-lg border-dashed text-[10px] font-black uppercase hover:bg-primary/5 hover:text-primary'
        >
          <Plus className='mr-1 size-3' />
          {t('purchase.orders.linesEditor.addLine')}
        </Button>
      </div>

      <div className='space-y-3'>
        {lines.map((line, index) => (
          <Card
            key={index}
            className='rounded-[28px] border-none bg-background/60 p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 hover:shadow-xl'
          >
            <div className='grid grid-cols-1 items-end gap-3 md:grid-cols-12 md:gap-4'>
              <div className='flex flex-col items-start gap-3 md:col-span-4 md:flex-row md:items-end'>
                <div className='mb-1 hidden size-8 shrink-0 items-center justify-center rounded-full bg-muted/50 md:flex'>
                  <span className='text-[11px] font-black'>{line.lineNo}</span>
                </div>
                <div className='w-full space-y-1.5'>
                  <Label className='ml-1 text-[9px] font-black uppercase opacity-60'>
                    {t('purchase.orders.linesEditor.materialName')}
                  </Label>
                  <Combobox
                    options={materialOptions}
                    value={line.materialId}
                    onValueChange={(value) => handleMaterialSelect(index, value)}
                    isLoading={isLoading}
                    placeholder={t('purchase.orders.linesEditor.materialPlaceholder')}
                    searchPlaceholder={t('purchase.orders.linesEditor.materialSearchPlaceholder')}
                    emptyText={t('purchase.orders.linesEditor.materialEmpty')}
                    className='h-10 w-full rounded-xl border-none bg-muted/20 font-bold md:h-9'
                  />
                </div>
              </div>

              <div className='space-y-1.5 md:col-span-3'>
                <Label className='ml-1 text-[9px] font-black uppercase opacity-60'>
                  {t('purchase.orders.linesEditor.codeSpec')}
                </Label>
                <Input
                  placeholder={t('purchase.orders.linesEditor.codeSpecPlaceholder')}
                  value={line.materialCode}
                  onChange={(e) => onLineChange(index, 'materialCode', e.target.value)}
                  className='h-10 rounded-xl border-none bg-muted/20 font-bold md:h-9'
                />
              </div>

              <div className='grid grid-cols-2 gap-3 md:col-span-2'>
                <div className='space-y-1.5'>
                  <Label className='ml-1 truncate text-[9px] font-black uppercase opacity-60'>
                    {t('purchase.orders.linesEditor.qty')}
                  </Label>
                  <Input
                    type='number'
                    value={line.qty}
                    onChange={(e) => onLineChange(index, 'qty', Number(e.target.value))}
                    className='h-10 rounded-xl border-none bg-muted/20 text-right font-black md:h-9'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label className='ml-1 truncate text-[9px] font-black uppercase opacity-60'>
                    {t('purchase.orders.linesEditor.unit')}
                  </Label>
                  <Combobox
                    options={unitOptions}
                    value={line.uom}
                    onValueChange={(value) => onLineChange(index, 'uom', value)}
                    isLoading={isLoading}
                    placeholder={t('purchase.orders.linesEditor.unitPlaceholder')}
                    searchPlaceholder={t('purchase.orders.linesEditor.unitSearchPlaceholder')}
                    emptyText={t('purchase.orders.linesEditor.unitEmpty')}
                    className='h-10 rounded-xl border-none bg-muted/20 font-bold md:h-9'
                  />
                </div>
              </div>

              <div className='flex items-end gap-3 md:col-span-3'>
                <div className='flex-1 space-y-1.5'>
                  <Label className='ml-1 truncate text-[9px] font-black uppercase opacity-60'>
                    {t('purchase.orders.linesEditor.price')} ({currency})
                  </Label>
                  <Input
                    type='number'
                    value={line.price}
                    onChange={(e) => onLineChange(index, 'price', Number(e.target.value))}
                    className='h-10 rounded-xl border-none bg-muted/20 text-right font-black md:h-9'
                  />
                </div>
                <div className='w-20 pb-2 text-right md:w-auto'>
                  <p className='mb-1 text-[8px] font-black uppercase opacity-40'>
                    {t('purchase.orders.linesEditor.subtotal')}
                  </p>
                  <p className='truncate text-[12px] font-black tabular-nums text-primary md:text-[13px]'>
                    {line.amount.toLocaleString()}
                  </p>
                </div>
                <div className='pb-1'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => onRemoveLine(index)}
                    className='size-8 rounded-full text-destructive transition-colors hover:bg-destructive/10 md:size-9'
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
