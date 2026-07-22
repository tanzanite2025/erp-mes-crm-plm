import { ExternalLink, Package, Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type MaterialOption } from '@/features/material-archive/data/schema'
import { type PurchaseOrderLine } from '../../data/schema'
import { usePurchaseOrderLinesEditorViewModel } from '../../hooks/use-purchase-order-lines-editor-view-model'

type PurchaseOrderLineFieldValue = PurchaseOrderLine[keyof PurchaseOrderLine]

interface PurchaseOrderLinesEditorProps {
  lines: PurchaseOrderLine[]
  materials: MaterialOption[]
  isLoading?: boolean
  canMaintainMaterials?: boolean
  canOpenMaterialArchive?: boolean
  currency: string
  onAddLine: () => void
  onCreateMaterialForLine?: (index: number) => void
  onOpenMaterialArchive?: () => void
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
  materials = [],
  isLoading,
  canMaintainMaterials = false,
  canOpenMaterialArchive = false,
  currency,
  onAddLine,
  onCreateMaterialForLine,
  onOpenMaterialArchive,
  onRemoveLine,
  onLineChange,
}: PurchaseOrderLinesEditorProps) {
  const { t } = useLanguage()
  const firstEmptyMaterialLineIndex = lines.findIndex(
    (line) => !line.materialId
  )
  const { materialOptions, handleMaterialSelect } =
    usePurchaseOrderLinesEditorViewModel({
      materials,
      lines,
      onLineChange,
    })

  return (
    <section className='space-y-2.5'>
      <div className='flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between'>
        <h3 className='flex items-center gap-2 text-sm font-black tracking-tighter text-slate-800 uppercase italic dark:text-slate-200'>
          <Package className='size-4 text-primary' />
          {t('purchase.orders.linesEditor.title')}
        </h3>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              if (!canMaintainMaterials) return

              const targetLineIndex =
                firstEmptyMaterialLineIndex >= 0
                  ? firstEmptyMaterialLineIndex
                  : lines.length
              if (firstEmptyMaterialLineIndex < 0) {
                onAddLine()
              }
              onCreateMaterialForLine?.(targetLineIndex)
            }}
            disabled={!canMaintainMaterials}
            title={
              !canMaintainMaterials
                ? t('purchase.orders.linesEditor.materialPermissionRequired')
                : t('purchase.orders.linesEditor.createMaterial')
            }
            className='h-7 rounded-lg border-dashed text-[10px] font-black uppercase hover:bg-emerald-500/5 hover:text-emerald-600 disabled:opacity-45'
          >
            <Plus className='mr-1 size-3' />
            {t('purchase.orders.linesEditor.createMaterial')}
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onOpenMaterialArchive}
            disabled={!canOpenMaterialArchive}
            title={
              canOpenMaterialArchive
                ? t('purchase.orders.linesEditor.openMaterialArchive')
                : t('purchase.orders.linesEditor.materialPermissionRequired')
            }
            className='h-7 rounded-lg border-dashed text-[10px] font-black uppercase hover:bg-blue-500/5 hover:text-blue-600 disabled:opacity-45'
          >
            <ExternalLink className='mr-1 size-3' />
            {t('purchase.orders.linesEditor.openMaterialArchive')}
          </Button>
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
      </div>

      <div className='space-y-2'>
        {lines.map((line, index) => {
          const hasCodeOrSpec = Boolean(line.materialCode || line.specification)

          return (
            <Card
              key={index}
              className='rounded-[28px] border-none bg-background/60 p-3 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 hover:shadow-xl'
            >
              <div className='grid grid-cols-1 items-end gap-2.5 md:grid-cols-12 md:gap-3'>
                <div className='flex flex-col items-start gap-2.5 md:col-span-4 md:flex-row md:items-end'>
                  <div className='mb-1 hidden size-8 shrink-0 items-center justify-center rounded-full bg-muted/50 md:flex'>
                    <span className='text-[11px] font-black'>
                      {line.lineNo}
                    </span>
                  </div>
                  <div className='w-full space-y-1.5'>
                    <Label className='ml-1 text-[9px] font-black uppercase opacity-60'>
                      {t('purchase.orders.linesEditor.materialName')}
                    </Label>
                    <Combobox
                      options={materialOptions}
                      value={line.materialId}
                      onValueChange={(value) =>
                        handleMaterialSelect(index, value)
                      }
                      isLoading={isLoading}
                      placeholder={t(
                        'purchase.orders.linesEditor.materialPlaceholder'
                      )}
                      searchPlaceholder={t(
                        'purchase.orders.linesEditor.materialSearchPlaceholder'
                      )}
                      emptyText={t('purchase.orders.linesEditor.materialEmpty')}
                      className='h-10 w-full rounded-xl border-none bg-muted/20 font-bold md:h-9'
                    />
                  </div>
                </div>

                <div className='space-y-1.5 md:col-span-3'>
                  <Label className='ml-1 text-[9px] font-black uppercase opacity-60'>
                    {t('purchase.orders.linesEditor.codeSpec')}
                  </Label>
                  <div className='flex min-h-10 rounded-xl bg-muted/20 px-3 py-2 md:min-h-9'>
                    {hasCodeOrSpec ? (
                      <div className='flex min-w-0 flex-col justify-center gap-0.5'>
                        <p className='truncate font-mono text-[10px] font-black text-foreground/80'>
                          {line.materialCode}
                        </p>
                        {line.specification ? (
                          <p className='truncate text-[9px] font-bold text-muted-foreground/70'>
                            {line.specification}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className='flex items-center text-[10px] font-bold text-muted-foreground/35'>
                        {t('purchase.orders.linesEditor.codeSpecPlaceholder')}
                      </p>
                    )}
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-2.5 md:col-span-2'>
                  <div className='space-y-1.5'>
                    <Label className='ml-1 truncate text-[9px] font-black uppercase opacity-60'>
                      {t('purchase.orders.linesEditor.qty')}
                    </Label>
                    <Input
                      type='number'
                      value={line.qty}
                      onChange={(e) =>
                        onLineChange(index, 'qty', Number(e.target.value))
                      }
                      className='h-10 rounded-xl border-none bg-muted/20 text-right font-black md:h-9'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='ml-1 truncate text-[9px] font-black uppercase opacity-60'>
                      {t('purchase.orders.linesEditor.unit')}
                    </Label>
                    <div className='flex h-10 items-center rounded-xl bg-muted/20 px-3 md:h-9'>
                      <span className='rounded-full bg-background px-2.5 py-1 text-[8px] font-black tracking-[0.18em] text-muted-foreground/70 uppercase'>
                        {line.uom || '--'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='flex items-end gap-2.5 md:col-span-3'>
                  <div className='flex-1 space-y-1.5'>
                    <Label className='ml-1 truncate text-[9px] font-black uppercase opacity-60'>
                      {t('purchase.orders.linesEditor.price')} ({currency})
                    </Label>
                    <Input
                      type='number'
                      value={line.price}
                      onChange={(e) =>
                        onLineChange(index, 'price', Number(e.target.value))
                      }
                      className='h-10 rounded-xl border-none bg-muted/20 text-right font-black md:h-9'
                    />
                  </div>
                  <div className='w-20 pb-2 text-right md:w-auto'>
                    <p className='mb-1 text-[8px] font-black uppercase opacity-40'>
                      {t('purchase.orders.linesEditor.subtotal')}
                    </p>
                    <p className='truncate text-[12px] font-black text-primary tabular-nums md:text-[13px]'>
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
          )
        })}
      </div>
    </section>
  )
}
