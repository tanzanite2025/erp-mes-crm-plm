import {
  ImageIcon,
  Layers,
  Package,
  Plus,
  Scissors,
  Settings2,
  Trash2,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type Unit } from '@/features/basic-settings/services/unit-service'
import { type ProductDisplayProjectionV2 } from '@/features/engineering/display/product-display-v2'
import { type ProductAppearance } from '@/features/engineering/data/product-appearance'
import { type Product } from '@/features/engineering/data/schema'
import { type SalesOrderLine } from '@/features/trading/data/schema'
import { useSalesOrderLinesEditorViewModel } from '@/features/trading/hooks/use-sales-order-lines-editor-view-model'

type SalesOrderLineFieldValue = SalesOrderLine[keyof SalesOrderLine]

interface LineDetailPreviewProps {
  line: SalesOrderLine
  title: string
  appearanceLabel: string
  appearanceCodeLabel: string
  holeCountLabel: string
  quantityLabel: string
  appearanceEmptyLabel: string
  inline?: boolean
}

function LineDetailPreview({
  line,
  title,
  appearanceLabel,
  appearanceCodeLabel,
  holeCountLabel,
  quantityLabel,
  appearanceEmptyLabel,
  inline = false,
}: LineDetailPreviewProps) {
  if (inline) {
    return (
      <div className='flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-dashed bg-background/70 px-2 py-1 text-[9px] whitespace-nowrap'>
        <span className='shrink-0 font-black tracking-widest text-muted-foreground/50 uppercase'>
          {title}
        </span>
        <span className='min-w-0 truncate font-bold'>
          {line.appearanceNameSnapshot || appearanceEmptyLabel}
        </span>
        <span className='shrink-0 font-mono font-bold text-muted-foreground/70'>
          {line.appearanceBarcodeCodeSnapshot || '--'}
        </span>
        <span className='shrink-0 font-mono font-bold text-muted-foreground/70'>
          {holeCountLabel}: {line.holeCount?.toString() || '--'}
        </span>
        <span className='shrink-0 font-mono font-bold text-muted-foreground/70'>
          {quantityLabel}: {line.qty.toLocaleString()}
        </span>
      </div>
    )
  }

  return (
    <div className='rounded-xl border border-dashed bg-background/70 px-3 py-2'>
      <div className='mb-2 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
        {title}
      </div>
      <div className='grid gap-1'>
        <div className='flex items-center justify-between gap-3 text-[10px]'>
          <span className='font-black text-muted-foreground/60'>
            {appearanceLabel}
          </span>
          <span className='truncate text-right font-bold'>
            {line.appearanceNameSnapshot || appearanceEmptyLabel}
          </span>
        </div>
        <div className='flex items-center justify-between gap-3 text-[10px]'>
          <span className='font-black text-muted-foreground/60'>
            {appearanceCodeLabel}
          </span>
          <span className='font-mono font-bold'>
            {line.appearanceBarcodeCodeSnapshot || '--'}
          </span>
        </div>
        <div className='flex items-center justify-between gap-3 text-[10px]'>
          <span className='font-black text-muted-foreground/60'>
            {holeCountLabel}
          </span>
          <span className='font-mono font-bold'>
            {line.holeCount?.toString() || '--'}
          </span>
        </div>
        <div className='flex items-center justify-between gap-3 text-[10px]'>
          <span className='font-black text-muted-foreground/60'>
            {quantityLabel}
          </span>
          <span className='font-mono font-bold'>
            {line.qty.toLocaleString()} {line.uom}
          </span>
        </div>
      </div>
    </div>
  )
}

interface DocumentLinesEditorProps {
  appearances: ProductAppearance[]
  lines: SalesOrderLine[]
  products: Product[]
  productDisplayLabelMap: Map<string, string>
  productDisplayProjectionMap: Map<string, ProductDisplayProjectionV2>
  units: Unit[]
  drillingOptions: { label: string; value: string }[]
  labelingOptions: { label: string; value: string }[]
  currency?: string
  onAddLine: () => void
  onRemoveLine: (index: number) => void
  onLineChange: (
    index: number,
    field: keyof SalesOrderLine,
    value: SalesOrderLineFieldValue,
    extraData?: Partial<SalesOrderLine>
  ) => void
  readOnly?: boolean
}

export function DocumentLinesEditor({
  appearances,
  lines,
  products,
  productDisplayLabelMap,
  productDisplayProjectionMap,
  units,
  drillingOptions,
  labelingOptions,
  currency = 'CNY',
  onAddLine,
  onRemoveLine,
  onLineChange,
  readOnly = false,
}: DocumentLinesEditorProps) {
  const { t } = useLanguage()
  const detailPreviewLabel = t('tradingSalesOrder.linesEditor.detailPreview')
  const appearanceLabel = t('tradingSalesOrder.linesEditor.appearance')
  const appearanceCodeLabel = t('tradingSalesOrder.linesEditor.appearanceCode')
  const holeCountLabel = t('tradingSalesOrder.linesEditor.holeCount')
  const quantityLabel = t('tradingSalesOrder.linesEditor.quantity')
  const appearanceEmptyLabel = t(
    'tradingSalesOrder.linesEditor.appearancePreviewEmpty'
  )
  const {
    appearanceOptions,
    currencySymbol,
    productById,
    productOptions,
    activeUnitOptions,
    getHoleCountOptions,
    handleAppearanceChange,
    handleProductChange,
  } = useSalesOrderLinesEditorViewModel({
    appearances,
    products,
    productDisplayLabelMap,
    productDisplayProjectionMap,
    units,
    currency,
    onLineChange,
  })

  return (
    <fieldset
      disabled={readOnly}
      className='space-y-3 disabled:cursor-not-allowed'
    >
      <div className='flex items-center justify-between px-1'>
        <div className='flex items-center gap-2'>
          <Package className='size-4 text-primary' />
          <h4 className='text-[11px] font-black tracking-[0.2em] text-foreground uppercase italic'>
            {t('tradingSalesOrder.linesEditor.sectionTitle')}
          </h4>
        </div>
        <Button
          onClick={onAddLine}
          variant='outline'
          size='sm'
          className='h-8 rounded-full border-2 border-dashed px-4 text-[10px] font-black uppercase transition-all hover:bg-primary/5'
        >
          <Plus className='mr-1 size-3' />
          {t('tradingSalesOrder.linesEditor.addLine')}
        </Button>
      </div>

      <div className='hidden overflow-x-auto rounded-[24px] border bg-background/50 shadow-sm md:block'>
        <table className='w-full min-w-[1200px] border-collapse'>
          <thead className='border-b bg-muted/30'>
            <tr className='h-10 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase'>
              <th className='w-[60px] text-center'>
                {t('tradingSalesOrder.linesEditor.headers.no')}
              </th>
              <th className='w-[60px] text-center'>
                {t('tradingSalesOrder.linesEditor.headers.thumb')}
              </th>
              <th className='px-4 text-left'>
                {t('tradingSalesOrder.linesEditor.headers.skuModel')}
              </th>
              <th className='w-[220px] px-2 text-left'>
                {t('tradingSalesOrder.linesEditor.headers.appearance')}
              </th>
              <th className='w-[120px] text-center'>
                {t('tradingSalesOrder.linesEditor.headers.drilling')}
              </th>
              <th className='w-[120px] text-center'>
                {t('tradingSalesOrder.linesEditor.headers.labeling')}
              </th>
              <th className='w-[80px] text-center'>
                {t('tradingSalesOrder.linesEditor.headers.holes')}
              </th>
              <th className='w-[100px] text-center'>
                {t('tradingSalesOrder.linesEditor.headers.qty')}
              </th>
              <th className='w-[110px] text-center'>
                {t('tradingSalesOrder.linesEditor.headers.price')}
              </th>
              <th className='w-[120px] text-center'>
                {t('tradingSalesOrder.linesEditor.headers.total')}
              </th>
              <th className='w-[100px] text-center'>
                {t('tradingSalesOrder.linesEditor.headers.unit')}
              </th>
              <th className='w-[60px]' />
            </tr>
          </thead>
          <tbody>
            {lines?.map((line, index) => (
              <tr
                key={index}
                className='group border-b transition-colors hover:bg-muted/5'
              >
                <td className='text-center font-mono text-[10px] text-muted-foreground/40'>
                  {line.lineNo}
                </td>
                <td className='py-2'>
                  <div className='mx-auto flex size-10 items-center justify-center overflow-hidden rounded-lg border bg-muted/20'>
                    {productById.get(line.productId || '')?.image ? (
                      <img
                        src={productById.get(line.productId || '')?.image}
                        className='size-full object-cover'
                      />
                    ) : (
                      <ImageIcon className='size-4 text-muted-foreground/10' />
                    )}
                  </div>
                </td>
                <td className='px-4'>
                  <select
                    className='h-9 w-full appearance-none truncate rounded-lg border bg-background/50 px-2 text-[12px] font-bold outline-none focus:ring-1 focus:ring-primary'
                    value={line.productId || ''}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                  >
                    <option value=''>
                      {t('tradingSalesOrder.linesEditor.selectDesktop')}
                    </option>
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className='px-2'>
                  <div className='space-y-2 py-2'>
                    <select
                      className='h-8 w-full appearance-none rounded-lg border bg-background px-2 text-[10px] font-bold outline-none focus:ring-1 focus:ring-primary'
                      value={line.appearanceId || ''}
                      onChange={(e) =>
                        handleAppearanceChange(index, e.target.value)
                      }
                    >
                      <option value=''>
                        {t(
                          'tradingSalesOrder.linesEditor.selectAppearanceDesktop'
                        )}
                      </option>
                      {appearanceOptions.map((appearance) => (
                        <option key={appearance.id} value={appearance.id}>
                          {appearance.label}
                        </option>
                      ))}
                    </select>
                    <div className='flex items-center gap-2 rounded-lg border border-dashed bg-muted/10 px-2 py-1.5'>
                      <div className='flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background'>
                        {line.appearanceImageUrlSnapshot ? (
                          <img
                            src={line.appearanceImageUrlSnapshot}
                            alt={line.appearanceNameSnapshot || 'appearance'}
                            className='size-full object-cover'
                          />
                        ) : (
                          <ImageIcon className='size-4 text-muted-foreground/20' />
                        )}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='truncate text-[10px] font-black'>
                          {line.appearanceNameSnapshot ||
                            t('tradingSalesOrder.linesEditor.appearance')}
                        </div>
                        <div className='truncate text-[9px] text-muted-foreground'>
                          {line.appearanceBarcodeCodeSnapshot
                            ? `${t('tradingSalesOrder.linesEditor.appearanceCode')}: ${line.appearanceBarcodeCodeSnapshot}`
                            : t(
                                'tradingSalesOrder.linesEditor.appearancePreviewEmpty'
                              )}
                        </div>
                      </div>
                    </div>
                    <LineDetailPreview
                      line={line}
                      title={detailPreviewLabel}
                      appearanceLabel={appearanceLabel}
                      appearanceCodeLabel={appearanceCodeLabel}
                      holeCountLabel={holeCountLabel}
                      quantityLabel={quantityLabel}
                      appearanceEmptyLabel={appearanceEmptyLabel}
                      inline
                    />
                  </div>
                </td>
                <td className='px-2'>
                  <select
                    className='h-8 w-full appearance-none rounded-lg border bg-orange-500/5 px-2 text-center text-[10px] font-bold outline-none focus:ring-1 focus:ring-orange-500'
                    value={line.drillingPlanId || ''}
                    onChange={(e) =>
                      onLineChange(index, 'drillingPlanId', e.target.value)
                    }
                  >
                    <option value=''>
                      {t('tradingSalesOrder.linesEditor.drillingDefault')}
                    </option>
                    {drillingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className='px-2'>
                  <select
                    className='h-8 w-full appearance-none rounded-lg border bg-blue-500/5 px-2 text-center text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500'
                    value={line.labelingPlanId || ''}
                    onChange={(e) =>
                      onLineChange(index, 'labelingPlanId', e.target.value)
                    }
                  >
                    <option value=''>
                      {t('tradingSalesOrder.linesEditor.labelingDefault')}
                    </option>
                    {labelingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className='px-2'>
                  <select
                    className='h-8 w-full appearance-none rounded-lg border bg-background px-2 text-center text-[11px] font-bold outline-none focus:ring-1 focus:ring-primary'
                    value={line.holeCount?.toString() || ''}
                    onChange={(e) =>
                      onLineChange(
                        index,
                        'holeCount',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  >
                    <option value=''>
                      {t('tradingSalesOrder.linesEditor.holeCountDefault')}
                    </option>
                    {getHoleCountOptions(line.holeCount).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className='px-2'>
                  <Input
                    type='number'
                    value={line.qty}
                    onChange={(e) =>
                      onLineChange(index, 'qty', Number(e.target.value) || 0)
                    }
                    className='h-9 border-primary/20 text-center text-[12px] font-black'
                  />
                </td>
                <td className='px-2'>
                  <Input
                    type='number'
                    value={line.price}
                    onChange={(e) =>
                      onLineChange(index, 'price', Number(e.target.value) || 0)
                    }
                    className='h-9 border-amber-500/20 text-center text-[12px] font-black'
                  />
                </td>
                <td className='text-center text-xs font-black text-primary tabular-nums'>
                  {currencySymbol}
                  {Number(line.amount).toLocaleString()}
                </td>
                <td className='px-2'>
                  <select
                    className='h-8 w-full rounded-lg border bg-background px-2 text-center text-[10px] font-bold'
                    value={line.uom}
                    onChange={(e) => onLineChange(index, 'uom', e.target.value)}
                  >
                    {activeUnitOptions.map((unit) => (
                      <option key={unit.id} value={unit.code}>
                        {unit.code}
                      </option>
                    ))}
                  </select>
                </td>
                <td className='text-center'>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => onRemoveLine(index)}
                    className='size-8 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:text-destructive'
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className='space-y-4 md:hidden'>
        {lines?.map((line, index) => (
          <div
            key={index}
            className='relative animate-in rounded-[24px] border-2 border-dashed bg-muted/5 p-4 fade-in slide-in-from-bottom-2'
          >
            <div className='mb-4 flex items-start gap-4'>
              <div className='flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background'>
                {productById.get(line.productId || '')?.image ? (
                  <img
                    src={productById.get(line.productId || '')?.image}
                    className='size-full object-cover'
                  />
                ) : (
                  <ImageIcon className='size-6 text-muted-foreground/10' />
                )}
              </div>
              <div className='min-w-0 flex-1 space-y-1.5'>
                <span className='text-[8px] leading-none font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                  {t('tradingSalesOrder.linesEditor.lineItem')} #{line.lineNo}
                </span>
                <select
                  className='h-11 w-full appearance-none truncate rounded-xl border-none bg-background px-3 text-[13px] font-bold shadow-sm'
                  value={line.productId || ''}
                  onChange={(e) => handleProductChange(index, e.target.value)}
                >
                  <option value=''>
                    {t('tradingSalesOrder.linesEditor.selectProduct')}
                  </option>
                  {productOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => onRemoveLine(index)}
                className='absolute -top-2 -right-2 size-8 rounded-full border bg-background text-destructive/40 shadow-sm hover:text-destructive'
              >
                <Trash2 className='size-4' />
              </Button>
            </div>

            <div className='mb-4 rounded-[20px] border border-dashed bg-background/70 p-3'>
              <div className='mb-2 flex items-center justify-between gap-2'>
                <span className='text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                  {t('tradingSalesOrder.linesEditor.appearance')}
                </span>
                <span className='text-[8px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                  {line.appearanceBarcodeCodeSnapshot || '--'}
                </span>
              </div>
              <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_84px]'>
                <select
                  className='h-10 w-full appearance-none rounded-xl border bg-background px-3 text-[11px] font-bold'
                  value={line.appearanceId || ''}
                  onChange={(e) =>
                    handleAppearanceChange(index, e.target.value)
                  }
                >
                  <option value=''>
                    {t('tradingSalesOrder.linesEditor.selectAppearance')}
                  </option>
                  {appearanceOptions.map((appearance) => (
                    <option key={appearance.id} value={appearance.id}>
                      {appearance.label}
                    </option>
                  ))}
                </select>
                <div className='flex h-[84px] items-center justify-center overflow-hidden rounded-2xl border bg-muted/10'>
                  {line.appearanceImageUrlSnapshot ? (
                    <img
                      src={line.appearanceImageUrlSnapshot}
                      alt={line.appearanceNameSnapshot || 'appearance'}
                      className='size-full object-cover'
                    />
                  ) : (
                    <ImageIcon className='size-5 text-muted-foreground/20' />
                  )}
                </div>
              </div>
              <div className='mt-2 space-y-1'>
                <div className='text-[11px] font-black'>
                  {line.appearanceNameSnapshot ||
                    t('tradingSalesOrder.linesEditor.appearancePreviewEmpty')}
                </div>
                <div className='text-[10px] leading-4 text-muted-foreground'>
                  {line.appearanceDescriptionSnapshot ||
                    t(
                      'tradingSalesOrder.linesEditor.appearanceDescriptionEmpty'
                    )}
                </div>
              </div>
              <div className='mt-3'>
                <LineDetailPreview
                  line={line}
                  title={detailPreviewLabel}
                  appearanceLabel={appearanceLabel}
                  appearanceCodeLabel={appearanceCodeLabel}
                  holeCountLabel={holeCountLabel}
                  quantityLabel={quantityLabel}
                  appearanceEmptyLabel={appearanceEmptyLabel}
                />
              </div>
            </div>

            <div className='mb-4 grid grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 pl-1'>
                  <Scissors className='size-2.5 text-orange-500' />
                  <span className='text-[7px] font-black tracking-tighter text-muted-foreground uppercase italic'>
                    {t('tradingSalesOrder.linesEditor.drillingPlan')}
                  </span>
                </div>
                <select
                  className='h-10 w-full appearance-none rounded-xl border border-orange-200/50 bg-orange-50/50 px-3 text-[11px] font-bold'
                  value={line.drillingPlanId || ''}
                  onChange={(e) =>
                    onLineChange(index, 'drillingPlanId', e.target.value)
                  }
                >
                  <option value=''>
                    {t('tradingSalesOrder.linesEditor.defaultPlan')}
                  </option>
                  {drillingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 pl-1'>
                  <Layers className='size-2.5 text-blue-500' />
                  <span className='text-[7px] font-black tracking-tighter text-muted-foreground uppercase italic'>
                    {t('tradingSalesOrder.linesEditor.labelingPlan')}
                  </span>
                </div>
                <select
                  className='h-10 w-full appearance-none rounded-xl border border-blue-200/50 bg-blue-50/50 px-3 text-[11px] font-bold'
                  value={line.labelingPlanId || ''}
                  onChange={(e) =>
                    onLineChange(index, 'labelingPlanId', e.target.value)
                  }
                >
                  <option value=''>
                    {t('tradingSalesOrder.linesEditor.defaultLabeling')}
                  </option>
                  {labelingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 pl-1'>
                  <Settings2 className='size-2.5 text-slate-500' />
                  <span className='text-[7px] font-black tracking-tighter text-muted-foreground uppercase italic'>
                    {t('tradingSalesOrder.linesEditor.holeCount')}
                  </span>
                </div>
                <select
                  className='h-10 w-full appearance-none rounded-xl border bg-background px-3 text-center text-[12px] font-bold'
                  value={line.holeCount?.toString() || ''}
                  onChange={(e) =>
                    onLineChange(
                      index,
                      'holeCount',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                >
                  <option value=''>
                    {t('tradingSalesOrder.linesEditor.holeCountDefault')}
                  </option>
                  {getHoleCountOptions(line.holeCount).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 pl-1'>
                  <Package className='size-2.5 text-slate-500' />
                  <span className='text-[7px] font-black tracking-tighter text-muted-foreground uppercase italic'>
                    {t('tradingSalesOrder.linesEditor.unit')}
                  </span>
                </div>
                <select
                  className='h-10 w-full appearance-none rounded-xl border bg-background px-3 text-[11px] font-bold'
                  value={line.uom}
                  onChange={(e) => onLineChange(index, 'uom', e.target.value)}
                >
                  {activeUnitOptions.map((unit) => (
                    <option key={unit.id} value={unit.code}>
                      {unit.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='grid grid-cols-2 items-end gap-3 border-t border-dashed border-muted-foreground/10 pt-3'>
              <div className='grid grid-cols-2 gap-2'>
                <div className='space-y-1'>
                  <span className='pl-1 text-[7px] font-black text-muted-foreground/40'>
                    {t('tradingSalesOrder.linesEditor.quantity')}
                  </span>
                  <Input
                    type='number'
                    value={line.qty}
                    onChange={(e) =>
                      onLineChange(index, 'qty', Number(e.target.value) || 0)
                    }
                    className='h-11 rounded-xl border-primary/30 bg-primary/5 text-center text-[13px] font-black shadow-sm focus:ring-primary'
                  />
                </div>
                <div className='space-y-1'>
                  <span className='pl-1 text-[7px] font-black text-muted-foreground/40'>
                    {t('tradingSalesOrder.linesEditor.price')}
                  </span>
                  <Input
                    type='number'
                    value={line.price}
                    onChange={(e) =>
                      onLineChange(index, 'price', Number(e.target.value) || 0)
                    }
                    className='h-11 rounded-xl border-amber-500/30 bg-amber-50/5 text-center text-[13px] font-black'
                  />
                </div>
              </div>
              <div className='flex flex-col items-end pb-1.5'>
                <span className='mb-1 text-[7px] leading-none font-black tracking-widest text-primary/40 uppercase italic'>
                  {t('tradingSalesOrder.linesEditor.rowTotal')}
                </span>
                <div className='text-lg font-black tracking-tighter text-primary italic'>
                  <span className='mr-0.5 text-[10px]'>{currencySymbol}</span>
                  {Number(line.amount).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}

        {(!lines || lines.length === 0) && (
          <div className='flex flex-col items-center gap-4 rounded-[32px] border-2 border-dashed bg-muted/5 py-20 text-center'>
            <Package className='size-8 text-muted-foreground/10' />
            <span className='text-[10px] font-black tracking-[0.3em] text-muted-foreground/30 uppercase italic'>
              {t('tradingSalesOrder.linesEditor.noLines')}
            </span>
            <Button
              onClick={onAddLine}
              className='h-8 rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
            >
              {t('tradingSalesOrder.linesEditor.addFirst')}
            </Button>
          </div>
        )}
      </div>
    </fieldset>
  )
}
